import { FieldValue } from "firebase-admin/firestore";
import {
  getDefaultMeetingDayForSlug,
  normalizeClubMeetingDay,
  setMeetingDayOverrides,
} from "@/lib/club-hub/clubDirectorySections";
import {
  deriveMeetingChoicesForUserAdmin,
  listMemberUserIdsForClubAdmin,
  loadMembershipsForUserAdmin,
} from "@/lib/club-hub/meetingChoicesFromMembershipsAdmin";
import { meetingChoicesFromMemberships } from "@/lib/club-hub/seminarMembershipLimit";

const CLUB_HUB_MEETING_DAYS_COLLECTION = "clubHubMeetingDays";

/**
 * Load admin meeting-day overrides (Admin SDK) before validating Gold/Maroon picks.
 * @param {import("firebase-admin/firestore").Firestore} db
 */
export async function applyMeetingDayOverridesFromAdminDb(db) {
  if (!db) return;
  const snap = await db.collection(CLUB_HUB_MEETING_DAYS_COLLECTION).get();
  /** @type {Record<string, string>} */
  const map = {};
  for (const d of snap.docs) {
    const day = normalizeClubMeetingDay(d.data()?.meetingDay);
    if (day) map[d.id] = day;
  }
  setMeetingDayOverrides(map);
}

/**
 * Save or reset a club's meeting day, then refresh student meeting sheets for members
 * whose Gold/Maroon slots change under the new day.
 *
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{
 *   slug: string,
 *   clubName?: string,
 *   meetingDay?: string,
 *   adminUid: string,
 *   reset?: boolean,
 * }} args
 */
export async function setClubMeetingDayAndClearSignups(db, args) {
  const slug = args.slug?.trim() || "";
  const adminUid = args.adminUid?.trim() || "";
  if (!slug) throw new Error("Missing club.");
  if (!adminUid) throw new Error("Not signed in.");

  const defaultDay = getDefaultMeetingDayForSlug(slug);
  const meetingDay = args.reset ? defaultDay : normalizeClubMeetingDay(args.meetingDay);
  if (!meetingDay) throw new Error("Pick Gold, Maroon, Gold & Maroon, or General.");

  await applyMeetingDayOverridesFromAdminDb(db);
  const userIds = await listMemberUserIdsForClubAdmin(db, slug);

  /** @type {Map<string, { goldClubSlug: string, maroonClubSlug: string, memberships: import("@/lib/club-hub/clubMemberships").NormalizedClubMembership[] }>} */
  const beforeByUser = new Map();
  for (const userId of userIds) {
    const memberships = await loadMembershipsForUserAdmin(db, userId);
    beforeByUser.set(userId, {
      ...meetingChoicesFromMemberships(memberships),
      memberships,
    });
  }

  const dayRef = db.collection(CLUB_HUB_MEETING_DAYS_COLLECTION).doc(slug);
  if (args.reset || meetingDay === defaultDay) {
    await dayRef.delete();
  } else {
    await dayRef.set({
      slug,
      clubName: String(args.clubName || "").trim().slice(0, 120),
      meetingDay,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminUid,
    });
  }

  await applyMeetingDayOverridesFromAdminDb(db);

  /** @type {{ userId: string, goldClubSlug: string, maroonClubSlug: string }[]} */
  const cleared = [];
  for (const userId of userIds) {
    const before = beforeByUser.get(userId);
    const after = await deriveMeetingChoicesForUserAdmin(db, userId, before?.memberships);
    if (
      before &&
      before.goldClubSlug === after.goldClubSlug &&
      before.maroonClubSlug === after.maroonClubSlug
    ) {
      continue;
    }
    cleared.push({
      userId,
      goldClubSlug: after.goldClubSlug,
      maroonClubSlug: after.maroonClubSlug,
    });
  }

  /** @type {{ userId: string, displayName: string, goldClubSlug: string, maroonClubSlug: string }[]} */
  const rows = [];
  for (let i = 0; i < cleared.length; i += 50) {
    const chunk = cleared.slice(i, i + 50);
    const snaps = await db.getAll(...chunk.map((row) => db.collection("users").doc(row.userId)));
    chunk.forEach((row, index) => {
      const displayName = snaps[index]?.data()?.displayName?.trim() || "Student";
      rows.push({ ...row, displayName });
    });
  }

  return { meetingDay, rows };
}
