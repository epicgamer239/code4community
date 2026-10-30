import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { deriveMeetingChoicesForUserAdmin } from "@/lib/club-hub/meetingChoicesFromMembershipsAdmin";
import { syncStudentMeetingRowToSheet } from "@/lib/club-hub/meetingChoicesSheetSync";
import { isClubRosterSheetSyncConfigured } from "@/lib/club-hub/rosterSheetConfig";
import { withRateLimit } from "@/utils/rateLimit";

export const runtime = "nodejs";

async function handler(request) {
  if (!isClubRosterSheetSyncConfigured()) {
    return NextResponse.json({ ok: true, skipped: true });
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

  const { getAuth } = await import("firebase-admin/auth");
  let uid;
  let displayName = "Student";
  try {
    const decoded = await getAuth().verifyIdToken(token);
    uid = decoded.uid;
    displayName = decoded.name?.trim() || displayName;
  } catch {
    return NextResponse.json({ error: "Invalid auth token." }, { status: 401 });
  }

  const userSnap = await db.collection("users").doc(uid).get();
  if (userSnap.exists) {
    displayName = userSnap.data()?.displayName?.trim() || displayName;
  }

  const choices = await deriveMeetingChoicesForUserAdmin(db, uid);

  const result = await syncStudentMeetingRowToSheet({
    userId: uid,
    displayName,
    goldClubSlug: choices.goldClubSlug,
    maroonClubSlug: choices.maroonClubSlug,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Sheet sync failed." }, { status: 500 });
  }
  return NextResponse.json(result);
}

export const POST = withRateLimit(handler, { preset: "syncWebhook" });
