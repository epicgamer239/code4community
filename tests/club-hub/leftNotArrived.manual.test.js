import { describe, expect, it } from "vitest";
import { getConfiguredRosterSheetsContext } from "@/lib/club-hub/rosterSheetHelpers";
import { rebuildLeftNotArrivedReport } from "@/lib/club-hub/rosterSheetSync";

const run = process.env.RUN_LEFT_NOT_ARRIVED_REBUILD === "1";

describe.skipIf(!run)("left not arrived rebuild (manual)", () => {
  it("builds the report tab", async () => {
    const ctx = getConfiguredRosterSheetsContext();
    if ("ok" in ctx && ctx.ok === false) throw new Error(ctx.error || "not configured");
    const result = await rebuildLeftNotArrivedReport(ctx.sheets, ctx.spreadsheetId);
    expect(result.sheetId).toBeTypeOf("number");
    console.log("leftNotArrivedRows", result.rows);
  }, 300_000);
});
