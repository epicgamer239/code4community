/**
 * Seminar rosters on the club spreadsheet: one tab per Gold/Maroon club, with
 * a row for every club member (seminar day from membership / club schedule).
 */
import { getAdminFirestore } from "@/lib/firebase/admin";
import { applyCustomClubsFromAdminDb } from "@/lib/club-hub/customClubsServer";
import { getEffectiveMeetingDayForSlug } from "@/lib/club-hub/clubDirectorySections";
import { applyMeetingDayOverridesFromAdminDb } from "@/lib/club-hub/clubMeetingDaysServer";
import { getSortedClubOptions } from "@/lib/club-hub/broadRunClubDirectory";
import { CLUB_HUB_MEMBERSHIPS } from "@/lib/club-hub/clubMemberships";
import { STUDENT_MEETING_TAB } from "@/lib/club-hub/studentMeetingSheetLayout";
import { resolveSeminarDays } from "@/lib/club-hub/seminarMembershipLimit";
import {
  LEFT_NOT_ARRIVED_HEADER,
  LEFT_NOT_ARRIVED_TAB,
  ROSTER_ARRIVED_COLUMN,
  ROSTER_CHECKBOX_ROW_COUNT,
  ROSTER_HEADER,
  ROSTER_LEFT_COLUMN,
  ROSTER_META_TAB,
  ROSTER_PROTECT_CLUB_SHEET_DESC,
  ROSTER_PROTECT_READONLY_TAB_DESC,
  ROSTER_PROTECT_REPORT_DESC,
  ROSTER_PROTECT_SYNC_DESC,
  ROSTER_PROTECT_UID_DESC,
  ROSTER_USER_ID_COLUMN,
  isClubRosterSheetSyncConfigured,
  sanitizeSheetTabTitle,
} from "@/lib/club-hub/rosterSheetConfig";
import { getRosterProtectedRangeEditors } from "@/lib/club-hub/rosterSheetAuth";
import {
  getConfiguredRosterSheetsContext,
  loadSpreadsheetSheetProps,
  loadSpreadsheetSheetsWithProtection,
  quoteSheetTab as quoteTab,
} from "@/lib/club-hub/rosterSheetHelpers";

const USER_ID_COLUMN = ROSTER_USER_ID_COLUMN;

/** @param {{ title?: string | null, sheetId?: number | null }[]} sheetProps @param {string} title */
function findSheetByTitle(sheetProps, title) {
  return sheetProps.find((p) => p.title === title) ?? null;
}

/** @param {unknown} raw */
function checkboxCellValue(raw) {
  if (raw === true || raw === "TRUE" || raw === "true" || raw === 1 || raw === "1") return "TRUE";
  if (raw === false || raw === "FALSE" || raw === "false" || raw === 0 || raw === "0") return "FALSE";
  return "";
}

/**
 * @param {string[]} headerRow
 * @returns {{ name: number, email: number, seminar: number, left: number, arrived: number, userId: number, legacyUserIdOnly: boolean }}
 */
function parseRosterHeader(headerRow) {
  const norm = (headerRow || []).map((h) => String(h || "").trim().toLowerCase());
  const idx = (label) => norm.indexOf(label);
  const userId = idx("user id");
  const seminar = idx("seminar");
  const left = idx("left");
  const arrived = idx("arrived");
  // Older tabs: Name | Email | User ID (no Seminar / attendance).
  const legacyUserIdOnly = userId === 2 && seminar < 0;
  return {
    name: idx("name") >= 0 ? idx("name") : 0,
    email: idx("email") >= 0 ? idx("email") : 1,
    seminar,
    left,
    arrived,
    userId: userId >= 0 ? userId : legacyUserIdOnly ? 2 : USER_ID_COLUMN,
    legacyUserIdOnly,
  };
}

const CLUB_PROTECT_DESCS = new Set([
  ROSTER_PROTECT_SYNC_DESC,
  ROSTER_PROTECT_UID_DESC,
  ROSTER_PROTECT_CLUB_SHEET_DESC,
]);

const READONLY_PROTECT_DESCS = new Set([
  ROSTER_PROTECT_READONLY_TAB_DESC,
  ROSTER_PROTECT_REPORT_DESC,
]);

/**
 * @param {{ protectedRangeId?: number, description?: string }[]} existing
 * @param {Set<string>} descriptions
 */
function deleteProtectedRangeRequests(existing, descriptions) {
  /** @type {object[]} */
  const requests = [];
  for (const range of existing || []) {
    if (descriptions.has(range.description || "") && range.protectedRangeId != null) {
      requests.push({ deleteProtectedRange: { protectedRangeId: range.protectedRangeId } });
    }
  }
  return requests;
}

/**
 * Lock an entire tab so only protect-editors can edit (teachers: view only).
 * @param {ReturnType<typeof getRosterSheetsApi>} sheets
 * @param {string} spreadsheetId
 * @param {number} sheetId
 */
