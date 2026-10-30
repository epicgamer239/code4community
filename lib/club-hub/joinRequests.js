import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { normalizeEmail } from "@/lib/email";
import { fetchClubMembershipCount } from "@/lib/club-hub/clubMembershipCounts";
import { fetchMembershipsForUser, fetchUserClubMembership } from "@/lib/club-hub/clubMemberships";
import { fetchClubPageInfo } from "@/lib/club-hub/clubPages";
import { clubRequiresJoinApproval } from "@/lib/club-hub/joinPolicy";
import {
  CLUB_MEMBERSHIP_FULL_MESSAGE,
  isClubMembershipFull,
} from "@/lib/club-hub/memberSignupLimit";

export const CLUB_HUB_JOIN_REQUESTS = "clubHubJoinRequests";

/** @param {string} clubSlug @param {string} userId */
export function joinRequestDocId(clubSlug, userId) {
  return `${clubSlug}__${userId}`;
}

/** @param {unknown} raw @param {string} [id] */
export function normalizeJoinRequest(raw, id = "") {
  if (!raw || typeof raw !== "object") return null;
  const clubSlug = typeof raw.clubSlug === "string" ? raw.clubSlug.trim() : "";
  const userId = typeof raw.userId === "string" ? raw.userId.trim() : "";
  if (!clubSlug || !userId) return null;
  const status = raw.status === "pending" ? "pending" : "";
  if (!status) return null;
  return {
    id: id || String(raw.id || joinRequestDocId(clubSlug, userId)),
    clubSlug,
    clubName: typeof raw.clubName === "string" ? raw.clubName.trim().slice(0, 120) : clubSlug,
    userId,
    userEmail: normalizeEmail(raw.userEmail) || "",
    displayName:
      typeof raw.displayName === "string" ? raw.displayName.trim().slice(0, 100) : "",
    status,
    requestedAt: raw.requestedAt || null,
  };
}

/** @param {string} clubSlug @param {string} userId */
export async function fetchUserJoinRequest(clubSlug, userId) {
  if (!firestore || !clubSlug || !userId) return null;
  const snap = await getDoc(
    doc(firestore, CLUB_HUB_JOIN_REQUESTS, joinRequestDocId(clubSlug, userId)),
  );
  if (!snap.exists()) return null;
  return normalizeJoinRequest({ ...snap.data(), id: snap.id });
}

/**
 * @param {{
 *   clubSlug: string,
 *   clubName: string,
 *   userId: string,
 *   userEmail: string,
 *   displayName: string,
 *   seminarDays?: ("gold" | "maroon")[],
 * }} args
 */
export async function requestToJoinClub(args) {
  if (!firestore) throw new Error("Firebase is not configured.");
  const clubSlug = args.clubSlug?.trim();
  const userId = args.userId?.trim();
  if (!clubSlug || !userId) throw new Error("Missing club or user.");

  assertClientRateLimit("clubHubMembershipWrite", userId);

  const existingMember = await fetchUserClubMembership(clubSlug, userId);
  if (existingMember) throw new Error("You are already a member of this club.");

  const requestId = joinRequestDocId(clubSlug, userId);
  const ref = doc(firestore, CLUB_HUB_JOIN_REQUESTS, requestId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const row = normalizeJoinRequest({ ...existing.data(), id: existing.id });
    if (row) return row;
  }

  const { loadMeetingDayOverrides } = await import("@/lib/club-hub/clubMeetingDays");
  const {
    defaultSeminarDaysForClub,
    getSeminarMembershipJoinError,
    normalizeSeminarDays,
  } = await import("@/lib/club-hub/seminarMembershipLimit");
  const [pageInfo, memberCount, existingMemberships] = await Promise.all([
    fetchClubPageInfo(clubSlug),
    fetchClubMembershipCount(clubSlug),
    fetchMembershipsForUser(userId),
    loadMeetingDayOverrides(),
  ]);
  if (!clubRequiresJoinApproval(pageInfo.joinPolicy)) {
    throw new Error("This club is open join. Use Join club instead.");
  }
  if (isClubMembershipFull(memberCount, pageInfo.memberSignupLimit)) {
    throw new Error(CLUB_MEMBERSHIP_FULL_MESSAGE);
  }
  const seminarDays =
    normalizeSeminarDays(args.seminarDays) ?? defaultSeminarDaysForClub(clubSlug);
  const seminarError = getSeminarMembershipJoinError(existingMemberships, clubSlug, {
    seminarDays,
  });
  if (seminarError) throw new Error(seminarError);

  const payload = {
    clubSlug,
    clubName: args.clubName?.trim().slice(0, 120) || clubSlug,
    userId,
    userEmail: normalizeEmail(args.userEmail) || "",
    displayName: args.displayName?.trim().slice(0, 100) || "Member",
    seminarDays,
    status: "pending",
    requestedAt: serverTimestamp(),
  };
  await setDoc(ref, payload);
  return normalizeJoinRequest({ ...payload, id: requestId });
}

/** @param {{ clubSlug: string, userId: string }} args */
export async function cancelJoinRequest({ clubSlug, userId }) {
  if (!firestore) throw new Error("Firebase is not configured.");
  if (!clubSlug || !userId) throw new Error("Missing club or user.");
  assertClientRateLimit("clubHubMembershipWrite", userId);
  await deleteDoc(doc(firestore, CLUB_HUB_JOIN_REQUESTS, joinRequestDocId(clubSlug, userId)));
}

/**
 * Pending requests for sponsors and board members. Read through the server so
 * the browser does not need a Firestore list rule.
 *
 * @param {{ getIdToken?: () => Promise<string> } | null | undefined} user
 * @param {string} clubSlug
 */
export async function fetchPendingJoinRequestsForClub(user, clubSlug) {
  if (!user?.getIdToken || !clubSlug) return [];
  const token = await user.getIdToken();
  const res = await fetch(
    `/api/club-hub/sponsor/join-requests?clubSlug=${encodeURIComponent(clubSlug)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load join requests.");
  return Array.isArray(data.requests)
    ? data.requests.map((row) => normalizeJoinRequest(row, row.id)).filter(Boolean)
    : [];
}

/**
 * @param {import("firebase/auth").User} user
 * @param {{ clubSlug: string, userId: string, action: "approve" | "deny" }} args
 */
export async function reviewJoinRequestClient(user, args) {
  if (!user?.getIdToken) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  const res = await fetch("/api/club-hub/sponsor/join-requests", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not update the join request.");
  return data;
}
