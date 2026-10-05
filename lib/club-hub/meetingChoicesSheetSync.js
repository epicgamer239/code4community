import { getAdminFirestore } from "@/lib/firebase/admin";
import { getClubBySlug } from "@/lib/club-hub/broadRunClubDirectory";
import { CLUB_HUB_MEETING_CHOICES, normalizeMeetingChoices } from "@/lib/club-hub/clubMeetingChoices";
import { getRosterSheetsApi } from "@/lib/club-hub/rosterSheetApi";
import {
  getClubRosterSpreadsheetId,
  isClubRosterSheetSyncConfigured,
} from "@/lib/club-hub/rosterSheetConfig";

export const STUDENT_MEETING_TAB = "Student meeting clubs";

const STUDENT_MEETING_HEADER = ["Student name", "Gold club", "Maroon club", "User ID"];

function quoteTab(title) {
  return `'${title.replace(/'/g, "''")}'`;
}

/** @param {string} slug */
function clubNameForSlug(slug) {
  if (!slug) return "";
  return getClubBySlug(slug)?.name || slug;
}

/**
 * @param {ReturnType<typeof getRosterSheetsApi>} sheets
 * @param {string} spreadsheetId
 */
async function ensureStudentMeetingTab(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });
  const props = meta.sheets?.map((s) => s.properties).filter(Boolean) ?? [];
  let tab = props.find((p) => p.title === STUDENT_MEETING_TAB);
  if (!tab?.sheetId) {
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: STUDENT_MEETING_TAB } } }],
      },
    });
    const sheetId = addRes.replies?.[0]?.addSheet?.properties?.sheetId;
    if (sheetId == null) throw new Error("Could not create student meeting tab.");
    tab = { title: STUDENT_MEETING_TAB, sheetId };
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateCells: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 4,
              },
              rows: [
                {
                  values: STUDENT_MEETING_HEADER.map((v) => ({
                    userEnteredValue: { stringValue: v },
                  })),
                },
              ],
              fields: "userEnteredValue",
            },
          },
          {
            updateDimensionProperties: {
              range: { sheetId, dimension: "COLUMNS", startIndex: 3, endIndex: 4 },
              properties: { hiddenByUser: true },
              fields: "hiddenByUser",
            },
          },
        ],
      },
    });
  }
  return tab.sheetId;
}

/**
 * @param {ReturnType<typeof getRosterSheetsApi>} sheets
 * @param {string} spreadsheetId
 * @param {number} sheetId
 * @param {string} tabTitle
 */
async function readStudentMeetingRows(sheets, spreadsheetId, tabTitle) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(tabTitle)}!A:D`,
  });
  return res.values || [];
}

/**
 * @param {{
 *   userId: string,
 *   displayName: string,
 *   goldClubSlug: string,
 *   maroonClubSlug: string,
 * }} row
 */
export async function syncStudentMeetingRowToSheet(row) {
  if (!isClubRosterSheetSyncConfigured()) {
    return { ok: true, skipped: true };
  }
  const sheets = getRosterSheetsApi();
  const spreadsheetId = getClubRosterSpreadsheetId();
  if (!sheets || !spreadsheetId) {
    return { ok: false, error: "Sheets client not configured." };
  }

  const userId = row.userId?.trim();
  if (!userId) return { ok: false, error: "Missing user." };

  const goldName = clubNameForSlug(row.goldClubSlug?.trim() || "");
  const maroonName = clubNameForSlug(row.maroonClubSlug?.trim() || "");
  const name = row.displayName?.trim() || "Student";
  const sheetId = await ensureStudentMeetingTab(sheets, spreadsheetId);
  const rows = await readStudentMeetingRows(sheets, spreadsheetId, STUDENT_MEETING_TAB);

  let rowIndex = -1;
  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i]?.[3] === userId) {
      rowIndex = i;
      break;
    }
  }

  if (!goldName && !maroonName) {
    if (rowIndex < 0) return { ok: true, skipped: true };
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });
    return { ok: true, removed: true };
  }

  const dataRow = [name, goldName, maroonName, userId];
  if (rowIndex >= 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(STUDENT_MEETING_TAB)}!A${rowIndex + 1}:D${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [dataRow] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${quoteTab(STUDENT_MEETING_TAB)}!A:D`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [dataRow] },
    });
  }

  return { ok: true };
}

/** Rebuild the student meeting tab from Firestore. */
export async function bootstrapStudentMeetingTabFromFirestore() {
  if (!isClubRosterSheetSyncConfigured()) {
    return { ok: false, error: "CLUB_ROSTER_SPREADSHEET_ID is not set." };
  }
  const db = getAdminFirestore();
  if (!db) return { ok: false, error: "Admin Firestore unavailable." };

  const sheets = getRosterSheetsApi();
  const spreadsheetId = getClubRosterSpreadsheetId();
  if (!sheets || !spreadsheetId) {
    return { ok: false, error: "Sheets client not configured." };
  }

  await ensureStudentMeetingTab(sheets, spreadsheetId);

  const snap = await db.collection(CLUB_HUB_MEETING_CHOICES).get();
  /** @type {{ userId: string, displayName: string, goldClubSlug: string, maroonClubSlug: string }[]} */
  const entries = [];

  for (const docSnap of snap.docs) {
    const choices = normalizeMeetingChoices(docSnap.data());
    if (!choices.goldClubSlug && !choices.maroonClubSlug) continue;

    const userId = docSnap.id;
    let displayName = "Student";
    const userSnap = await db.collection("users").doc(userId).get();
    if (userSnap.exists) {
      displayName = userSnap.data()?.displayName?.trim() || displayName;
    }

    entries.push({
      userId,
      displayName,
      goldClubSlug: choices.goldClubSlug,
      maroonClubSlug: choices.maroonClubSlug,
    });
  }

  entries.sort((a, b) => a.displayName.localeCompare(b.displayName));

  const values = [
    STUDENT_MEETING_HEADER,
    ...entries.map((e) => [
      e.displayName,
      clubNameForSlug(e.goldClubSlug),
      clubNameForSlug(e.maroonClubSlug),
      e.userId,
    ]),
  ];

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${quoteTab(STUDENT_MEETING_TAB)}!A:D`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTab(STUDENT_MEETING_TAB)}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });

  return { ok: true, rows: entries.length };
}