async function ensureReadOnlyTabProtection(sheets, spreadsheetId, sheetId) {
  const protectEditors = getRosterProtectedRangeEditors();
  if (!protectEditors.length) return;

  const sheetsMeta = await loadSpreadsheetSheetsWithProtection(sheets, spreadsheetId);
  const sheet = sheetsMeta.find((s) => s.properties?.sheetId === sheetId);
  const requests = [
    ...deleteProtectedRangeRequests(sheet?.protectedRanges || [], READONLY_PROTECT_DESCS),
    ...deleteProtectedRangeRequests(sheet?.protectedRanges || [], CLUB_PROTECT_DESCS),
    {
      addProtectedRange: {
        protectedRange: {
          range: { sheetId },
          description: ROSTER_PROTECT_READONLY_TAB_DESC,
          warningOnly: false,
          editors: { users: protectEditors },
        },
      },
    },
  ];
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

/**
 * Unhide Left/Arrived, hide User ID, checkboxes only on member rows.
 * Whole club tab locked except Left/Arrived data cells.
 * @param {ReturnType<typeof getRosterSheetsApi>} sheets
 * @param {string} spreadsheetId
 * @param {number} sheetId
 * @param {{ memberCount?: number }} [opts]
 */
async function ensureClubTabAttendanceLayout(sheets, spreadsheetId, sheetId, opts = {}) {
  const protectEditors = getRosterProtectedRangeEditors();
  const sheetsMeta = await loadSpreadsheetSheetsWithProtection(sheets, spreadsheetId);
  const sheet = sheetsMeta.find((s) => s.properties?.sheetId === sheetId);
  const existing = sheet?.protectedRanges || [];
  const memberCount = Math.max(0, Number(opts.memberCount) || 0);
  /** @type {object[]} */
  const requests = [
    ...deleteProtectedRangeRequests(existing, CLUB_PROTECT_DESCS),
    ...deleteProtectedRangeRequests(existing, READONLY_PROTECT_DESCS),
    // Older sync hid User ID in column D; unhide A–E so Left is visible.
    {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: 0,
          endIndex: USER_ID_COLUMN,
        },
        properties: { hiddenByUser: false },
        fields: "hiddenByUser",
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: USER_ID_COLUMN,
          endIndex: USER_ID_COLUMN + 1,
        },
        properties: { hiddenByUser: true },
        fields: "hiddenByUser",
      },
    },
    // Clear leftover checkboxes below the roster, then apply only on member rows.
    {
      setDataValidation: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 1 + ROSTER_CHECKBOX_ROW_COUNT,
          startColumnIndex: ROSTER_LEFT_COLUMN,
          endColumnIndex: ROSTER_ARRIVED_COLUMN + 1,
        },
        rule: null,
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: ROSTER_HEADER.length,
        },
        cell: { userEnteredFormat: { textFormat: { bold: true } } },
        fields: "userEnteredFormat.textFormat.bold",
      },
    },
  ];

  if (memberCount > 0) {
    requests.push({
      setDataValidation: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 1 + memberCount,
          startColumnIndex: ROSTER_LEFT_COLUMN,
          endColumnIndex: ROSTER_ARRIVED_COLUMN + 1,
        },
        rule: {
          condition: { type: "BOOLEAN" },
          showCustomUi: true,
          strict: true,
        },
      },
    });
  }

  if (protectEditors.length) {
    /** @type {{ sheetId: number, startRowIndex?: number, endRowIndex?: number, startColumnIndex?: number, endColumnIndex?: number }[]} */
    const unprotectedRanges = [];
    if (memberCount > 0) {
      unprotectedRanges.push({
        sheetId,
        startRowIndex: 1,
        endRowIndex: 1 + memberCount,
        startColumnIndex: ROSTER_LEFT_COLUMN,
        endColumnIndex: ROSTER_ARRIVED_COLUMN + 1,
      });
    }
    requests.push({
      addProtectedRange: {
        protectedRange: {
          range: { sheetId },
          description: ROSTER_PROTECT_CLUB_SHEET_DESC,
          warningOnly: false,
          editors: { users: protectEditors },
          ...(unprotectedRanges.length ? { unprotectedRanges } : {}),
        },
      },
    });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

/**
 * Lock Home / Student meeting / Left not arrived / meta / other non-club tabs as read-only.
 * Club tabs: only Left/Arrived checkboxes editable.
 * @param {NonNullable<ReturnType<typeof getRosterSheetsApi>>} sheets
 * @param {string} spreadsheetId
 */
export async function lockDownRosterSpreadsheet(sheets, spreadsheetId) {
  const meta = await readMetaRows(sheets, spreadsheetId);
  /** @type {Set<number>} */
  const clubSheetIds = new Set();
  for (const info of meta.values()) {
    if (info.sheetId != null) clubSheetIds.add(info.sheetId);
  }

  const sheetsMeta = await loadSpreadsheetSheetsWithProtection(sheets, spreadsheetId);
  let lockedReadOnly = 0;
  let lockedClubs = 0;

  for (const sheet of sheetsMeta) {
    const sheetId = sheet.properties?.sheetId;
    const title = sheet.properties?.title || "";
    if (sheetId == null) continue;

    if (clubSheetIds.has(sheetId)) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${quoteTab(title)}!A:A`,
      });
      const memberCount = Math.max(0, (res.values?.length || 1) - 1);
      await ensureClubTabAttendanceLayout(sheets, spreadsheetId, sheetId, { memberCount });
      lockedClubs += 1;
      continue;
    }

    // Hide internal meta; lock everything else teachers shouldn't touch.
    if (title === ROSTER_META_TAB && !sheet.properties?.hidden) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: { sheetId, hidden: true },
                fields: "hidden",
              },
            },
          ],
        },
      });
    }

    await ensureReadOnlyTabProtection(sheets, spreadsheetId, sheetId);
    lockedReadOnly += 1;
  }

  return { lockedClubs, lockedReadOnly };
}

/** @param {ReturnType<typeof getRosterSheetsApi>} sheets @param {string} spreadsheetId */
async function ensureMetaTab(sheets, spreadsheetId) {
  const props = await loadSpreadsheetSheetProps(sheets, spreadsheetId);
  if (findSheetByTitle(props, ROSTER_META_TAB)) return props;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: ROSTER_META_TAB, hidden: true } } }],
    },
  });
  return loadSpreadsheetSheetProps(sheets, spreadsheetId);
}

/** @param {ReturnType<typeof getRosterSheetsApi>} sheets @param {string} spreadsheetId */
async function readMetaRows(sheets, spreadsheetId) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${ROSTER_META_TAB}'!A2:C`,
    });
    /** @type {Map<string, { tabTitle: string, sheetId: number }>} */
    const map = new Map();
    for (const row of res.values || []) {
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
 * @param {ReturnType<typeof getRosterSheetsApi>} sheets
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

/** @param {string} slug @param {string} gold @param {string} maroon */
function seminarLabel(slug, gold, maroon) {
  const onGold = gold === slug;
  const onMaroon = maroon === slug;
  if (onGold && onMaroon) return "Gold & Maroon";
  if (onGold) return "Gold";
  return "Maroon";
}

/** @param {{ clubSlug: string, memberGroups?: string[], seminarDays?: unknown }} membership */
function seminarLabelForMembership(membership) {
  const days = resolveSeminarDays(membership);
  const onGold = days.includes("gold");
  const onMaroon = days.includes("maroon");
  if (onGold && onMaroon) return "Gold & Maroon";
  if (onGold) return "Gold";
  if (onMaroon) return "Maroon";
  return "";
}

/** @param {string[]} slugs */
/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string[]} userIds
 */
async function emailsForUsers(db, userIds) {
  /** @type {Map<string, string>} */
  const map = new Map();
  const ids = uniqueSlugs(userIds);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const snaps = await db.getAll(...chunk.map((id) => db.collection("users").doc(id)));
    for (const snap of snaps) {
      map.set(snap.id, snap.data()?.email?.trim() || "");
    }
  }
  return map;
}

