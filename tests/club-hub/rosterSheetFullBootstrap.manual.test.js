import { describe, expect, it } from "vitest";
import { bootstrapClubRosterSpreadsheet } from "@/lib/club-hub/rosterSheetSync";
import { bootstrapStudentMeetingTabFromFirestore } from "@/lib/club-hub/meetingChoicesSheetSync";

const run = process.env.RUN_CLUB_ROSTER_BOOTSTRAP === "1";

describe.skipIf(!run)("club roster + student meeting sheet bootstrap (manual)", () => {
  it("refreshes all club tabs and Student meeting clubs from Firestore", async () => {
    const roster = await bootstrapClubRosterSpreadsheet();
    expect(roster.ok).toBe(true);
    expect(roster.tabs).toBeGreaterThan(0);

    const meeting = await bootstrapStudentMeetingTabFromFirestore();
    expect(meeting.ok).toBe(true);
  }, 900_000);
});
