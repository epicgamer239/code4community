import { getAdminFirestore } from "@/lib/firebase/admin";
import { getClubBySlug, getSortedClubOptions } from "@/lib/club-hub/broadRunClubDirectory";
import { CLUB_HUB_MEMBERSHIPS } from "@/lib/club-hub/clubMemberships";
import { getRosterSheetsApi } from "@/lib/club-hub/rosterSheetApi";
import {
  ROSTER_HEADER,
  ROSTER_META_TAB,
  getClubRosterSpreadsheetId,
  isClubRosterSheetSyncConfigured,
  sanitizeSheetTabTitle,
} from "@/lib/club-hub/rosterSheetConfig";

function getSheetsApi() {
  return getRosterSheetsApi();
}

/** @param {ReturnType<typeof getRosterSheetsApi>} sheets @param {string} spreadsheetId */
async function loadSpreadsheetMeta(sheets, spreadsheetId) {
  return sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties,sheets.protectedRanges",
  });
}

/** @param {{ title?: string | null }[]} sheetProps @param {string} title */
function findSheetByTitle(sheetProps, title) {
  return sheetProps.find((p) => p.title === title) ?? null;
}

/** @param {ReturnType<typeof getRosterSheetsApi>} sheets @param {string} spreadsheetId */
async function ensureMetaTab(sheets, spreadsheetId) {
  const meta = await loadSpreadsheetMeta(sheets, spreadsheetId);
  const props =
    meta.sheets?.map((s) => s.properties).filter(Boolean) ?? [];
  if (findSheetByTitle(props, ROSTER_META_TAB)) {
    return props;
  }
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: ROSTER_META_TAB,
              hidden: true,
            },
          },
        },
      ],
    },
  });
  const meta2 = await loadSpreadsheetMeta(sheets, spreadsheetId);
  return meta2.sheets?.map((s) => s.properties).filter(Boolean) ?? [];
}

/**
 * @param {import("googleapis").sheets_v4.Sheets} sheets
 * @param {string} spreadsheetId
 */
async function readMetaRows(sheets, spreadsheetId) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${ROSTER_META_TAB}'!A2:C`,
    });
    const rows = res.values || [];
    /** @type {Map<string, { tabTitle: string, sheetId: number }>} */
    const map = new Map();
    for (const row of rows) {
      const slug = row[0]?.trim();
      const tabTitle = row[1]?.trim();
      const sheetId = Number(row[2]);
      if (slug && tabTitle && Number.isFinite(sheetId)) {
        map.set(slug, { tabTitle, sheetId });
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * @param {import("googleapis").sheets_v4.Sheets} sheets
 * @param {string} spreadsheetId
 * @param {string} slug
 * @param {string} tabTitle
 * @param {number} sheetId
 */
async function appendMetaRow(sheets, spreadsheetId, slug, tabTitle, sheetId) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${ROSTER_META_TAB}'!A:C`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[slug, tabTitle, String(sheetId)]] },
  });
}

/**
 * @param {import("googleapis").sheets_v4.Sheets} sheets
 * @param {string} spreadsheetId
 * @param {import("googleapis").sheets_v4.Schema$SheetProperties[]} sheetProps
 * @param {string} clubSlug
 */
async function ensureClubTab(sheets, spreadsheetId, sheetProps, clubSlug) {
  const metaMap = await readMetaRows(sheets, spreadsheetId);
  const existing = metaMap.get(clubSlug);
  if (existing) {
    const byId = sheetProps.find((p) => p.sheetId === existing.sheetId);
    if (byId) return { tabTitle: existing.tabTitle, sheetId: existing.sheetId };
  }

  const club = getClubBySlug(clubSlug);
  let tabTitle = sanitizeSheetTabTitle(club?.name || clubSlug);
  const usedTitles = new Set(sheetProps.map((p) => p.title));
  if (usedTitles.has(tabTitle)) {
    const suffix = ` (${clubSlug.slice(0, 20)})`;
    tabTitle = sanitizeSheetTabTitle(`${tabTitle}${suffix}`).slice(0, 100);
  }

  const addRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: { title: tabTitle },
          },
        },
      ],
    },
  });
  const newSheetId = addRes.replies?.[0]?.addSheet?.properties?.sheetId;
  if (newSheetId == null) {
    throw new Error(`Could not create sheet tab for ${clubSlug}.`);
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${tabTitle}'!A1:C1`,
    valueInputOption: "RAW",
    requestBody: { values: [ROSTER_HEADER] },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateDimensionProperties: {
            range: {
              sheetId: newSheetId,
              dimension: "COLUMNS",
              startIndex: 2,
              endIndex: 3,
            },
            properties: { hiddenByUser: true },
            fields: "hiddenByUser",
          },
        },
      ],
    },
  });

  const metaHeader = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${ROSTER_META_TAB}'!A1:C1`,
  });
  if (!metaHeader.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${ROSTER_META_TAB}'!A1:C1`,
      valueInputOption: "RAW",
      requestBody: { values: [["clubSlug", "tabTitle", "sheetId"]] },
    });
  }

  await appendMetaRow(sheets, spreadsheetId, clubSlug, tabTitle, newSheetId);
  return { tabTitle, sheetId: newSheetId };
}

function quoteTab(title) {
  return `'${title.replace(/'/g, "''")}'`;
}

