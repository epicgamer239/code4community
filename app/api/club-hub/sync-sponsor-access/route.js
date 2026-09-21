import { syncSponsorAccessForAuthToken } from "@/lib/club-hub/syncSponsorAccessServer";

export const dynamic = "force-dynamic";

/**
 * Sync directory-based sponsor club access for the signed-in user.
 * Uses Admin SDK so sponsors cannot self-grant arbitrary clubs.
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return Response.json({ error: "Missing auth token." }, { status: 401 });
    }

    const result = await syncSponsorAccessForAuthToken(token);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json(
      { error: err?.message || "Could not sync sponsor access." },
      { status: 500 },
    );
  }
}