function uniqueSlugs(slugs) {
  return [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
}

/** Gold, Maroon, or both. General clubs do not get a roster tab. */
function clubMeetsDuringSeminar(slug) {
  const day = getEffectiveMeetingDayForSlug(slug);
  return day === "gold" || day === "maroon" || day === "both";
}

const HOME_TAB = "Home";
const HOME_SKIP_TABS = new Set([
  HOME_TAB,
  ROSTER_META_TAB,
  LEFT_NOT_ARRIVED_TAB,
  "Sheet1",
  STUDENT_MEETING_TAB,
]);

/** @param {string} name */
function slugForClubName(name) {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return getSortedClubOptions().find((club) => club.name === trimmed)?.slug || "";
}

/**
 * @param {ReturnType<typeof getRosterSheetsApi>} sheets
 * @param {string} spreadsheetId
 * @param {{ title?: string | null, sheetId?: number | null }[]} sheetProps
 * @param {string} clubSlug
 */
async function ensureClubTab(sheets, spreadsheetId, sheetProps, clubSlug) {
  const metaMap = await readMetaRows(sheets, spreadsheetId);
  const existing = metaMap.get(clubSlug);
  if (existing && sheetProps.some((p) => p.sheetId === existing.sheetId)) {
    return { tabTitle: existing.tabTitle, sheetId: existing.sheetId };
  }

  const club = getSortedClubOptions().find((option) => option.slug === clubSlug);
  let tabTitle = sanitizeSheetTabTitle(club?.name || clubSlug);
  const usedTitles = new Set(sheetProps.map((p) => p.title));
  if (usedTitles.has(tabTitle)) {
    tabTitle = sanitizeSheetTabTitle(`${tabTitle} (${clubSlug.slice(0, 20)})`).slice(0, 100);
  }

  const addRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: tabTitle } } }] },
  });
  const newSheetId = addRes.replies?.[0]?.addSheet?.properties?.sheetId;
  if (newSheetId == null) throw new Error(`Could not create sheet tab for ${clubSlug}.`);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTab(tabTitle)}!A1:F1`,
    valueInputOption: "RAW",
    requestBody: { values: [ROSTER_HEADER] },
  });
  await ensureClubTabAttendanceLayout(sheets, spreadsheetId, newSheetId);

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
  sheetProps.push({ title: tabTitle, sheetId: newSheetId });
  return { tabTitle, sheetId: newSheetId };
}

/**
 * @param {string[]} row
 * @param {ReturnType<typeof parseRosterHeader>} cols
 */
function userIdFromRosterRow(row, cols) {
  const fromCol = row[cols.userId]?.trim?.() || String(row[cols.userId] || "").trim();
  if (fromCol) return fromCol;
  if (cols.legacyUserIdOnly) return String(row[2] || "").trim();
  return "";
}

/**
 * @param {{
 *   userId: string,
 *   displayName: string,
 *   userEmail?: string,
 *   goldClubSlug: string,
 *   maroonClubSlug: string,
 *   previousSlugs?: string[],
 * }[]} students
 */
export async function syncSeminarRostersForStudents(students) {
  const rows = students.filter((row) => row.userId?.trim());
  if (!rows.length) return { ok: true, skipped: true };
  const ctx = getConfiguredRosterSheetsContext();
  if ("ok" in ctx && ctx.ok === false) {
    return ctx.skipped ? { ok: true, skipped: true } : { ok: false, error: ctx.error || "Sheets client not configured." };
  }
  const { db, sheets, spreadsheetId } = ctx;

  await applyCustomClubsFromAdminDb(db);
  await applyMeetingDayOverridesFromAdminDb(db);
  const emailByUser = await emailsForUsers(
    db,
    rows.filter((row) => !row.userEmail?.trim()).map((row) => row.userId.trim()),
  );

  let sheetProps = await ensureMetaTab(sheets, spreadsheetId);
  /** @type {Set<string>} */
  const affected = new Set();
  for (const row of rows) {
    for (const slug of uniqueSlugs([
      row.goldClubSlug || "",
      row.maroonClubSlug || "",
      ...(row.previousSlugs || []),
    ])) {
      affected.add(slug);
    }
  }

  /** @type {Map<string, { tabTitle: string, sheetId: number }>} */
  const tabs = new Map();
  for (const slug of affected) {
    if (!clubMeetsDuringSeminar(slug)) continue;
    const stillUsed = rows.some(
      (row) => row.goldClubSlug?.trim() === slug || row.maroonClubSlug?.trim() === slug,
    );
    const meta = await readMetaRows(sheets, spreadsheetId);
    if (!stillUsed && !meta.get(slug)) continue;
    const tab = await ensureClubTab(sheets, spreadsheetId, sheetProps, slug);
    tabs.set(slug, tab);
    sheetProps = await loadSpreadsheetSheetProps(sheets, spreadsheetId);
  }

  for (const [slug, tab] of tabs) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteTab(tab.tabTitle)}!A:F`,
    });
    const values = res.values || [];
    const cols = parseRosterHeader(values[0] || []);
    /** @type {Map<string, { name: string, email: string, seminar: string, left: string, arrived: string, userId: string }>} */
    const byUser = new Map();
    for (let i = 1; i < values.length; i += 1) {
      const row = values[i] || [];
      const uid = userIdFromRosterRow(row, cols);
      if (!uid || byUser.has(uid)) continue;
      const seminar =
        cols.seminar >= 0 ? String(row[cols.seminar] || "") : cols.legacyUserIdOnly ? "" : String(row[2] || "");
      byUser.set(uid, {
        name: String(row[cols.name] || ""),
        email: String(row[cols.email] || ""),
        seminar,
        left: cols.left >= 0 ? checkboxCellValue(row[cols.left]) : "",
        arrived: cols.arrived >= 0 ? checkboxCellValue(row[cols.arrived]) : "",
        userId: uid,
      });
    }

    for (const row of rows) {
      const uid = row.userId.trim();
      const gold = row.goldClubSlug?.trim() || "";
      const maroon = row.maroonClubSlug?.trim() || "";
      const onThisClub = gold === slug || maroon === slug;
      if (!onThisClub) {
        byUser.delete(uid);
        continue;
      }
      const email = row.userEmail?.trim() || emailByUser.get(uid) || "";
      const prev = byUser.get(uid);
      byUser.set(uid, {
        name: row.displayName?.trim() || "Student",
        email,
        seminar: seminarLabel(slug, gold, maroon),
        left: prev?.left || "",
        arrived: prev?.arrived || "",
        userId: uid,
      });
    }

    const members = [...byUser.values()]
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      .map((m) => [m.name, m.email, m.seminar, m.left, m.arrived, m.userId]);
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${quoteTab(tab.tabTitle)}!A:F`,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(tab.tabTitle)}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [ROSTER_HEADER, ...members] },
    });
    await ensureClubTabAttendanceLayout(sheets, spreadsheetId, tab.sheetId, {
      memberCount: members.length,
    });
  }

  return { ok: true, tabs: tabs.size };
}

/**
 * @param {FirebaseFirestore.DocumentData} raw
 * @param {string} [id]
 */
function membershipFromAdminDoc(raw, id = "") {
  if (!raw || typeof raw !== "object") return null;
  const clubSlug = typeof raw.clubSlug === "string" ? raw.clubSlug.trim() : "";
  const userId = typeof raw.userId === "string" ? raw.userId.trim() : "";
  if (!clubSlug || !userId) return null;
  /** @type {string[]} */
  const memberGroups = Array.isArray(raw.memberGroups)
    ? raw.memberGroups.filter((g) => typeof g === "string" && g.trim()).map((g) => g.trim())
    : [];
  /** @type {("gold" | "maroon")[] | null} */
  let seminarDays = null;
  if (Array.isArray(raw.seminarDays)) {
    /** @type {("gold" | "maroon")[]} */
    const days = [];
    for (const item of raw.seminarDays) {
      if (item === "gold" && !days.includes("gold")) days.push("gold");
      if (item === "maroon" && !days.includes("maroon")) days.push("maroon");
    }
    seminarDays = days;
  }
  return {
    id,
    clubSlug,
    clubName: typeof raw.clubName === "string" ? raw.clubName.trim() : "",
    userId,
    userEmail: typeof raw.userEmail === "string" ? raw.userEmail.trim() : "",
    displayName: typeof raw.displayName === "string" ? raw.displayName.trim() : "",
    memberGroups,
    seminarDays,
  };
}

/**
 * Add/update one member on a club tab without rewriting everyone else.
 * @param {NonNullable<ReturnType<typeof getRosterSheetsApi>>} sheets
 * @param {string} spreadsheetId
 * @param {string} clubSlug
 * @param {{ userId: string, displayName: string, userEmail: string, seminar: string }} member
 */
async function upsertMemberOnClubTab(sheets, spreadsheetId, clubSlug, member) {
  let sheetProps = await ensureMetaTab(sheets, spreadsheetId);
  const tab = await ensureClubTab(sheets, spreadsheetId, sheetProps, clubSlug);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(tab.tabTitle)}!A:F`,
  });
  const values = res.values || [];
  const cols = parseRosterHeader(values[0] || []);
  /** @type {Map<string, string[]>} */
  const byUser = new Map();
  for (let i = 1; i < values.length; i += 1) {
    const row = values[i] || [];
    const uid = userIdFromRosterRow(row, cols);
    if (!uid || byUser.has(uid)) continue;
    const seminar =
      cols.seminar >= 0 ? String(row[cols.seminar] || "") : cols.legacyUserIdOnly ? "" : String(row[2] || "");
    byUser.set(uid, [
      String(row[cols.name] || ""),
      String(row[cols.email] || ""),
      seminar,
      cols.left >= 0 ? checkboxCellValue(row[cols.left]) : "",
      cols.arrived >= 0 ? checkboxCellValue(row[cols.arrived]) : "",
      uid,
    ]);
  }
  const prev = byUser.get(member.userId);
  byUser.set(member.userId, [
    member.displayName || "Member",
    member.userEmail || "",
    member.seminar,
    prev?.[3] || "",
    prev?.[4] || "",
    member.userId,
  ]);
  const members = [...byUser.values()].sort((a, b) =>
    String(a[0] || "").localeCompare(String(b[0] || "")),
  );
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${quoteTab(tab.tabTitle)}!A:F`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTab(tab.tabTitle)}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [ROSTER_HEADER, ...members] },
  });
  await ensureClubTabAttendanceLayout(sheets, spreadsheetId, tab.sheetId, {
    memberCount: members.length,
  });
  return { ok: true, tabTitle: tab.tabTitle, members: members.length };
}

/** @param {{ clubSlug?: string, userId?: string, displayName?: string, userEmail?: string }} member */
export async function syncClubRosterMemberJoin(member) {
  const clubSlug = member.clubSlug?.trim() || "";
  const userId = member.userId?.trim() || "";
  if (!clubSlug || !userId) return { ok: false, error: "Missing club or user." };
  if (!clubMeetsDuringSeminar(clubSlug)) return { ok: true, skipped: true };

  const ctx = getConfiguredRosterSheetsContext();
  if ("ok" in ctx && ctx.ok === false) {
    return ctx.skipped ? { ok: true, skipped: true } : { ok: false, error: ctx.error };
  }
  const { db, sheets, spreadsheetId } = ctx;

  await applyCustomClubsFromAdminDb(db);
  await applyMeetingDayOverridesFromAdminDb(db);

  const memSnap = await db
    .collection(CLUB_HUB_MEMBERSHIPS)
    .doc(`${clubSlug}__${userId}`)
    .get();
  const membership =
    membershipFromAdminDoc(memSnap.data(), memSnap.id) ||
    membershipFromAdminDoc(
      {
        clubSlug,
        userId,
        displayName: member.displayName || "",
        userEmail: member.userEmail || "",
      },
      `${clubSlug}__${userId}`,
    );
  const seminar = membership ? seminarLabelForMembership(membership) : "";
  if (!seminar) {
    return syncClubRosterMemberLeave({ clubSlug, userId });
  }

  return upsertMemberOnClubTab(sheets, spreadsheetId, clubSlug, {
    userId,
    displayName: membership?.displayName || member.displayName || "Member",
    userEmail: membership?.userEmail || member.userEmail || "",
    seminar,
  });
}

/** @param {{ clubSlug: string, userId: string }} args */
export async function syncClubRosterMemberLeave({ clubSlug, userId }) {
  return syncSeminarRostersForStudents([
    {
      userId,
      displayName: "Student",
      goldClubSlug: "",
      maroonClubSlug: "",
      previousSlugs: [clubSlug],
    },
  ]);
}

function claimTabTitle(name, slug, usedTitles) {
  let tabTitle = sanitizeSheetTabTitle(name || slug);
  if (usedTitles.has(tabTitle)) {
    tabTitle = sanitizeSheetTabTitle(`${tabTitle} (${slug.slice(0, 20)})`).slice(0, 100);
  }
  usedTitles.add(tabTitle);
  return tabTitle;
}

/**
 * @param {ReturnType<typeof getRosterSheetsApi>} sheets
 * @param {string} spreadsheetId
 * @param {Map<string, { tabTitle: string, sheetId: number }>} map
 */
async function replaceMetaRows(sheets, spreadsheetId, map) {
  const values = [["clubSlug", "tabTitle", "sheetId"]];
  for (const [slug, info] of map) {
    values.push([slug, info.tabTitle, String(info.sheetId)]);
  }
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${ROSTER_META_TAB}'!A:C`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${ROSTER_META_TAB}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

