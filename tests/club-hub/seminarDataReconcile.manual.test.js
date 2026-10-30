import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { reconcileAllSeminarDataAdmin } from "@/lib/club-hub/seminarDataReconcileAdmin";
import { bootstrapClubRosterSpreadsheet } from "@/lib/club-hub/rosterSheetSync";
import { bootstrapStudentMeetingTabFromFirestore } from "@/lib/club-hub/meetingChoicesSheetSync";

const run = process.env.RUN_SEMINAR_DATA_RECONCILE === "1";

describe.skipIf(!run)("reconcile seminar memberships + meeting choices (manual)", () => {
  it("trims multi-slot memberships, syncs choices, refreshes sheets", async () => {
    const db = getAdminFirestore();
    expect(db).toBeTruthy();

    const dry = await reconcileAllSeminarDataAdmin(db, { dryRun: true });
    expect(dry.ok).toBe(true);
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          users: dry.users,
          membershipDeletes: dry.membershipDeletes,
          seminarDayUpdates: dry.seminarDayUpdates,
          choiceWrites: dry.choiceWrites,
        },
        null,
        2,
      ),
    );

    const applied = await reconcileAllSeminarDataAdmin(db, { dryRun: false });
    expect(applied.ok).toBe(true);

    mkdirSync(join(process.cwd(), "backups"), { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = join(
      process.cwd(),
      "backups",
      `club-hub-seminar-reconcile-${stamp}.json`,
    );
    writeFileSync(
      backupPath,
      JSON.stringify(
        {
          project: "code4community26",
          createdAt: new Date().toISOString(),
          applied,
        },
        null,
        2,
      ),
    );
    console.log("backup", backupPath);

    const roster = await bootstrapClubRosterSpreadsheet();
    expect(roster.ok).toBe(true);
    const meeting = await bootstrapStudentMeetingTabFromFirestore();
    expect(meeting.ok).toBe(true);
  }, 900_000);
});
