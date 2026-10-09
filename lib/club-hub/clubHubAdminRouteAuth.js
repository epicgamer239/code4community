import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { isClubHubAdminEmail } from "@/lib/club-hub/clubHubAdminServer";
import { normalizeEmail } from "@/lib/email";

/**
 * @param {Request} request
 */
export async function requireClubHubAdminFromRequest(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return { error: NextResponse.json({ error: "Missing auth token." }, { status: 401 }) };
  }

  const db = getAdminFirestore();
  if (!db) {
    return {
      error: NextResponse.json({ error: "Server Firebase is not configured." }, { status: 503 }),
    };
  }

  const { getAuth } = await import("firebase-admin/auth");
  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(token);
  } catch {
    return { error: NextResponse.json({ error: "Invalid auth token." }, { status: 401 }) };
  }

  const email = normalizeEmail(decoded.email);
  const uid = decoded.uid;
  if (!email || !uid || !(await isClubHubAdminEmail(db, email))) {
    return { error: NextResponse.json({ error: "Club Hub admin access required." }, { status: 403 }) };
  }

  return { db, email, uid };
}