/**
 * @param {ReturnType<typeof getRosterSheetsApi>} sheets
 * @param {string} spreadsheetId
 */
async function removeGeneralClubTabs(sheets, spreadsheetId) {
  const sheetProps = await loadSpreadsheetSheetProps(sheets, spreadsheetId);
  const meta = await readMetaRows(sheets, spreadsheetId);
  const generalTitles = new Set(
    getSortedClubOptions()
      .filter((club) => !clubMeetsDuringSeminar(club.slug))
      .map((club) => sanitizeSheetTabTitle(club.name || club.slug)),
  );
  /** @type {Set<number>} */
  const deleteIds = new Set();
  /** @type {Set<string>} */
  const deletedSlugs = new Set();

  for (const [slug, info] of meta) {
    if (clubMeetsDuringSeminar(slug)) continue;
    if (sheetProps.some((prop) => prop.sheetId === info.sheetId)) deleteIds.add(info.sheetId);
    deletedSlugs.add(slug);
  }
  for (const prop of sheetProps) {
    if (!prop.title || prop.sheetId == null || HOME_SKIP_TABS.has(prop.title)) continue;
    if (generalTitles.has(prop.title)) deleteIds.add(prop.sheetId);
  }
  for (const slug of deletedSlugs) meta.delete(slug);

  const ids = [...deleteIds];
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: chunk.map((sheetId) => ({ deleteSheet: { sheetId } })) },
    });
  }
  if (deletedSlugs.size) await replaceMetaRows(sheets, spreadsheetId, meta);
  return ids.length;
}

