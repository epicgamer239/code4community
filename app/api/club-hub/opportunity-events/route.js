import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { listClubHubOpportunityEvents } from "@/lib/club-hub/clubHubOpportunityEventsServer";
import { withRateLimit } from "@/utils/rateLimit";
import { runWithClubHubSchoolFromRequest } from "@/lib/club-hub/requestSchool";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getHandler(request) {
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server unavailable." }, { status: 503 });
  }

  try {
    return await runWithClubHubSchoolFromRequest(request, null, async () => {
      const events = await listClubHubOpportunityEvents(db, { publishedOnly: true });
      return NextResponse.json({ events });
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load events." },
      { status: 500 },
    );
  }
}

export const GET = withRateLimit(getHandler, { preset: "syncWebhook" });
