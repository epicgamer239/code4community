import { NextResponse } from "next/server";
import { requireClubHubAdminFromRequest } from "@/lib/club-hub/clubHubAdminRouteAuth";
import {
  listManualRankingsServer,
  setManualRankingSlugsServer,
} from "@/lib/club-hub/manualRankingsServer";
import { runWithClubHubSchoolFromRequest } from "@/lib/club-hub/requestSchool";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const auth = await requireClubHubAdminFromRequest(request);
  if (auth.error) return auth.error;

  try {
    return await runWithClubHubSchoolFromRequest(request, null, async () => {
      const rankings = await listManualRankingsServer(auth.db);
      return NextResponse.json({ rankings });
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Could not load rankings." },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  const auth = await requireClubHubAdminFromRequest(request);
  if (auth.error) return auth.error;

  /** @type {{ kind?: string, slugs?: unknown, schoolId?: string }} */
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    return await runWithClubHubSchoolFromRequest(request, body, async () => {
      const slugs = await setManualRankingSlugsServer(auth.db, {
        kind: body.kind || "",
        slugs: body.slugs,
        adminUid: auth.uid,
      });
      return NextResponse.json({ kind: body.kind, slugs });
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Could not save rankings." },
      { status: 400 },
    );
  }
}