/**
 * @param {ReturnType<typeof getRosterSheetsApi>} sheets
 * @param {string} spreadsheetId
 */
async function rebuildRosterHomeTab(sheets, spreadsheetId) {
  const sheetProps = await loadSpreadsheetSheetProps(sheets, spreadsheetId);
  let home = sheetProps.find((prop) => prop.title === HOME_TAB);
  if (home?.sheetId == null) {
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: HOME_TAB, index: 0 } } }],
      },
    });
    const sheetId = addRes.replies?.[0]?.addSheet?.properties?.sheetId;
    if (sheetId == null) throw new Error("Could not create the Home tab.");
    home = { title: HOME_TAB, sheetId };
  } else {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: { sheetId: home.sheetId, index: 0 },
              fields: "index",
            },
          },
        ],
      },
    });
  }

  const links = sheetProps
    .filter((prop) => prop.title && prop.sheetId != null && !prop.hidden && !HOME_SKIP_TABS.has(prop.title))
    .map((prop) => {
      const name = String(prop.title);
      const label = name.replace(/"/g, '""');
      return [name, `=HYPERLINK("#gid=${prop.sheetId}", "${label}")`];
    })
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), undefined, { sensitivity: "base" }));

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${quoteTab(HOME_TAB)}!A:B`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTab(HOME_TAB)}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [["Club", "Open roster"], ...links] },
  });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: home.sheetId,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: "gridProperties.frozenRowCount",
          },
        },
        {
          repeatCell: {
            range: { sheetId: home.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        },
        {
          autoResizeDimensions: {
            dimensions: { sheetId: home.sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 2 },
          },
        },
      ],
    },
  });
  await ensureReadOnlyTabProtection(sheets, spreadsheetId, home.sheetId);
  return links.length;
}

/** Delete a club's roster tab after the club is removed. */
export async function removeClubRosterTabBySlug(clubSlug) {
  const slug = clubSlug?.trim() || "";
  if (!slug) return { ok: false, error: "Missing club." };
  const ctx = getConfiguredRosterSheetsContext();
  if ("ok" in ctx && ctx.ok === false) {
    return ctx.skipped ? { ok: true, skipped: true } : { ok: false, error: ctx.error };
  }
  const { sheets, spreadsheetId } = ctx;
  await ensureMetaTab(sheets, spreadsheetId);
  const meta = await readMetaRows(sheets, spreadsheetId);
  const info = meta.get(slug);
  if (!info) return { ok: true, removed: false };
  const sheetProps = await loadSpreadsheetSheetProps(sheets, spreadsheetId);
  if (sheetProps.some((prop) => prop.sheetId === info.sheetId)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ deleteSheet: { sheetId: info.sheetId } }] },
    });
  }
  meta.delete(slug);
  await replaceMetaRows(sheets, spreadsheetId, meta);
  await rebuildRosterHomeTab(sheets, spreadsheetId);
  return { ok: true, removed: true };
}

/** Create a header-only tab for every seminar club that does not have one yet. */
export async function ensureAllClubRosterTabs() {
  const ctx = getConfiguredRosterSheetsContext();
  if ("ok" in ctx && ctx.ok === false) {
    return ctx.skipped
      ? { ok: false, error: "CLUB_ROSTER_SPREADSHEET_ID is not set." }
      : { ok: false, error: ctx.error || "Sheets client not configured." };
  }
  const { db, sheets, spreadsheetId } = ctx;

  await applyCustomClubsFromAdminDb(db);
  await applyMeetingDayOverridesFromAdminDb(db);
  await ensureMetaTab(sheets, spreadsheetId);
  const removed = await removeGeneralClubTabs(sheets, spreadsheetId);
  const sheetProps = await loadSpreadsheetSheetProps(sheets, spreadsheetId);
  const meta = await readMetaRows(sheets, spreadsheetId);
  const usedTitles = new Set(sheetProps.map((prop) => prop.title).filter(Boolean));
  const seminarClubs = getSortedClubOptions().filter((club) => clubMeetsDuringSeminar(club.slug));
  /** @type {{ slug: string, tabTitle: string, sheetId?: number, adopt: boolean }[]} */
  const missing = [];

  for (const club of seminarClubs) {
    const existing = meta.get(club.slug);
    if (existing && sheetProps.some((prop) => prop.sheetId === existing.sheetId)) continue;
    const preferred = sanitizeSheetTabTitle(club.name || club.slug);
    const existingSheet = sheetProps.find((prop) => prop.title === preferred);
    if (existingSheet?.sheetId != null) {
      missing.push({
        slug: club.slug,
        tabTitle: preferred,
        sheetId: existingSheet.sheetId,
        adopt: true,
      });
      continue;
    }
    missing.push({
      slug: club.slug,
      tabTitle: claimTabTitle(club.name, club.slug, usedTitles),
      adopt: false,
    });
  }

  /** @type {{ slug: string, tabTitle: string, sheetId: number }[]} */
  const created = [];
  const toCreate = missing.filter((row) => !row.adopt);
  for (let i = 0; i < toCreate.length; i += 40) {
    const chunk = toCreate.slice(i, i + 40);
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: chunk.map((row) => ({ addSheet: { properties: { title: row.tabTitle } } })),
      },
    });
    chunk.forEach((row, index) => {
      const sheetId = addRes.replies?.[index]?.addSheet?.properties?.sheetId;
      if (sheetId == null) throw new Error(`Could not create sheet tab for ${row.slug}.`);
      created.push({ slug: row.slug, tabTitle: row.tabTitle, sheetId });
    });
  }

  if (created.length) {
    await sheets.spreadsheets.values.batchUpdate({
      requestBody: {
        valueInputOption: "RAW",
        data: created.map((row) => ({
          range: `${quoteTab(row.tabTitle)}!A1:F1`,
          values: [ROSTER_HEADER],
        })),
      },
    });
    for (const row of created) {
      await ensureClubTabAttendanceLayout(sheets, spreadsheetId, row.sheetId);
    }
  }

  const adopted = missing.filter((row) => row.adopt && row.sheetId != null);
  for (const row of adopted) {
    if (row.sheetId == null) continue;
    await ensureClubTabAttendanceLayout(sheets, spreadsheetId, row.sheetId);
  }

  const metaRows = [
    ...created.map((row) => [row.slug, row.tabTitle, String(row.sheetId)]),
    ...adopted.map((row) => [row.slug, row.tabTitle, String(row.sheetId)]),
  ];
  if (metaRows.length) {
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
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${ROSTER_META_TAB}'!A:C`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: metaRows },
    });
  }

  const homeLinks = await rebuildRosterHomeTab(sheets, spreadsheetId);
  const upgraded = await upgradeRosterAttendanceColumns(sheets, spreadsheetId);
  const leftNotArrived = await rebuildLeftNotArrivedReport(sheets, spreadsheetId);
  const locks = await lockDownRosterSpreadsheet(sheets, spreadsheetId);
  return {
    ok: true,
    created: created.length,
    removed,
    clubs: seminarClubs.length,
    homeLinks,
    upgraded,
    leftNotArrived: leftNotArrived.rows,
    ...locks,
  };
}

