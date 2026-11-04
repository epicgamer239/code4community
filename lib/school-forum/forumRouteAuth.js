import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { isAdminEmail } from "@/lib/admin";
import { normalizeEmail } from "@/lib/email";
import { FORUM_COLLECTIONS } from "@/lib/school-forum/constants";
import { ForumError } from "@/lib/school-forum/errors";
import { resolveForumContext } from "@/lib/school-forum/permissions";

/**
 * Verify the caller's Firebase ID token and work out their forum school + role on the server.
 * The client never says which school or role it has.
 * @param {Request} request
 * @returns {Promise<{ db: import("firebase-admin/firestore").Firestore, ctx: import("@/lib/school-forum/permissions").ForumContext } | { error: Response }>}
 */
export async function requireForumContextFromRequest(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return { error: NextResponse.json({ error: "Sign in to use the forum." }, { status: 401 }) };
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
    return {
      error: NextResponse.json(
        { error: "Your session expired. Please sign in again." },
        { status: 401 },
      ),
    };
  }

  const email = normalizeEmail(decoded.email);
  if (!email || !decoded.uid) {
    return { error: NextResponse.json({ error: "Sign in to use the forum." }, { status: 401 }) };
  }

  const staffSnap = await db
    .collection(FORUM_COLLECTIONS.STAFF)
    .where("email", "==", email)
    .get();
  const ctx = resolveForumContext({
    uid: decoded.uid,
    email,
    staffRecords: staffSnap.docs.map((d) => d.data()),
    isSiteAdmin: isAdminEmail(email),
  });

  if (!ctx.schoolId && !ctx.isSiteAdmin) {
    return {
      error: NextResponse.json(
        {
          error:
            "The School Concerns Forum is only open to students on a participating school's roster.",
          code: "not-on-roster",
        },
        { status: 403 },
      ),
    };
  }

  return { db, ctx };
}

/** Turn a thrown error into a JSON response (ForumError messages are safe to show). */
export function forumErrorResponse(err, fallback = "Something went wrong. Please try again.") {
  if (err instanceof ForumError) {
    return NextResponse.json(
      { error: err.message, ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}) },
      { status: err.status },
    );
  }
  console.error("[school-forum]", err);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/** @param {Request} request */
export async function readJsonBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    throw new ForumError("Invalid request body.");
  }
}
