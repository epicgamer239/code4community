import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { firestore } from "@/firebase";

export const CLUB_HUB_MEMBERSHIP_COUNTS = "clubHubMembershipCounts";

/** @param {unknown} raw @param {string} [id] */
export function normalizeMembershipCount(raw, id = "") {
  if (!raw || typeof raw !== "object") return null;
  const clubSlug = typeof raw.clubSlug === "string" ? raw.clubSlug.trim() : id;
  if (!clubSlug) return null;
  const memberCount =
    typeof raw.memberCount === "number" && Number.isFinite(raw.memberCount)
      ? Math.max(0, Math.floor(raw.memberCount))
      : 0;
  return {
    clubSlug,
    clubName: typeof raw.clubName === "string" ? raw.clubName.trim().slice(0, 120) : clubSlug,
    memberCount,
    updatedAt: raw.updatedAt || null,
  };
}

/**
 * @param {import("firebase/firestore").WriteBatch} batch
 * @param {string} clubSlug
 * @param {string} clubName
 * @param {number} delta
 */
export function addClubMembershipCountDelta(batch, clubSlug, clubName, delta) {
  if (!firestore || !clubSlug || !delta) return;
  batch.set(
    doc(firestore, CLUB_HUB_MEMBERSHIP_COUNTS, clubSlug),
    {
      clubSlug,
      clubName: clubName?.trim().slice(0, 120) || clubSlug,
      memberCount: increment(delta),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * @param {string} clubSlug
 * @param {string} clubName
 * @param {number} delta
 */
export async function adjustClubMembershipCount(clubSlug, clubName, delta) {
  if (!firestore || !clubSlug || !delta) return;
  const batch = writeBatch(firestore);
  addClubMembershipCountDelta(batch, clubSlug, clubName, delta);
  await batch.commit();
}

export async function fetchAllMembershipCounts() {
  if (!firestore) return [];
  const snap = await getDocs(collection(firestore, CLUB_HUB_MEMBERSHIP_COUNTS));
  return snap.docs
    .map((d) => normalizeMembershipCount({ ...d.data(), clubSlug: d.id }, d.id))
    .filter(Boolean);
}

/** @param {string[]} clubSlugs */
export async function fetchMembershipCountsForClubs(clubSlugs) {
  if (!firestore || !clubSlugs.length) return [];
  const unique = [...new Set(clubSlugs.filter(Boolean))];
  const rows = await Promise.all(
    unique.map(async (slug) => {
      const snap = await getDoc(doc(firestore, CLUB_HUB_MEMBERSHIP_COUNTS, slug));
      if (!snap.exists()) {
        return normalizeMembershipCount({ clubSlug: slug, clubName: slug, memberCount: 0 }, slug);
      }
      return normalizeMembershipCount({ ...snap.data(), clubSlug: slug }, slug);
    }),
  );
  return rows.filter(Boolean);
}

/**
 * Top clubs by stored member count (no full membership scan).
 * @param {number} [top]
 */
export async function fetchClubSizeRankings(top = 3) {
  if (!firestore) return [];
  const snap = await getDocs(
    query(
      collection(firestore, CLUB_HUB_MEMBERSHIP_COUNTS),
      orderBy("memberCount", "desc"),
      limit(top),
    ),
  );
  const rows = snap.docs
    .map((d) => {
      const row = normalizeMembershipCount({ ...d.data(), clubSlug: d.id }, d.id);
      if (!row || row.memberCount <= 0) return null;
      return {
        name: row.clubName,
        clubSlug: row.clubSlug,
        count: row.memberCount,
      };
    })
    .filter(Boolean);

  if (rows.length > 0) {
    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
  }

  // Legacy fallback before count docs exist (does not write counts).
  const { fetchAllClubMemberships } = await import("@/lib/club-hub/clubMemberships");
  const memberships = await fetchAllClubMemberships();
  /** @type {Record<string, { clubName: string, count: number }>} */
  const bySlug = {};
  for (const row of memberships) {
    if (!bySlug[row.clubSlug]) {
      bySlug[row.clubSlug] = { clubName: row.clubName || row.clubSlug, count: 0 };
    }
    bySlug[row.clubSlug].count += 1;
  }
  return Object.entries(bySlug)
    .sort((a, b) => b[1].count - a[1].count || a[1].clubName.localeCompare(b[1].clubName))
    .slice(0, top)
    .map(([clubSlug, { clubName, count }], index) => ({
      rank: index + 1,
      name: clubName,
      clubSlug,
      count,
    }));
}

/** @param {string} clubSlug */
export async function fetchClubMembershipCount(clubSlug) {
  if (!firestore || !clubSlug) return 0;
  const snap = await getDoc(doc(firestore, CLUB_HUB_MEMBERSHIP_COUNTS, clubSlug));
  if (!snap.exists()) return 0;
  return normalizeMembershipCount({ ...snap.data(), clubSlug }, clubSlug)?.memberCount || 0;
}

/**
 * Build slug → count map for roster dashboards.
 * @param {string[]} [clubSlugs] when omitted, loads all count docs (~one per club max)
 */
export async function fetchMembershipCountMap(clubSlugs = null) {
  const rows = clubSlugs?.length
    ? await fetchMembershipCountsForClubs(clubSlugs)
    : await fetchAllMembershipCounts();
  /** @type {Record<string, number>} */
  const map = {};
  for (const row of rows) {
    map[row.clubSlug] = row.memberCount;
  }
  return map;
}
