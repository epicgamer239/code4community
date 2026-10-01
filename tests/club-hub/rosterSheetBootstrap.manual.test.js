import { describe, expect, it } from "vitest";
import { bootstrapClubRosterSpreadsheet } from "@/lib/club-hub/rosterSheetSync";

const run = process.env.RUN_CLUB_ROSTER_BOOTSTRAP === "1";

describe.skipIf(!run)("club roster sheet bootstrap (manual)", () => {
  it("creates tabs and fills from Firestore", async () => {
    const result = await bootstrapClubRosterSpreadsheet();
    expect(result.ok).toBe(true);
    expect(result.tabs).toBeGreaterThan(0);
  }, 300_000);
});
