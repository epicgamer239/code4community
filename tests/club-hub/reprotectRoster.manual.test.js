import { describe, expect, it } from "vitest";
import { getConfiguredRosterSheetsContext, loadSpreadsheetSheetProps } from "@/lib/club-hub/rosterSheetHelpers";
import { LEFT_NOT_ARRIVED_TAB, ROSTER_META_TAB } from "@/lib/club-hub/rosterSheetConfig";
import { rebuildLeftNotArrivedReport } from "@/lib/club-hub/rosterSheetSync";

const run = process.env.RUN_REPROTECT_ROSTER === "1";

describe.skipIf(!run)("reprotect roster ranges (manual)", () => {
  it("re-applies protection with extra editors on all club tabs", async () => {
    const ctx = getConfiguredRosterSheetsContext();
    if ("ok" in ctx && ctx.ok === false) throw new Error(ctx.error || "not configured");
    const { sheets, spreadsheetId } = ctx;

    // Import ensure via rebuilding left-not-arrived + calling layout through sync module internals:
    // Use values get member count then batchUpdate via public rebuildLeftNotArrivedReport
    // and upgrade path: call ensureAllClubRosterTabs which upgrades + left not arrived.
    // Faster: direct batch update using getRosterProtectedRangeEditors for each meta tab.
    const { getRosterProtectedRangeEditors } = await import("@/lib/club-hub/rosterSheetAuth");
    const {
      ROSTER_PROTECT_SYNC_DESC,
      ROSTER_PROTECT_UID_DESC,
      ROSTER_PROTECT_REPORT_DESC,
      ROSTER_LEFT_COLUMN,
      ROSTER_USER_ID_COLUMN,
    } = await import("@/lib/club-hub/rosterSheetConfig");
    const { loadSpreadsheetSheetsWithProtection } = await import("@/lib/club-hub/rosterSheetHelpers");

    const editors = getRosterProtectedRangeEditors();
    expect(editors).toContain("shail40926@gmail.com");

    const meta = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'_rosterMeta'!A2:C`,
    });
    const sheetIds = [];
    for (const row of meta.values || []) {
      const sheetId = Number(row[2]);
      if (Number.isFinite(sheetId)) sheetIds.push(sheetId);
    }

    const full = await loadSpreadsheetSheetsWithProtection(sheets, spreadsheetId);
    const leftTab = full.find((s) => s.properties?.title === LEFT_NOT_ARRIVED_TAB);
    if (leftTab?.properties?.sheetId != null) sheetIds.push(leftTab.properties.sheetId);

    let updated = 0;
    for (const sheetId of sheetIds) {
      const sheet = full.find((s) => s.properties?.sheetId === sheetId);
      const requests = [];
      for (const range of sheet?.protectedRanges || []) {
        const desc = range.description || "";
        if (
          (desc === ROSTER_PROTECT_SYNC_DESC ||
            desc === ROSTER_PROTECT_UID_DESC ||
            desc === ROSTER_PROTECT_REPORT_DESC) &&
          range.protectedRangeId != null
        ) {
          requests.push({ deleteProtectedRange: { protectedRangeId: range.protectedRangeId } });
        }
      }
      const isReport = sheet?.properties?.title === LEFT_NOT_ARRIVED_TAB;
      if (isReport) {
        requests.push({
          addProtectedRange: {
            protectedRange: {
              range: { sheetId, startColumnIndex: 0, endColumnIndex: 6 },
              description: ROSTER_PROTECT_REPORT_DESC,
              warningOnly: false,
              editors: { users: editors },
            },
          },
        });
      } else {
        requests.push(
          {
            addProtectedRange: {
              protectedRange: {
                range: { sheetId, startColumnIndex: 0, endColumnIndex: ROSTER_LEFT_COLUMN },
                description: ROSTER_PROTECT_SYNC_DESC,
                warningOnly: false,
                editors: { users: editors },
              },
            },
          },
          {
            addProtectedRange: {
              protectedRange: {
                range: {
                  sheetId,
                  startColumnIndex: ROSTER_USER_ID_COLUMN,
                  endColumnIndex: ROSTER_USER_ID_COLUMN + 1,
                },
                description: ROSTER_PROTECT_UID_DESC,
                warningOnly: false,
                editors: { users: editors },
              },
            },
          },
        );
      }
      await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
      updated += 1;
    }

    console.log("reprotectedTabs", updated, "editors", editors);
    expect(updated).toBeGreaterThan(0);
  }, 600_000);
});
