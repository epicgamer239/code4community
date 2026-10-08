import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { isClubHubAdminEmail } from "@/lib/club-hub/clubHubAdminServer";
import {
  createSpecialSheetEvent,
  listSpecialSheetEvents,
} from "@/lib/club-hub/specialSheetEventsServer";
import { syncSpecialSheetEventsToStudentMeetingTab } from "@/lib/club-hub/specialSheetEventsSheetSync";
import { isClubRosterSheetSyncConfigured } from "@/lib/club-hub/rosterSheetConfig";
import { normalizeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireClubHubAdmin(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return { error: NextResponse.json({ error: "Missing auth token." }, { status: 401 }) };
  }

  const db = getAdminFirestore();
  if (!db) {
    return { error: NextResponse.json({ error: "Server Firebase is not configured." }, { status: 503 }) };
  }

  const { getAuth } = await import("firebase-admin/auth");
  const decoded = await getAuth().verifyIdToken(token);
  const email = normalizeEmail(decoded.email);
  const uid = decoded.uid;
  if (!email || !uid || !(await isClubHubAdminEmail(db, email))) {
    return { error: NextResponse.json({ error: "Club Hub admin access required." }, { status: 403 }) };
  }

  return { db, email, uid };
}

export async function GET(request) {
  const auth = await requireClubHubAdmin(request);
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
  const auth = await requireClubHubAdmin(request);
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
      meetingSlot: body.meetingSlot === "maroon" ? "maroon" : "gold",
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
