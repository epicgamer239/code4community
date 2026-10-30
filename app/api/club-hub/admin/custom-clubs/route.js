import { NextResponse } from "next/server";
import { requireClubHubAdminFromRequest } from "@/lib/club-hub/clubHubAdminRouteAuth";
import { createCustomClub, deleteCustomClub } from "@/lib/club-hub/customClubsServer";
import { syncStudentMeetingRowsToSheet } from "@/lib/club-hub/meetingChoicesSheetSync";
import { removeClubRosterTabBySlug } from "@/lib/club-hub/rosterSheetSync";
import { withRateLimit } from "@/utils/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function postHandler(request) {
  const auth = await requireClubHubAdminFromRequest(request);
  if (auth.error) return auth.error;

  /** @type {{ name?: string, meetingDay?: string, sponsors?: { name?: string, email?: string }[] }} */
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const club = await createCustomClub(auth.db, {
      name: body.name || "",
      meetingDay: body.meetingDay || "",
      sponsors: body.sponsors || [],
      adminUid: auth.uid,
    });
    return NextResponse.json({ ok: true, club });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create club." },
      { status: 400 },
    );
  }
}

async function deleteHandler(request) {
  const auth = await requireClubHubAdminFromRequest(request);
  if (auth.error) return auth.error;

  /** @type {{ slug?: string, confirmation?: string }} */
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await deleteCustomClub(auth.db, {
      slug: body.slug || "",
      confirmation: body.confirmation || "",
      adminUid: auth.uid,
    });

    let sheetWarning = "";
    if (result.meetingRows.length) {
      const sheet = await syncStudentMeetingRowsToSheet(result.meetingRows);
      if (!sheet.ok) {
        sheetWarning =
          sheet.error || "Club deleted, but the Student meeting clubs sheet did not update.";
      }
    }
    try {
      const tabs = await removeClubRosterTabBySlug(result.club.slug);
      if (!tabs.ok) {
        sheetWarning = sheetWarning || tabs.error || "Club roster tab did not update.";
      }
    } catch (err) {
      sheetWarning =
        sheetWarning || (err instanceof Error ? err.message : "Club roster tab did not update.");
    }

    return NextResponse.json({
      ok: true,
      club: result.club,
      cleared: result.meetingRows.length,
      sheetWarning,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not delete club." },
      { status: 400 },
    );
  }
}

export const POST = withRateLimit(postHandler, { preset: "syncWebhook" });
export const DELETE = withRateLimit(deleteHandler, { preset: "syncWebhook" });
