import { getAdminFirestore } from "@/lib/firebase/admin";
import { getClubBySlug } from "@/lib/club-hub/broadRunClubDirectory";
import { applyCustomClubsFromAdminDb } from "@/lib/club-hub/customClubsServer";
import {
  deriveAllSeminarChoicesByUserAdmin,
  deriveMeetingChoicesForUserAdmin,
  loadMembershipsForUserAdmin,
} from "@/lib/club-hub/meetingChoicesFromMembershipsAdmin";
import { listSpecialSheetEvents } from "@/lib/club-hub/specialSheetEventsServer";
import {
  getConfiguredRosterSheetsContext,
  quoteSheetTab as quoteTab,
} from "@/lib/club-hub/rosterSheetHelpers";
import { slugForClubName, syncSeminarRostersForStudents } from "@/lib/club-hub/rosterSheetSync";
import {
  STUDENT_MEETING_TAB,
  buildStudentMeetingSheetHeaders,
  specialEventCellsForUser,
  studentMeetingUserIdColumnIndex,
} from "@/lib/club-hub/studentMeetingSheetLayout";

export { STUDENT_MEETING_TAB };

/** @param {string} slug */
function clubNameForSlug(slug) {
  if (!slug) return "";
  return getClubBySlug(slug)?.name || slug;
}

/** @param {string | undefined} goldName @param {string | undefined} maroonName */
function previousSeminarSlugs(goldName, maroonName) {
  return [slugForClubName(goldName || ""), slugForClubName(maroonName || "")].filter(Boolean);
}

/** @param {number} colCount */
function sheetEndColumnLetter(colCount) {
  if (colCount <= 0) return "A";
  if (colCount <= 26) return String.fromCharCode(64 + colCount);
  return "Z";
}

/**
 * Shared row plan for student meeting sheet sync (values, delete decision, roster fields).
 * @param {{
 *   userId: string,
 *   displayName?: string,
 *   goldClubSlug?: string,
 *   maroonClubSlug?: string,
 *   sheetRow?: string[] | undefined,
 *   rowIndex?: number | null,
 *   specialEvents: import("@/lib/club-hub/specialSheetEventsServer").SpecialSheetEvent[],
 *   colCount: number,
 *   userIdCol: number,
 * }}
 */
function buildStudentMeetingRowSyncPlan({
  userId,
  displayName,
  goldClubSlug,
  maroonClubSlug,
  sheetRow,
  rowIndex,
  specialEvents,
  colCount,
  userIdCol,
}) {
  const goldName = clubNameForSlug(goldClubSlug?.trim() || "");
  const maroonName = clubNameForSlug(maroonClubSlug?.trim() || "");
  const name = displayName?.trim() || "Student";
  const inSpecialEvent = specialEvents.some((ev) => (ev.studentUserIds || []).includes(userId));
  const hasRowIndex = rowIndex != null && rowIndex >= 0;
  const previousSlugs = hasRowIndex
    ? previousSeminarSlugs(sheetRow?.[1], sheetRow?.[2])
    : [];
  const shouldDeleteRow = !goldName && !maroonName && !inSpecialEvent;

  /** @type {string[] | null} */
  let dataRow = null;
  if (!shouldDeleteRow) {
    dataRow = new Array(colCount).fill("");
    if (hasRowIndex && sheetRow) {
      for (let c = 0; c < colCount; c += 1) {
        dataRow[c] = sheetRow[c] ?? "";
      }
    } else {
      const specialCells = specialEventCellsForUser(userId, specialEvents);
      for (let i = 0; i < specialCells.length; i += 1) {
        dataRow[3 + i] = specialCells[i];
      }
    }
    dataRow[0] = name;
    dataRow[1] = goldName;
    dataRow[2] = maroonName;
    dataRow[userIdCol] = userId;
  }

  return {
    name,
    shouldDeleteRow,
    previousSlugs,
    dataRow,
    rosterUpdate: {
      userId,
      displayName: name,
      goldClubSlug: shouldDeleteRow ? "" : goldClubSlug?.trim() || "",
      maroonClubSlug: shouldDeleteRow ? "" : maroonClubSlug?.trim() || "",
      previousSlugs,
    },
  };
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
  }
  return tab.sheetId;
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 */
async function loadSpecialEventsForSheet(db) {
  return listSpecialSheetEvents(db);
}

