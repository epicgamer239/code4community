import { getAdminFirestore } from "@/lib/firebase/admin";
import { refreshSponsorAccessForClubSlug } from "@/lib/club-hub/syncSponsorAccessServer";
import { isClubHubAdminEmail } from "@/lib/club-hub/clubHubAdminServer";
import { normalizeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Admin-only: refresh directoryClubSlugs for all sponsors on a club after override save.
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return Response.json({ error: "Missing auth token." }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) {
      return Response.json({ error: "Server Firebase is not configured." }, { status: 503 });
    }

    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    const email = normalizeEmail(decoded.email);
    const uid = decoded.uid;
    if (!email || !uid || !(await isClubHubAdminEmail(db, email))) {
      return Response.json({ error: "Club Hub admin access required." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return Response.json({ error: "Missing club slug." }, { status: 400 });
    }

    const results = await refreshSponsorAccessForClubSlug(db, { slug, adminUid: uid });
    return Response.json({ ok: true, slug, synced: results.length, results });
  } catch (err) {
    return Response.json(
      { error: err?.message || "Could not refresh sponsor access." },
      { status: 500 },
    );
  }
}