/**
 * Ensure every seminar club tab has Left/Arrived headers + checkbox protection.
 * Migrates older 3- or 4-column layouts without dropping User IDs.
 * @param {ReturnType<typeof getRosterSheetsApi>} sheets
 * @param {string} spreadsheetId
 */
async function upgradeRosterAttendanceColumns(sheets, spreadsheetId) {
  const meta = await readMetaRows(sheets, spreadsheetId);
  let upgraded = 0;
  for (const [slug, info] of meta) {
    if (!clubMeetsDuringSeminar(slug)) continue;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteTab(info.tabTitle)}!A:F`,
    });
    const values = res.values || [];
    const cols = parseRosterHeader(values[0] || []);
    if (cols.left >= 0 && cols.arrived >= 0 && cols.userId === USER_ID_COLUMN) {
      continue;
    }

    /** @type {string[][]} */
    const members = [];
    for (let i = 1; i < values.length; i += 1) {
      const row = values[i] || [];
      const uid = userIdFromRosterRow(row, cols);
      if (!uid) continue;
      const seminar =
        cols.seminar >= 0 ? String(row[cols.seminar] || "") : cols.legacyUserIdOnly ? "" : String(row[2] || "");
      members.push([
        String(row[cols.name] || ""),
        String(row[cols.email] || ""),
        seminar,
        cols.left >= 0 ? checkboxCellValue(row[cols.left]) : "",
        cols.arrived >= 0 ? checkboxCellValue(row[cols.arrived]) : "",
        uid,
      ]);
    }
    members.sort((a, b) => String(a[0] || "").localeCompare(String(b[0] || "")));

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${quoteTab(info.tabTitle)}!A:F`,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(info.tabTitle)}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [ROSTER_HEADER, ...members] },
    });
    await ensureClubTabAttendanceLayout(sheets, spreadsheetId, info.sheetId, {
      memberCount: members.length,
    });
    upgraded += 1;
  }
  return upgraded;
}

