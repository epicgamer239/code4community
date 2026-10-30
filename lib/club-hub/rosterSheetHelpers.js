import { getAdminFirestore } from "@/lib/firebase/admin";
import { getRosterSheetsApi } from "@/lib/club-hub/rosterSheetApi";
import { getClubRosterSpreadsheetId, isClubRosterSheetSyncConfigured } from "@/lib/club-hub/rosterSheetConfig";

export function quoteSheetTab(title) {
  return `'${String(title || "").replace(/'/g, "''")}'`;
}

/** @param {ReturnType<typeof getRosterSheetsApi>} sheets @param {string} spreadsheetId */
export async function loadSpreadsheetSheetProps(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });
  return meta.sheets?.map((sheet) => sheet.properties).filter(Boolean) ?? [];
}

/**
 * @param {ReturnType<typeof getRosterSheetsApi>} sheets
 * @param {string} spreadsheetId
 * @returns {Promise<{ properties?: { sheetId?: number | null, title?: string | null }, protectedRanges?: { protectedRangeId?: number, description?: string }[] }[]>}
 */
export async function loadSpreadsheetSheetsWithProtection(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties,sheets.protectedRanges",
  });
  return meta.sheets ?? [];
}

/**
 * @returns {{ db: import("firebase-admin/firestore").Firestore, sheets: NonNullable<ReturnType<typeof getRosterSheetsApi>>, spreadsheetId: string } | { ok: false, error?: string, skipped?: boolean }}
 */
export function getConfiguredRosterSheetsContext() {
  if (!isClubRosterSheetSyncConfigured()) {
    return { ok: false, skipped: true };
  }
  const db = getAdminFirestore();
  const sheets = getRosterSheetsApi();
  const spreadsheetId = getClubRosterSpreadsheetId();
  if (!db || !sheets || !spreadsheetId) {
    return { ok: false, error: "Sheets client not configured." };
  }
  return { db, sheets, spreadsheetId };
}
