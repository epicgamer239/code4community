/** @returns {string | null} */
export function getClubRosterSpreadsheetId() {
  const id = process.env.CLUB_ROSTER_SPREADSHEET_ID?.trim();
  return id || null;
}

export function isClubRosterSheetSyncConfigured() {
  return Boolean(getClubRosterSpreadsheetId());
}

export const ROSTER_META_TAB = "_rosterMeta";
export const ROSTER_HEADER = ["Name", "Email", "User ID"];

/** @param {string} name */
export function sanitizeSheetTabTitle(name) {
  const cleaned = String(name || "Club")
    .replace(/[\[\]*?:/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const base = cleaned.slice(0, 95) || "Club";
  return base;
}