/**
 * @param {import("googleapis").sheets_v4.Sheets} sheets
 * @param {string} spreadsheetId
 * @param {string} tabTitle
 */
async function readRosterRows(sheets, spreadsheetId, tabTitle) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(tabTitle)}!A:C`,
  });
  return res.values || [];
}

/**
 * @param {{ displayName: string, userEmail: string, userId: string }} member
 */
export async function syncClubRosterMemberJoin(member) {
  if (!isClubRosterSheetSyncConfigured()) {
    return { ok: true, skipped: true };
  }
  const sheets = getSheetsApi();
  const spreadsheetId = getClubRosterSpreadsheetId();
  if (!sheets || !spreadsheetId) {
    return { ok: false, error: "Sheets client not configured." };
  }

  const clubSlug = member.clubSlug?.trim();
  const userId = member.userId?.trim();
  if (!clubSlug || !userId) {
    return { ok: false, error: "Missing club or user." };
  }

  let sheetProps = await ensureMetaTab(sheets, spreadsheetId);
  const { tabTitle } = await ensureClubTab(sheets, spreadsheetId, sheetProps, clubSlug);

  const rows = await readRosterRows(sheets, spreadsheetId, tabTitle);
  const name = member.displayName?.trim() || "Member";
  const email = member.userEmail?.trim() || "";
  const dataRow = [name, email, userId];

  let rowIndex = -1;
  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i]?.[2] === userId) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(tabTitle)}!A${rowIndex}:C${rowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: [dataRow] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${quoteTab(tabTitle)}!A:C`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [dataRow] },
    });
  }

  return { ok: true, tabTitle };
}

/** @param {{ clubSlug: string, userId: string }} args */
export async function syncClubRosterMemberLeave({ clubSlug, userId }) {
  if (!isClubRosterSheetSyncConfigured()) {
    return { ok: true, skipped: true };
  }
  const sheets = getSheetsApi();
  const spreadsheetId = getClubRosterSpreadsheetId();
  if (!sheets || !spreadsheetId) {
    return { ok: false, error: "Sheets client not configured." };
  }

  const slug = clubSlug?.trim();
  const uid = userId?.trim();
  if (!slug || !uid) {
    return { ok: false, error: "Missing club or user." };
  }

  await ensureMetaTab(sheets, spreadsheetId);
  const metaMap = await readMetaRows(sheets, spreadsheetId);
  const tab = metaMap.get(slug);
  if (!tab) {
    return { ok: true, skipped: true, reason: "no_tab" };
  }

  const rows = await readRosterRows(sheets, spreadsheetId, tab.tabTitle);
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i]?.[2] === uid) {
      rowIndex = i;
      break;
    }
  }
  if (rowIndex < 0) {
    return { ok: true, skipped: true, reason: "not_on_sheet" };
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: tab.sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });

  return { ok: true, tabTitle: tab.tabTitle };
}

/** Create all club tabs and fill from Firestore. */
export async function bootstrapClubRosterSpreadsheet() {
  if (!isClubRosterSheetSyncConfigured()) {
    return { ok: false, error: "CLUB_ROSTER_SPREADSHEET_ID is not set." };
  }
  const db = getAdminFirestore();
  if (!db) {
    return { ok: false, error: "Admin Firestore unavailable." };
  }
  const sheets = getSheetsApi();
  const spreadsheetId = getClubRosterSpreadsheetId();
  if (!sheets || !spreadsheetId) {
    return { ok: false, error: "Sheets client not configured." };
  }

  let sheetProps = await ensureMetaTab(sheets, spreadsheetId);
  const clubs = getSortedClubOptions();
  /** @type {Record<string, string>} */
  const tabBySlug = {};

  for (const club of clubs) {
    const { tabTitle } = await ensureClubTab(sheets, spreadsheetId, sheetProps, club.slug);
    tabBySlug[club.slug] = tabTitle;
    sheetProps = await loadSpreadsheetMeta(sheets, spreadsheetId).then(
      (m) => m.sheets?.map((s) => s.properties).filter(Boolean) ?? [],
    );
  }

  const snap = await db.collection(CLUB_HUB_MEMBERSHIPS).get();
  /** @type {Record<string, { displayName: string, userEmail: string, userId: string }[]>} */
  const byClub = {};
  for (const doc of snap.docs) {
    const data = doc.data();
    const slug = data.clubSlug?.trim();
    const uid = data.userId?.trim();
    if (!slug || !uid) continue;
    if (!byClub[slug]) byClub[slug] = [];
    byClub[slug].push({
      displayName: data.displayName?.trim() || "Member",
      userEmail: data.userEmail?.trim() || "",
      userId: uid,
    });
  }

  let tabsWritten = 0;
  for (const club of clubs) {
    const tabTitle = tabBySlug[club.slug];
    if (!tabTitle) continue;
    const members = byClub[club.slug] || [];
    members.sort((a, b) => a.displayName.localeCompare(b.displayName));
    const values = [ROSTER_HEADER, ...members.map((m) => [m.displayName, m.userEmail, m.userId])];
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${quoteTab(tabTitle)}!A:C`,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(tabTitle)}!A1`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
    tabsWritten += 1;
  }

  return { ok: true, tabs: tabsWritten, clubs: clubs.length };
}
