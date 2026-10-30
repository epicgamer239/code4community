/** @returns {string | null} */
export function getClubRosterSpreadsheetId() {
  const id = process.env.CLUB_ROSTER_SPREADSHEET_ID?.trim();
  return id || null;
}

export function isClubRosterSheetSyncConfigured() {
  return Boolean(getClubRosterSpreadsheetId());
}

export const ROSTER_META_TAB = "_rosterMeta";
/** Auto-built report: Left checked, Arrived not checked. */
export const LEFT_NOT_ARRIVED_TAB = "Left not arrived";
export const LEFT_NOT_ARRIVED_HEADER = ["Club", "Name", "Email", "Seminar"];
/** Name / Email / Seminar synced; Left / Arrived teacher-editable; User ID hidden sync key. */
export const ROSTER_HEADER = ["Name", "Email", "Seminar", "Left", "Arrived", "User ID"];
export const ROSTER_NAME_COLUMN = 0;
export const ROSTER_EMAIL_COLUMN = 1;
export const ROSTER_SEMINAR_COLUMN = 2;
export const ROSTER_LEFT_COLUMN = 3;
export const ROSTER_ARRIVED_COLUMN = 4;
export const ROSTER_USER_ID_COLUMN = 5;
/** @deprecated Prefer ROSTER_PROTECT_CLUB_SHEET_DESC (whole-tab lock). */
export const ROSTER_PROTECT_SYNC_DESC = "Club Hub sync — Name, Email, Seminar";
/** @deprecated Prefer ROSTER_PROTECT_CLUB_SHEET_DESC (whole-tab lock). */
export const ROSTER_PROTECT_UID_DESC = "Club Hub sync — User ID";
export const ROSTER_PROTECT_CLUB_SHEET_DESC = "Club Hub — only Left/Arrived editable";
export const ROSTER_PROTECT_READONLY_TAB_DESC = "Club Hub — read only";
/** @deprecated Use ROSTER_PROTECT_READONLY_TAB_DESC */
export const ROSTER_PROTECT_REPORT_DESC = "Club Hub sync — Left not arrived report";
/** Humans who may edit protected sync columns (in addition to the service account). */
export const ROSTER_PROTECT_EXTRA_EDITORS = ["shail40926@gmail.com"];
export const ROSTER_CHECKBOX_ROW_COUNT = 500;

/** @param {string} name */
export function sanitizeSheetTabTitle(name) {
  const cleaned = String(name || "Club")
    .replace(/[\[\]*?:/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const base = cleaned.slice(0, 95) || "Club";
  return base;
}
