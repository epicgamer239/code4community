import { describe, expect, it } from "vitest";
import { getConfiguredRosterSheetsContext } from "@/lib/club-hub/rosterSheetHelpers";
import { lockDownRosterSpreadsheet } from "@/lib/club-hub/rosterSheetSync";

const run = process.env.RUN_LOCKDOWN_ROSTER === "1";

describe.skipIf(!run)("lock down roster spreadsheet (manual)", () => {
  it("protects all tabs; club tabs only allow Left/Arrived", async () => {
    const ctx = getConfiguredRosterSheetsContext();
    if ("ok" in ctx && ctx.ok === false) throw new Error(ctx.error || "not configured");
    const result = await lockDownRosterSpreadsheet(ctx.sheets, ctx.spreadsheetId);
    console.log(result);
    expect(result.lockedClubs + result.lockedReadOnly).toBeGreaterThan(0);
  }, 900_000);
});
