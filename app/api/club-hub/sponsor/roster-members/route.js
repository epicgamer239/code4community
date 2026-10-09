import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { removeClubMemberFromClub } from "@/lib/club-hub/membershipServer";
import {
  assertCanManageBoardMembersForClub,
  requireAuthFromBearerToken,
} from "@/lib/club-hub/sponsorAuthServer";
import { withRateLimit } from "@/utils/rateLimit";

export const runtime = "nodejs";

async function deleteHandler(request) {
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
  if (!clubSlug || !userId) {
    return NextResponse.json({ error: "Missing clubSlug or userId." }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server Firebase is not configured." }, { status: 503 });
  }

  try {
    const auth = await requireAuthFromBearerToken(token);
    await assertCanManageBoardMembersForClub({ ...auth, clubSlug });
    const result = await removeClubMemberFromClub(db, { clubSlug, userId });
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Remove failed." }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed.";
    const status = message.includes("permission") || message.includes("Only the") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export const DELETE = withRateLimit(deleteHandler, { preset: "syncWebhook" });