/**
 * Rewrite every seminar club tab from clubHubMemberships (all members, not only
 * students who already have a meeting-choices doc).
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {NonNullable<ReturnType<typeof getRosterSheetsApi>>} sheets
 * @param {string} spreadsheetId
 */
async function rebuildAllSeminarRostersFromMemberships(db, sheets, spreadsheetId) {
  await applyCustomClubsFromAdminDb(db);
  await applyMeetingDayOverridesFromAdminDb(db);

  let sheetProps = await ensureMetaTab(sheets, spreadsheetId);
  const seminarClubs = getSortedClubOptions().filter((club) => clubMeetsDuringSeminar(club.slug));
  let memberRows = 0;

  for (const club of seminarClubs) {
    const tab = await ensureClubTab(sheets, spreadsheetId, sheetProps, club.slug);
    sheetProps = await loadSpreadsheetSheetProps(sheets, spreadsheetId);

    const [memSnap, sheetRes] = await Promise.all([
      db.collection(CLUB_HUB_MEMBERSHIPS).where("clubSlug", "==", club.slug).get(),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${quoteTab(tab.tabTitle)}!A:F`,
      }),
    ]);

    const values = sheetRes.values || [];
    const cols = parseRosterHeader(values[0] || []);
    /** @type {Map<string, { left: string, arrived: string }>} */
    const attendance = new Map();
    for (let i = 1; i < values.length; i += 1) {
      const row = values[i] || [];
      const uid = userIdFromRosterRow(row, cols);
      if (!uid || attendance.has(uid)) continue;
      attendance.set(uid, {
        left: cols.left >= 0 ? checkboxCellValue(row[cols.left]) : "",
        arrived: cols.arrived >= 0 ? checkboxCellValue(row[cols.arrived]) : "",
      });
    }

    /** @type {Map<string, string[]>} */
    const byUser = new Map();
    for (const doc of memSnap.docs) {
      const membership = membershipFromAdminDoc(doc.data(), doc.id);
      if (!membership) continue;
      const label = seminarLabelForMembership(membership);
      if (!label) continue;
      const prev = attendance.get(membership.userId);
      byUser.set(membership.userId, [
        membership.displayName || "Student",
        membership.userEmail || "",
        label,
        prev?.left || "",
        prev?.arrived || "",
        membership.userId,
      ]);
    }

    // Fill names/emails from users/ when membership doc is sparse.
    const missingProfile = [...byUser.entries()].filter(
      ([, row]) => !row[0] || row[0] === "Student" || !row[1],
    );
    for (let i = 0; i < missingProfile.length; i += 100) {
      const chunk = missingProfile.slice(i, i + 100);
      const profiles = await db.getAll(...chunk.map(([uid]) => db.collection("users").doc(uid)));
      for (const profile of profiles) {
        const row = byUser.get(profile.id);
        if (!row) continue;
        const data = profile.data() || {};
        if (!row[0] || row[0] === "Student") {
          row[0] = data.displayName?.trim() || row[0] || "Student";
        }
        if (!row[1]) row[1] = data.email?.trim() || "";
      }
    }

    const members = [...byUser.values()].sort((a, b) =>
      String(a[0] || "").localeCompare(String(b[0] || "")),
    );
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${quoteTab(tab.tabTitle)}!A:F`,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(tab.tabTitle)}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [ROSTER_HEADER, ...members] },
    });
    await ensureClubTabAttendanceLayout(sheets, spreadsheetId, tab.sheetId, {
      memberCount: members.length,
    });
    memberRows += members.length;
  }

  return { tabs: seminarClubs.length, memberRows };
}

