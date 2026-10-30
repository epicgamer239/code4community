import { deriveMeetingChoicesForUserAdmin } from "@/lib/club-hub/meetingChoicesFromMembershipsAdmin";

/**
 * Derive Gold/Maroon seminar clubs from the user's memberships (no choices collection).
 *
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} userId
 */
export async function reconcileMeetingChoicesForUserAdmin(db, userId) {
  const choices = await deriveMeetingChoicesForUserAdmin(db, userId);
  return { changed: false, choices };
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ userId: string, clubSlug?: string }} args
 */
export async function clearSeminarSignupAfterClubLeaveAdmin(db, { userId }) {
  return reconcileMeetingChoicesForUserAdmin(db, userId);
}
