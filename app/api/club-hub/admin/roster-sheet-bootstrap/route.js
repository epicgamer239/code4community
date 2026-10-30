import { NextResponse } from "next/server";
import { requireClubHubAdminFromRequest } from "@/lib/club-hub/clubHubAdminRouteAuth";
import { bootstrapStudentMeetingTabFromFirestore } from "@/lib/club-hub/meetingChoicesSheetSync";
import { bootstrapClubRosterSpreadsheet } from "@/lib/club-hub/rosterSheetSync";
import { isClubRosterSheetSyncConfigured } from "@/lib/club-hub/rosterSheetConfig";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  if (!isClubRosterSheetSyncConfigured()) {
    return NextResponse.json(
      { error: "CLUB_ROSTER_SPREADSHEET_ID is not configured." },
      { status: 503 },
    );
  }

  const auth = await requireClubHubAdminFromRequest(request);
  if (auth.error) return auth.error;

  try {
    const [roster, meeting] = await Promise.all([
      bootstrapClubRosterSpreadsheet(),
      bootstrapStudentMeetingTabFromFirestore(),
    ]);
    if (!roster.ok) {
      return NextResponse.json({ error: roster.error || "Bootstrap failed." }, { status: 500 });
    }
    if (!meeting.ok) {
      return NextResponse.json(
        { error: meeting.error || "Student meeting tab bootstrap failed." },
        { status: 500 },
      );
    }
    return NextResponse.json({ ...roster, studentMeetingRows: meeting.rows });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Could not bootstrap roster sheet." },
      { status: 500 },
    );
  }
}
