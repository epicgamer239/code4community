import { requireClubHubAdminFromRequest } from "@/lib/club-hub/clubHubAdminRouteAuth";
import { refreshSponsorAccessForClubSlug } from "@/lib/club-hub/syncSponsorAccessServer";

export const dynamic = "force-dynamic";

/**
 * Admin-only: refresh directoryClubSlugs for all sponsors on a club after override save.
 */
export async function POST(request) {
  try {
    const auth = await requireClubHubAdminFromRequest(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return Response.json({ error: "Missing club slug." }, { status: 400 });
    }

    const results = await refreshSponsorAccessForClubSlug(auth.db, {
      slug,
      adminUid: auth.uid,
    });
    return Response.json({ ok: true, slug, synced: results.length, results });
  } catch (err) {
    return Response.json(
      { error: err?.message || "Could not refresh sponsor access." },
      { status: 500 },
    );
  }
}
