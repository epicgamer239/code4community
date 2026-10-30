import {
  CLUB_HUB_MEMBERSHIPS,
  normalizeClubMembership,
} from "@/lib/club-hub/clubMemberships";
import { applyMeetingDayOverridesFromAdminDb } from "@/lib/club-hub/clubMeetingDaysServer";
import { meetingChoicesFromMemberships } from "@/lib/club-hub/seminarMembershipLimit";

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} userId
 */
export async function loadMembershipsForUserAdmin(db, userId) {
  const uid = userId?.trim() || "";
  if (!db || !uid) return [];
  const snap = await db.collection(CLUB_HUB_MEMBERSHIPS).where("userId", "==", uid).get();
  return snap.docs
    .map((d) => normalizeClubMembership({ ...d.data(), id: d.id }, d.id))
    .filter(Boolean);
}

/**
 * Gold/Maroon seminar slots derived from memberships (no Firestore choices doc).
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} userId
 * @param {import("@/lib/club-hub/clubMemberships").NormalizedClubMembership[]} [memberships]
 */
export async function deriveMeetingChoicesForUserAdmin(db, userId, memberships) {
  const uid = userId?.trim() || "";
  if (!db || !uid) {
    return { goldClubSlug: "", maroonClubSlug: "" };
  }
  await applyMeetingDayOverridesFromAdminDb(db);
  const rows = memberships ?? (await loadMembershipsForUserAdmin(db, uid));
  return meetingChoicesFromMemberships(rows);
}

/**
 * All students with a Gold and/or Maroon seminar club from memberships.
 * @param {import("firebase-admin/firestore").Firestore} db
 * @returns {Promise<Map<string, { goldClubSlug: string, maroonClubSlug: string }>>}
 */
export async function deriveAllSeminarChoicesByUserAdmin(db) {
  await applyMeetingDayOverridesFromAdminDb(db);
  const snap = await db.collection(CLUB_HUB_MEMBERSHIPS).get();
  /** @type {Map<string, import("@/lib/club-hub/clubMemberships").NormalizedClubMembership[]>} */
  const byUser = new Map();
  for (const doc of snap.docs) {
    const membership = normalizeClubMembership({ ...doc.data(), id: doc.id }, doc.id);
    if (!membership) continue;
    const list = byUser.get(membership.userId) || [];
    list.push(membership);
    byUser.set(membership.userId, list);
  }
  /** @type {Map<string, { goldClubSlug: string, maroonClubSlug: string }>} */
  const out = new Map();
  for (const [userId, memberships] of byUser) {
    const derived = meetingChoicesFromMemberships(memberships);
    if (!derived.goldClubSlug && !derived.maroonClubSlug) continue;
    out.set(userId, derived);
  }
  return out;
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} clubSlug
 * @returns {Promise<string[]>}
 */
export async function listMemberUserIdsForClubAdmin(db, clubSlug) {
  const slug = clubSlug?.trim() || "";
  if (!db || !slug) return [];
  const snap = await db.collection(CLUB_HUB_MEMBERSHIPS).where("clubSlug", "==", slug).get();
  /** @type {Set<string>} */
  const ids = new Set();
  for (const doc of snap.docs) {
    const uid = doc.data()?.userId?.trim?.() || "";
    if (uid) ids.add(uid);
  }
  return [...ids];
}
