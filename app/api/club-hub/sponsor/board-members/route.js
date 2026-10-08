import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  addBoardMemberForClub,
  fetchBoardMembersForClub,
  removeBoardMemberForClub,
} from "@/lib/club-hub/boardMembersServer";
import {
  assertCanManageBoardMembersForClub,
  requireAuthFromBearerToken,
} from "@/lib/club-hub/sponsorAuthServer";
import { withRateLimit } from "@/utils/rateLimit";

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
    const auth = await requireAuthFromBearerToken(token);
    await assertCanManageBoardMembersForClub({ ...auth, clubSlug });
    const members = await fetchBoardMembersForClub(db, clubSlug);
    return NextResponse.json({ members });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed.";
    const status = message.includes("permission") ? 403 : 400;
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
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server Firebase is not configured." }, { status: 503 });
  }

  try {
    const auth = await requireAuthFromBearerToken(token);
    await assertCanManageBoardMembersForClub({ ...auth, clubSlug });
    const result = await addBoardMemberForClub(db, {
      clubSlug,
      memberEmail: email,
      displayName,
      actorUid: auth.uid,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed.";
    const status = message.includes("permission") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

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
  const email = typeof body.email === "string" ? body.email.trim() : "";

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server Firebase is not configured." }, { status: 503 });
  }

  try {
    const auth = await requireAuthFromBearerToken(token);
    await assertCanManageBoardMembersForClub({ ...auth, clubSlug });
    const result = await removeBoardMemberForClub(db, {
      clubSlug,
      memberEmail: email,
      actorUid: auth.uid,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed.";
    const status = message.includes("permission") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = withRateLimit(getHandler, { preset: "syncWebhook" });
export const POST = withRateLimit(postHandler, { preset: "syncWebhook" });
export const DELETE = withRateLimit(deleteHandler, { preset: "syncWebhook" });