/**
 * @param {ReturnType<typeof getRosterSheetsApi>} sheets
 * @param {string} spreadsheetId
 * @param {number} sheetId
 * @param {number} userIdColIndex
 */
async function ensureHiddenUserIdColumn(sheets, spreadsheetId, sheetId, userIdColIndex) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: userIdColIndex,
              endIndex: userIdColIndex + 1,
            },
            properties: { hiddenByUser: true },
            fields: "hiddenByUser",
          },
        },
      ],
    },
  });
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {ReturnType<typeof getRosterSheetsApi>} sheets
 * @param {string} spreadsheetId
 * @param {number} sheetId
 */
export async function rebuildStudentMeetingSheet(db, sheets, spreadsheetId, sheetId) {
  const specialEvents = await loadSpecialEventsForSheet(db);
  const headers = buildStudentMeetingSheetHeaders(specialEvents);
  const userIdCol = studentMeetingUserIdColumnIndex(specialEvents.length);
  const colCount = headers.length;

  const derivedByUser = await deriveAllSeminarChoicesByUserAdmin(db);
  /** @type {Map<string, { displayName: string, goldClubSlug: string, maroonClubSlug: string }>} */
  const meetingByUser = new Map();

  const derivedIds = [...derivedByUser.keys()];
  for (let i = 0; i < derivedIds.length; i += 100) {
    const chunk = derivedIds.slice(i, i + 100);
    const profiles = await db.getAll(...chunk.map((id) => db.collection("users").doc(id)));
    chunk.forEach((userId, index) => {
      const choices = derivedByUser.get(userId);
      if (!choices) return;
      meetingByUser.set(userId, {
        displayName: profiles[index]?.data()?.displayName?.trim() || "Student",
        goldClubSlug: choices.goldClubSlug,
        maroonClubSlug: choices.maroonClubSlug,
      });
    });
  }

  /** @type {Set<string>} */
  const allUserIds = new Set(meetingByUser.keys());
  for (const ev of specialEvents) {
    for (const uid of ev.studentUserIds || []) {
      if (uid) allUserIds.add(uid);
    }
  }

  /** @type {{ userId: string, displayName: string, goldClubSlug: string, maroonClubSlug: string }[]} */
  const entries = [];
  for (const userId of allUserIds) {
    const meeting = meetingByUser.get(userId);
    if (meeting) {
      entries.push({ userId, ...meeting });
      continue;
    }
    let displayName = "Student";
    const userSnap = await db.collection("users").doc(userId).get();
    if (userSnap.exists) {
      displayName = userSnap.data()?.displayName?.trim() || displayName;
    }
    entries.push({
      userId,
      displayName,
      goldClubSlug: "",
      maroonClubSlug: "",
    });
  }

  entries.sort((a, b) => a.displayName.localeCompare(b.displayName));

  const values = [
    headers,
    ...entries.map((e) => {
      /** @type {string[]} */
      const row = new Array(colCount).fill("");
      row[0] = e.displayName;
      row[1] = clubNameForSlug(e.goldClubSlug);
      row[2] = clubNameForSlug(e.maroonClubSlug);
      const specialCells = specialEventCellsForUser(e.userId, specialEvents);
      for (let i = 0; i < specialCells.length; i += 1) {
        row[3 + i] = specialCells[i];
      }
      row[userIdCol] = e.userId;
      return row;
    }),
  ];

  const endCol = sheetEndColumnLetter(colCount);
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${quoteTab(STUDENT_MEETING_TAB)}!A:${endCol}`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTab(STUDENT_MEETING_TAB)}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });

  await ensureHiddenUserIdColumn(sheets, spreadsheetId, sheetId, userIdCol);

  return { rows: entries.length, specialEventColumns: specialEvents.length };
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
  const ctx = getConfiguredRosterSheetsContext();
  if ("ok" in ctx && ctx.ok === false) {
    return ctx.skipped ? { ok: true, skipped: true } : { ok: false, error: ctx.error || "Sheets client not configured." };
  }
  const { db, sheets, spreadsheetId } = ctx;

  const userId = row.userId?.trim();
  if (!userId) return { ok: false, error: "Missing user." };

  await applyCustomClubsFromAdminDb(db);
  const specialEvents = await loadSpecialEventsForSheet(db);
  const headers = buildStudentMeetingSheetHeaders(specialEvents);
  const userIdCol = studentMeetingUserIdColumnIndex(specialEvents.length);
  const colCount = headers.length;

  const sheetId = await ensureStudentMeetingTab(sheets, spreadsheetId);

  const endCol = sheetEndColumnLetter(colCount);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(STUDENT_MEETING_TAB)}!A:${endCol}`,
  });
  const rows = res.values || [];
  const headerRow = rows[0] || [];
  if (
    headerRow[0] !== headers[0] ||
    headerRow[1] !== headers[1] ||
    headerRow[2] !== headers[2]
  ) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(STUDENT_MEETING_TAB)}!A1:${endCol}1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  }

  let rowIndex = -1;
  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i]?.[userIdCol] === userId) {
      rowIndex = i;
      break;
    }
  }

  const plan = buildStudentMeetingRowSyncPlan({
    userId,
    displayName: row.displayName,
    goldClubSlug: row.goldClubSlug,
    maroonClubSlug: row.maroonClubSlug,
    sheetRow: rowIndex >= 0 ? rows[rowIndex] : undefined,
    rowIndex: rowIndex >= 0 ? rowIndex : null,
    specialEvents,
    colCount,
    userIdCol,
  });

  if (plan.shouldDeleteRow) {
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
    await syncSeminarRostersForStudents([plan.rosterUpdate]);
    return { ok: true, removed: true };
  }

  const dataRow = plan.dataRow;
  if (!dataRow) return { ok: false, error: "Could not build sheet row." };

  if (rowIndex >= 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(STUDENT_MEETING_TAB)}!A${rowIndex + 1}:${endCol}${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [dataRow] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${quoteTab(STUDENT_MEETING_TAB)}!A:${endCol}`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [dataRow] },
    });
  }

  await syncSeminarRostersForStudents([plan.rosterUpdate]);

  return { ok: true };
}

/**
 * Update several student meeting rows in one sheet read.
 * @param {{ userId: string, displayName: string, goldClubSlug: string, maroonClubSlug: string }[]} updates
 */
export async function syncStudentMeetingRowsToSheet(updates) {
  const rowsToSync = updates.filter((row) => row.userId?.trim());
  if (!rowsToSync.length) return { ok: true, skipped: true, updated: 0 };
  const ctx = getConfiguredRosterSheetsContext();
  if ("ok" in ctx && ctx.ok === false) {
    return ctx.skipped
      ? { ok: true, skipped: true, updated: 0 }
      : { ok: false, error: ctx.error || "Sheets client not configured." };
  }
  const { db, sheets, spreadsheetId } = ctx;

  await applyCustomClubsFromAdminDb(db);
  const specialEvents = await loadSpecialEventsForSheet(db);
  const userIdCol = studentMeetingUserIdColumnIndex(specialEvents.length);
  const colCount = buildStudentMeetingSheetHeaders(specialEvents).length;
  const endCol = sheetEndColumnLetter(colCount);
  const sheetId = await ensureStudentMeetingTab(sheets, spreadsheetId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(STUDENT_MEETING_TAB)}!A:${endCol}`,
  });
  const sheetRows = res.values || [];

  /** @type {Map<string, number>} */
  const rowIndexByUser = new Map();
  for (let i = 1; i < sheetRows.length; i += 1) {
    const userId = sheetRows[i]?.[userIdCol];
    if (userId) rowIndexByUser.set(userId, i);
  }

  /** @type {Parameters<typeof syncSeminarRostersForStudents>[0]} */
  const rosterUpdates = [];
  /** @type {{ range: string, values: string[][] }[]} */
  const valueUpdates = [];
  /** @type {string[][]} */
  const appends = [];
  /** @type {number[]} */
  const deleteIndexes = [];

  for (const row of rowsToSync) {
    const userId = row.userId.trim();
    const rowIndex = rowIndexByUser.get(userId);
    const plan = buildStudentMeetingRowSyncPlan({
      userId,
      displayName: row.displayName,
      goldClubSlug: row.goldClubSlug,
      maroonClubSlug: row.maroonClubSlug,
      sheetRow: rowIndex != null ? sheetRows[rowIndex] : undefined,
      rowIndex: rowIndex ?? null,
      specialEvents,
      colCount,
      userIdCol,
    });

    rosterUpdates.push(plan.rosterUpdate);

    if (plan.shouldDeleteRow) {
      if (rowIndex != null) deleteIndexes.push(rowIndex);
      continue;
    }

    const dataRow = plan.dataRow;
    if (!dataRow) continue;

    if (rowIndex != null) {
      valueUpdates.push({
        range: `${quoteTab(STUDENT_MEETING_TAB)}!A${rowIndex + 1}:${endCol}${rowIndex + 1}`,
        values: [dataRow],
      });
    } else {
      appends.push(dataRow);
    }
  }

  if (valueUpdates.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: valueUpdates },
    });
  }
  if (appends.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${quoteTab(STUDENT_MEETING_TAB)}!A:${endCol}`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: appends },
    });
  }
  if (deleteIndexes.length) {
    const unique = [...new Set(deleteIndexes)].sort((a, b) => b - a);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: unique.map((rowIndex) => ({
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        })),
      },
    });
  }

  await syncSeminarRostersForStudents(rosterUpdates);
  return { ok: true, updated: rowsToSync.length };
}

/**
 * After leaving a club: derive remaining Gold/Maroon from memberships and mirror Sheets.
 * @param {{ userId: string, clubSlug: string }} args
 */
export async function syncStudentMeetingRowAfterClubLeave({ userId, clubSlug }) {
  const db = getAdminFirestore();
  if (!db) {
    return { ok: false, error: "Admin Firestore unavailable." };
  }

  const uid = userId?.trim();
  const slug = clubSlug?.trim();
  if (!uid || !slug) {
    return { ok: false, error: "Missing user or club." };
  }

  // Membership doc is already deleted; derive from whatever remains.
  const memberships = await loadMembershipsForUserAdmin(db, uid);
  const choices = await deriveMeetingChoicesForUserAdmin(db, uid, memberships);

  let displayName = "Student";
  const userSnap = await db.collection("users").doc(uid).get();
  if (userSnap.exists) {
    displayName = userSnap.data()?.displayName?.trim() || displayName;
  }

  return syncStudentMeetingRowToSheet({
    userId: uid,
    displayName,
    goldClubSlug: choices.goldClubSlug,
    maroonClubSlug: choices.maroonClubSlug,
  });
}

/**
 * Derive seminar slots for a user and sync the student meeting sheet (+ club rosters).
 * @param {{ userId: string, displayName?: string }} args
 */
export async function syncStudentMeetingRowFromMemberships({ userId, displayName }) {
  const db = getAdminFirestore();
  if (!db) {
    return { ok: false, error: "Admin Firestore unavailable." };
  }
  const uid = userId?.trim();
  if (!uid) return { ok: false, error: "Missing user." };

  await applyCustomClubsFromAdminDb(db);
  const derived = await deriveMeetingChoicesForUserAdmin(db, uid);

  let name = displayName?.trim() || "";
  if (!name) {
    const userSnap = await db.collection("users").doc(uid).get();
    name = userSnap.exists ? userSnap.data()?.displayName?.trim() || "Student" : "Student";
  }

  return syncStudentMeetingRowToSheet({
    userId: uid,
    displayName: name,
    goldClubSlug: derived.goldClubSlug,
    maroonClubSlug: derived.maroonClubSlug,
  });
}

/** Rebuild the student meeting tab from Firestore. */
export async function bootstrapStudentMeetingTabFromFirestore() {
  const ctx = getConfiguredRosterSheetsContext();
  if ("ok" in ctx && ctx.ok === false) {
    return ctx.skipped
      ? { ok: false, error: "CLUB_ROSTER_SPREADSHEET_ID is not set." }
      : { ok: false, error: ctx.error || "Sheets client not configured." };
  }
  const { db, sheets, spreadsheetId } = ctx;

  const sheetId = await ensureStudentMeetingTab(sheets, spreadsheetId);
  const result = await rebuildStudentMeetingSheet(db, sheets, spreadsheetId, sheetId);
  const { lockDownRosterSpreadsheet } = await import("@/lib/club-hub/rosterSheetSync");
  await lockDownRosterSpreadsheet(sheets, spreadsheetId);
  return { ok: true, ...result };
}
