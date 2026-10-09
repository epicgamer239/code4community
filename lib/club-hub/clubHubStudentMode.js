import { normalizeEmail } from "@/lib/email";

/** Only this account gets the Settings toggle and student-mode club UI. */
export const CLUB_HUB_STUDENT_MODE_EMAIL = "1021676@lcps.org";

/** @param {string | null | undefined} email */
export function isClubHubStudentModeAccount(email) {
  return normalizeEmail(email) === CLUB_HUB_STUDENT_MODE_EMAIL;
}

/** @param {string | null | undefined} email */
export function canOfferClubHubStudentMode(email) {
  return isClubHubStudentModeAccount(email);
}

/**
 * @param {{ clubHubStudentMode?: boolean } | null | undefined} userData
 * @param {string | null | undefined} email
 */
export function isClubHubStudentModeActive(userData, email) {
  if (!isClubHubStudentModeAccount(email)) return false;
  return userData?.clubHubStudentMode === true;
}
