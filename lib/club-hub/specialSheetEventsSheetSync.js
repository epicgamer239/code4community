import { bootstrapStudentMeetingTabFromFirestore } from "@/lib/club-hub/meetingChoicesSheetSync";
import { isClubRosterSheetSyncConfigured } from "@/lib/club-hub/rosterSheetConfig";

/** After creating special events, rebuild the student meeting tab (including new columns). */
export async function syncSpecialSheetEventsToStudentMeetingTab() {
  if (!isClubRosterSheetSyncConfigured()) {
    return { ok: false, error: "CLUB_ROSTER_SPREADSHEET_ID is not set." };
  }
  return bootstrapStudentMeetingTabFromFirestore();
}
