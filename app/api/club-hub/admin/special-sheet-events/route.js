import { NextResponse } from "next/server";
import { requireClubHubAdminFromRequest } from "@/lib/club-hub/clubHubAdminRouteAuth";
import {
  createSpecialSheetEvent,
  listSpecialSheetEvents,
} from "@/lib/club-hub/specialSheetEventsServer";
import { syncSpecialSheetEventsToStudentMeetingTab } from "@/lib/club-hub/specialSheetEventsSheetSync";
import { isClubRosterSheetSyncConfigured } from "@/lib/club-hub/rosterSheetConfig";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const auth = await requireClubHubAdminFromRequest(request);
  if (auth.error) return auth.error;

  try {
    const events = await listSpecialSheetEvents(auth.db);
    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Could not load special events." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const auth = await requireClubHubAdminFromRequest(request);
  if (auth.error) return auth.error;

  /** @type {{ title?: string, meetingSlot?: string, studentListPaste?: string }} */
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const created = await createSpecialSheetEvent(auth.db, {
      title: body.title || "",
      studentListPaste: body.studentListPaste || "",
      createdByEmail: auth.email,
      createdByUid: auth.uid,
    });

    let sheetSync = { ok: true, skipped: true };
    if (isClubRosterSheetSyncConfigured()) {
      sheetSync = await syncSpecialSheetEventsToStudentMeetingTab();
      if (!sheetSync.ok) {
        return NextResponse.json(
          {
            event: created,
            warning: sheetSync.error || "Event saved but sheet sync failed.",
          },
          { status: 502 },
        );
      }
    }

    return NextResponse.json({
      event: created,
      sheetSync,
      unmatchedEmails: created.unmatchedEmails || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Could not create special event." },
      { status: 400 },
    );
  }
}