/**
 * Rebuild the "Left not arrived" report: students with Left checked and Arrived unchecked.
 * @param {NonNullable<ReturnType<typeof getRosterSheetsApi>>} sheets
 * @param {string} spreadsheetId
 */
export async function rebuildLeftNotArrivedReport(sheets, spreadsheetId) {
  const sheetProps = await loadSpreadsheetSheetProps(sheets, spreadsheetId);
  let tab = sheetProps.find((prop) => prop.title === LEFT_NOT_ARRIVED_TAB);
  if (tab?.sheetId == null) {
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: LEFT_NOT_ARRIVED_TAB, index: 1 } } }],
      },
    });
    const sheetId = addRes.replies?.[0]?.addSheet?.properties?.sheetId;
    if (sheetId == null) throw new Error("Could not create Left not arrived tab.");
    tab = { title: LEFT_NOT_ARRIVED_TAB, sheetId };
  }

  const meta = await readMetaRows(sheets, spreadsheetId);
  /** @type {string[][]} */
  const rows = [];

  for (const [, info] of meta) {
    if (!sheetProps.some((prop) => prop.sheetId === info.sheetId)) continue;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteTab(info.tabTitle)}!A:F`,
    });
    const values = res.values || [];
    const cols = parseRosterHeader(values[0] || []);
    if (cols.left < 0 || cols.arrived < 0) continue;

    for (let i = 1; i < values.length; i += 1) {
      const row = values[i] || [];
      const left = checkboxCellValue(row[cols.left]);
      const arrived = checkboxCellValue(row[cols.arrived]);
      if (left !== "TRUE" || arrived === "TRUE") continue;
      rows.push([
        info.tabTitle,
        String(row[cols.name] || ""),
        String(row[cols.email] || ""),
        cols.seminar >= 0 ? String(row[cols.seminar] || "") : "",
      ]);
    }
  }

  rows.sort(
    (a, b) =>
      String(a[0] || "").localeCompare(String(b[0] || "")) ||
      String(a[1] || "").localeCompare(String(b[1] || "")),
  );

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${quoteTab(LEFT_NOT_ARRIVED_TAB)}!A:Z`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTab(LEFT_NOT_ARRIVED_TAB)}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [LEFT_NOT_ARRIVED_HEADER, ...rows] },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: tab.sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: LEFT_NOT_ARRIVED_HEADER.length,
            },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        },
        {
          updateSheetProperties: {
            properties: {
              sheetId: tab.sheetId,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: "gridProperties.frozenRowCount",
          },
        },
      ],
    },
  });
  await ensureReadOnlyTabProtection(sheets, spreadsheetId, tab.sheetId);

  return { rows: rows.length, sheetId: tab.sheetId };
}

/** Rebuild seminar rows, and make sure every club has a tab. */
export async function bootstrapClubRosterSpreadsheet() {
  if (!isClubRosterSheetSyncConfigured()) {
    return { ok: false, error: "CLUB_ROSTER_SPREADSHEET_ID is not set." };
  }
  const db = getAdminFirestore();
  if (!db) return { ok: false, error: "Admin Firestore unavailable." };
  const ctx = getConfiguredRosterSheetsContext();
  if ("ok" in ctx && ctx.ok === false) {
    return { ok: false, error: ctx.error || "Sheets client not configured." };
  }
  const { sheets, spreadsheetId } = ctx;

  const rebuilt = await rebuildAllSeminarRostersFromMemberships(db, sheets, spreadsheetId);
  const ensured = await ensureAllClubRosterTabs();
  if (!ensured.ok) return ensured;
  const leftNotArrived = await rebuildLeftNotArrivedReport(sheets, spreadsheetId);
  const locks = await lockDownRosterSpreadsheet(sheets, spreadsheetId);
  return {
    ok: true,
    tabs: rebuilt.tabs,
    clubs: rebuilt.memberRows,
    created: ensured.created,
    leftNotArrived: leftNotArrived.rows,
    ...locks,
  };
}

export { slugForClubName };
