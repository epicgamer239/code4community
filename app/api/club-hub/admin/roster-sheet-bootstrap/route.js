import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { isClubHubAdminEmail } from "@/lib/club-hub/clubHubAdminServer";
import { bootstrapStudentMeetingTabFromFirestore } from "@/lib/club-hub/meetingChoicesSheetSync";
import { bootstrapClubRosterSpreadsheet } from "@/lib/club-hub/rosterSheetSync";
import { isClubRosterSheetSyncConfigured } from "@/lib/club-hub/rosterSheetConfig";
import { normalizeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  if (!isClubRosterSheetSyncConfigured()) {
    return NextResponse.json(
      { error: "CLUB_ROSTER_SPREADSHEET_ID is not configured." },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server Firebase is not configured." }, { status: 503 });
  }

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    const email = normalizeEmail(decoded.email);
    if (!email || !(await isClubHubAdminEmail(db, email))) {
      return NextResponse.json({ error: "Club Hub admin access required." }, { status: 403 });
    }

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
