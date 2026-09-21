import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { normalizeEmail } from "@/lib/email";
import { addClubMembershipCountDelta } from "@/lib/club-hub/clubMembershipCounts";

export const CLUB_HUB_MEMBERSHIPS = "clubHubMemberships";

/** @param {string} clubSlug @param {string} userId */
export function clubMembershipDocId(clubSlug, userId) {
  return `${clubSlug}__${userId}`;
}

/** @param {unknown} raw @param {string} [id] */
export function normalizeClubMembership(raw, id = "") {
  if (!raw || typeof raw !== "object") return null;
  const clubSlug = typeof raw.clubSlug === "string" ? raw.clubSlug.trim() : "";
  const userId = typeof raw.userId === "string" ? raw.userId.trim() : "";
  if (!clubSlug || !userId) return null;

  return {
    id: id || String(raw.id || ""),
    clubSlug,
    clubName: typeof raw.clubName === "string" ? raw.clubName.trim().slice(0, 120) : "",
    userId,
    userEmail: normalizeEmail(raw.userEmail) || "",
    displayName:
      typeof raw.displayName === "string" ? raw.displayName.trim().slice(0, 100) : "",
    joinedAt: raw.joinedAt || null,
  };
}

/** @param {string} clubSlug @param {string} userId */
export async function fetchUserClubMembership(clubSlug, userId) {
  if (!firestore || !clubSlug || !userId) return null;
  const snap = await getDoc(
    doc(firestore, CLUB_HUB_MEMBERSHIPS, clubMembershipDocId(clubSlug, userId)),
  );
  if (!snap.exists()) return null;
  return normalizeClubMembership({ ...snap.data(), id: snap.id });
}

/**
 * @param {{
 *   clubSlug: string,
 *   clubName: string,
 *   userId: string,
 *   userEmail: string,
 *   displayName: string,
 * }} args
 */
export async function joinClub(args) {
  if (!firestore) throw new Error("Firebase is not configured.");
  const clubSlug = args.clubSlug?.trim();
  const userId = args.userId?.trim();
  if (!clubSlug || !userId) throw new Error("Missing club or user.");

  assertClientRateLimit("clubHubMembershipWrite", userId);

  const membershipId = clubMembershipDocId(clubSlug, userId);
  const ref = doc(firestore, CLUB_HUB_MEMBERSHIPS, membershipId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return normalizeClubMembership({ ...existing.data(), id: existing.id });
  }

  const payload = {
    clubSlug,
    clubName: args.clubName?.trim().slice(0, 120) || clubSlug,
    userId,
    userEmail: normalizeEmail(args.userEmail) || "",
    displayName: args.displayName?.trim().slice(0, 100) || "Member",
    joinedAt: serverTimestamp(),
  };

  const batch = writeBatch(firestore);
  batch.set(ref, payload);
  addClubMembershipCountDelta(batch, clubSlug, payload.clubName, 1);
  await batch.commit();
  return normalizeClubMembership({ ...payload, id: membershipId });
}

/** @param {{ clubSlug: string, userId: string }} args */
export async function leaveClub({ clubSlug, userId }) {
  if (!firestore) throw new Error("Firebase is not configured.");
  if (!clubSlug || !userId) throw new Error("Missing club or user.");
  assertClientRateLimit("clubHubMembershipWrite", userId);
  const membershipRef = doc(
    firestore,
    CLUB_HUB_MEMBERSHIPS,
    clubMembershipDocId(clubSlug, userId),
  );
  const existing = await getDoc(membershipRef);
  const clubName = existing.exists() ? existing.data()?.clubName || clubSlug : clubSlug;
  const batch = writeBatch(firestore);
  batch.delete(membershipRef);
  if (existing.exists()) {
    addClubMembershipCountDelta(batch, clubSlug, clubName, -1);
  }
  await batch.commit();
}

/** @param {string} clubSlug */
export async function fetchClubMembershipRoster(clubSlug) {
  if (!firestore || !clubSlug) return [];
  const snap = await getDocs(
    query(
      collection(firestore, CLUB_HUB_MEMBERSHIPS),
      where("clubSlug", "==", clubSlug),
      orderBy("joinedAt", "desc"),
    ),
  );
  return snap.docs
    .map((d) => normalizeClubMembership({ ...d.data(), id: d.id }))
    .filter(Boolean);
}

/** @param {string[]} clubSlugs */
export async function fetchMembershipsForClubs(clubSlugs) {
  if (!firestore || !clubSlugs.length) return [];
  const unique = [...new Set(clubSlugs.filter(Boolean))];
  const batches = [];
  for (let i = 0; i < unique.length; i += 10) {
    batches.push(unique.slice(i, i + 10));
  }
  const results = [];
  for (const batch of batches) {
    const snap = await getDocs(
      query(
        collection(firestore, CLUB_HUB_MEMBERSHIPS),
        where("clubSlug", "in", batch),
      ),
    );
    for (const d of snap.docs) {
      const row = normalizeClubMembership({ ...d.data(), id: d.id });
      if (row) results.push(row);
    }
  }
  return results.sort((a, b) => {
    const club = a.clubSlug.localeCompare(b.clubSlug);
    if (club !== 0) return club;
    return (b.joinedAt?.seconds || 0) - (a.joinedAt?.seconds || 0);
  });
}

/** @deprecated Prefer fetchMembershipCountMap / fetchClubSizeRankings from clubMembershipCounts.js */
export async function fetchAllClubMemberships() {
  if (!firestore) return [];
  const snap = await getDocs(collection(firestore, CLUB_HUB_MEMBERSHIPS));
  return snap.docs
    .map((d) => normalizeClubMembership({ ...d.data(), id: d.id }))
    .filter(Boolean);
}

/** @param {import("firebase/firestore").Timestamp | null | undefined} ts */
export function formatJoinedAt(ts) {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
