import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  CLUB_HUB_MEMBERSHIPS,
  clubMembershipDocId,
  normalizeClubMembership,
} from "@/lib/club-hub/clubMemberships";
import { syncStudentMeetingRowAfterClubLeave } from "@/lib/club-hub/meetingChoicesSheetSync";
import {
  syncClubRosterMemberJoin,
  syncClubRosterMemberLeave,
} from "@/lib/club-hub/rosterSheetSync";
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = body.action === "leave" ? "leave" : body.action === "join" ? "join" : "";
  const clubSlug = typeof body.clubSlug === "string" ? body.clubSlug.trim() : "";
  if (!action || !clubSlug) {
    return NextResponse.json({ error: "Missing action or clubSlug." }, { status: 400 });
  }

  const { getAuth } = await import("firebase-admin/auth");
  let uid;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid auth token." }, { status: 401 });
  }

  const membershipRef = db.collection(CLUB_HUB_MEMBERSHIPS).doc(clubMembershipDocId(clubSlug, uid));
  const membershipSnap = await membershipRef.get();

  if (action === "join") {
    if (!membershipSnap.exists) {
      return NextResponse.json({ error: "Membership not found." }, { status: 403 });
    }
    const row = normalizeClubMembership({ ...membershipSnap.data(), id: membershipSnap.id });
    if (!row) {
      return NextResponse.json({ error: "Invalid membership." }, { status: 500 });
    }
    const result = await syncClubRosterMemberJoin({
      clubSlug,
      userId: row.userId,
      displayName: row.displayName,
      userEmail: row.userEmail,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Sheet sync failed." }, { status: 500 });
    }
    return NextResponse.json(result);
  }

  if (membershipSnap.exists) {
    return NextResponse.json({ error: "Still a member." }, { status: 403 });
  }

  const result = await syncClubRosterMemberLeave({ clubSlug, userId: uid });
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Sheet sync failed." }, { status: 500 });
  }
  return NextResponse.json(result);
}

export const POST = withRateLimit(handler, { preset: "syncWebhook" });
