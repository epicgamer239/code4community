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
import { addClubMembershipCountDelta, fetchClubMembershipCount } from "@/lib/club-hub/clubMembershipCounts";
import { fetchClubPageInfo } from "@/lib/club-hub/clubPages";
import { clubRequiresJoinApproval } from "@/lib/club-hub/joinPolicy";
import {
  CLUB_MEMBERSHIP_FULL_MESSAGE,
  isClubMembershipFull,
} from "@/lib/club-hub/memberSignupLimit";
import { formatSessionDateOnly } from "@/lib/firestoreDates";

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

  /** @type {string[]} */
  const memberGroups = Array.isArray(raw.memberGroups)
    ? raw.memberGroups
        .filter((g) => typeof g === "string" && g.trim())
        .map((g) => g.trim().slice(0, 40))
        .slice(0, 8)
    : [];

  /** @type {("gold" | "maroon")[] | null} */
  let seminarDays = null;
  if (Array.isArray(raw.seminarDays)) {
    /** @type {("gold" | "maroon")[]} */
    const days = [];
    for (const item of raw.seminarDays) {
      if (item === "gold" && !days.includes("gold")) days.push("gold");
      if (item === "maroon" && !days.includes("maroon")) days.push("maroon");
    }
    seminarDays = days;
  }

  return {
    id: id || String(raw.id || ""),
    clubSlug,
    clubName: typeof raw.clubName === "string" ? raw.clubName.trim().slice(0, 120) : "",
    userId,
    userEmail: normalizeEmail(raw.userEmail) || "",
    displayName:
      typeof raw.displayName === "string" ? raw.displayName.trim().slice(0, 100) : "",
    memberGroups,
    seminarDays,
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
 *   seminarDays?: ("gold" | "maroon")[],
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
  if (clubRequiresJoinApproval(pageInfo.joinPolicy)) {
    throw new Error("This club requires approval before you can join. Request to join instead.");
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
    // Board-only fair clubs (Key Club, …) store [] for regular members.
    seminarDays: seminarDays || [],
    joinedAt: serverTimestamp(),
  };

  const batch = writeBatch(firestore);
  batch.set(ref, payload);
  addClubMembershipCountDelta(batch, clubSlug, payload.clubName, 1);
  await batch.commit();

  return normalizeClubMembership({ ...payload, id: membershipId });
}

/**
 * Change which seminar days a dual-day club membership uses.
 * @param {{
 *   clubSlug: string,
 *   userId: string,
 *   seminarDays: ("gold" | "maroon")[],
 * }} args
 */
export async function updateMembershipSeminarDays(args) {
  if (!firestore) throw new Error("Firebase is not configured.");
  const clubSlug = args.clubSlug?.trim();
  const userId = args.userId?.trim();
  if (!clubSlug || !userId) throw new Error("Missing club or user.");

  assertClientRateLimit("clubHubMembershipWrite", userId);

  const { loadMeetingDayOverrides } = await import("@/lib/club-hub/clubMeetingDays");
  const {
    getSeminarMembershipJoinError,
    normalizeSeminarDays,
    validateSeminarDaysForClub,
  } = await import("@/lib/club-hub/seminarMembershipLimit");
  await loadMeetingDayOverrides();

  const seminarDays = normalizeSeminarDays(args.seminarDays);
  if (!seminarDays || seminarDays.length === 0) {
    throw new Error("Pick Gold days only, Maroon days only, or both.");
  }
  const dayError = validateSeminarDaysForClub(clubSlug, seminarDays);
  if (dayError) throw new Error(dayError);

  const membershipId = clubMembershipDocId(clubSlug, userId);
  const ref = doc(firestore, CLUB_HUB_MEMBERSHIPS, membershipId);
  const existing = await getDoc(ref);
  if (!existing.exists()) throw new Error("You are not a member of this club.");

  const others = (await fetchMembershipsForUser(userId)).filter((m) => m.clubSlug !== clubSlug);
  const seminarError = getSeminarMembershipJoinError(others, clubSlug, {
    memberGroups: existing.data()?.memberGroups,
    seminarDays,
  });
  if (seminarError) throw new Error(seminarError);

  await setDoc(
    ref,
    {
      seminarDays,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return normalizeClubMembership({ ...existing.data(), seminarDays, id: membershipId });
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

/** @param {string} userId */
export async function fetchMembershipsForUser(userId) {
  if (!firestore || !userId) return [];
  const snap = await getDocs(
    query(collection(firestore, CLUB_HUB_MEMBERSHIPS), where("userId", "==", userId)),
  );
  return snap.docs
    .map((d) => normalizeClubMembership({ ...d.data(), id: d.id }))
    .filter(Boolean)
    .sort((a, b) => (a.clubName || a.clubSlug).localeCompare(b.clubName || b.clubSlug));
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
  return formatSessionDateOnly(ts, "—");
}
