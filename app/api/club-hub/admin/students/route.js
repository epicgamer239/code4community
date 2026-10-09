import { NextResponse } from "next/server";
import { requireClubHubAdminFromRequest } from "@/lib/club-hub/clubHubAdminRouteAuth";
import {
  adminSetStudentMeetingChoices,
  adminSetStudentSpecialEventEnrollment,
  getStudentHubProfileForAdmin,
  searchStudentsForAdmin,
} from "@/lib/club-hub/adminStudentHubServer";
import { removeClubMemberFromClub } from "@/lib/club-hub/membershipServer";
import { withRateLimit } from "@/utils/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getHandler(request) {
  const auth = await requireClubHubAdminFromRequest(request);
  if (auth.error) return auth.error;

  const userId = request.nextUrl.searchParams.get("userId")?.trim() || "";
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";

  try {
    if (userId) {
      const profile = await getStudentHubProfileForAdmin(auth.db, userId);
      return NextResponse.json(profile);
    }
    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }
    const results = await searchStudentsForAdmin(auth.db, q);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed." },
      { status: 500 },
    );
  }
}

async function postHandler(request) {
  const auth = await requireClubHubAdminFromRequest(request);
  if (auth.error) return auth.error;

  /** @type {{ action?: string, userId?: string, clubSlug?: string, goldClubSlug?: string, maroonClubSlug?: string, eventId?: string, enrolled?: boolean }} */
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "Missing userId." }, { status: 400 });
  }

  try {
    if (action === "removeMembership") {
      const clubSlug = typeof body.clubSlug === "string" ? body.clubSlug.trim() : "";
      if (!clubSlug) {
        return NextResponse.json({ error: "Missing clubSlug." }, { status: 400 });
      }
      const result = await removeClubMemberFromClub(auth.db, { clubSlug, userId });
      if (!result.ok) {
        return NextResponse.json({ error: result.error || "Remove failed." }, { status: 500 });
      }
      return NextResponse.json(result);
    }

    if (action === "setMeetingChoices") {
      const choices = await adminSetStudentMeetingChoices(auth.db, {
        userId,
        goldClubSlug: typeof body.goldClubSlug === "string" ? body.goldClubSlug : "",
        maroonClubSlug: typeof body.maroonClubSlug === "string" ? body.maroonClubSlug : "",
      });
      return NextResponse.json({ ok: true, meetingChoices: choices });
    }

    if (action === "setSpecialEventEnrollment") {
      const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
      if (!eventId) {
        return NextResponse.json({ error: "Missing eventId." }, { status: 400 });
      }
      const result = await adminSetStudentSpecialEventEnrollment(auth.db, {
        eventId,
        userId,
        enrolled: Boolean(body.enrolled),
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed." },
      { status: 400 },
    );
  }
}

export const GET = withRateLimit(getHandler, { preset: "syncWebhook" });
export const POST = withRateLimit(postHandler, { preset: "syncWebhook" });
