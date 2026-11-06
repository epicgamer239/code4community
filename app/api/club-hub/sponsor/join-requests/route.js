import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  listPendingJoinRequests,
  reviewClubJoinRequest,
} from "@/lib/club-hub/joinRequestsServer";
import {
  assertCanReviewClubJoinRequests,
  requireAuthFromBearerToken,
} from "@/lib/club-hub/sponsorAuthServer";
import { withRateLimit } from "@/utils/rateLimit";
import { runWithClubHubSchoolFromRequest } from "@/lib/club-hub/requestSchool";

export const runtime = "nodejs";

async function getHandler(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const clubSlug = request.nextUrl.searchParams.get("clubSlug")?.trim() || "";
  if (!clubSlug) {
    return NextResponse.json({ error: "Missing clubSlug." }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server Firebase is not configured." }, { status: 503 });
  }

  try {
    return await runWithClubHubSchoolFromRequest(request, null, async () => {
      const auth = await requireAuthFromBearerToken(token);
      await assertCanReviewClubJoinRequests({ ...auth, clubSlug });
      const requests = await listPendingJoinRequests(db, clubSlug);
      return NextResponse.json({ requests });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed.";
    const status = message.includes("Only a") || message.includes("permission") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

async function postHandler(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const clubSlug = typeof body.clubSlug === "string" ? body.clubSlug.trim() : "";
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const action = body.action === "approve" || body.action === "deny" ? body.action : "";
  if (!clubSlug || !userId || !action) {
    return NextResponse.json({ error: "Missing club, student, or action." }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server Firebase is not configured." }, { status: 503 });
  }

  try {
    return await runWithClubHubSchoolFromRequest(request, body, async () => {
      const auth = await requireAuthFromBearerToken(token);
      await assertCanReviewClubJoinRequests({ ...auth, clubSlug });
      const result = await reviewClubJoinRequest(db, { clubSlug, userId, action });
      if (!result.ok) {
        return NextResponse.json({ error: result.error || "Could not update the request." }, { status: 400 });
      }
      return NextResponse.json(result);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed.";
    const status = message.includes("Only a") || message.includes("permission") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = withRateLimit(getHandler, { preset: "syncWebhook" });
export const POST = withRateLimit(postHandler, { preset: "syncWebhook" });
