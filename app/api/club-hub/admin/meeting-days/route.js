import { NextResponse } from "next/server";
import { requireClubHubAdminFromRequest } from "@/lib/club-hub/clubHubAdminRouteAuth";
import { setClubMeetingDayAndClearSignups } from "@/lib/club-hub/clubMeetingDaysServer";
import { ensureAllClubRosterTabs } from "@/lib/club-hub/rosterSheetSync";
import { syncStudentMeetingRowsToSheet } from "@/lib/club-hub/meetingChoicesSheetSync";
import { withRateLimit } from "@/utils/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function postHandler(request) {
  const auth = await requireClubHubAdminFromRequest(request);
  if (auth.error) return auth.error;

  /** @type {{ slug?: string, clubName?: string, meetingDay?: string, reset?: boolean }} */
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await setClubMeetingDayAndClearSignups(auth.db, {
      slug: body.slug || "",
      clubName: body.clubName || "",
      meetingDay: body.meetingDay || "",
      adminUid: auth.uid,
      reset: Boolean(body.reset),
    });

    let sheetWarning = "";
    if (result.rows.length) {
      const sheet = await syncStudentMeetingRowsToSheet(result.rows);
      if (!sheet.ok) {
        sheetWarning =
          sheet.error || "Meeting day saved, but the Student meeting clubs sheet did not update.";
      }
    }
    try {
      const tabs = await ensureAllClubRosterTabs();
      if (!tabs.ok) {
        sheetWarning = sheetWarning || tabs.error || "Seminar roster tabs did not update.";
      }
    } catch (err) {
      sheetWarning =
        sheetWarning || (err instanceof Error ? err.message : "Seminar roster tabs did not update.");
    }

    return NextResponse.json({
      ok: true,
      meetingDay: result.meetingDay,
      cleared: result.rows.length,
      sheetWarning,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update meeting day." },
      { status: 400 },
    );
  }
}

export const POST = withRateLimit(postHandler, { preset: "syncWebhook" });
