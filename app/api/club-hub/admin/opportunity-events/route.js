import { NextResponse } from "next/server";
import { requireClubHubAdminFromRequest } from "@/lib/club-hub/clubHubAdminRouteAuth";
import {
  createClubHubOpportunityEvent,
  deleteClubHubOpportunityEvent,
  listClubHubOpportunityEvents,
} from "@/lib/club-hub/clubHubOpportunityEventsServer";
import { withRateLimit } from "@/utils/rateLimit";
import { runWithClubHubSchoolFromRequest } from "@/lib/club-hub/requestSchool";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getHandler(request) {
  const auth = await requireClubHubAdminFromRequest(request);
  if (auth.error) return auth.error;

  try {
    return await runWithClubHubSchoolFromRequest(request, null, async () => {
      const events = await listClubHubOpportunityEvents(auth.db, { publishedOnly: false });
      return NextResponse.json({ events });
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load events." },
      { status: 500 },
    );
  }
}

async function postHandler(request) {
  const auth = await requireClubHubAdminFromRequest(request);
  if (auth.error) return auth.error;

  /** @type {{ title?: string, description?: string, eventDate?: string, signUpUrl?: string, schoolId?: string }} */
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    return await runWithClubHubSchoolFromRequest(request, body, async () => {
      const event = await createClubHubOpportunityEvent(auth.db, {
        title: body.title || "",
        description: body.description || "",
        eventDate: body.eventDate || "",
        signUpUrl: body.signUpUrl || "",
        createdByEmail: auth.email,
        createdByUid: auth.uid,
      });
      return NextResponse.json({ event });
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create event." },
      { status: 400 },
    );
  }
}

async function deleteHandler(request) {
  const auth = await requireClubHubAdminFromRequest(request);
  if (auth.error) return auth.error;

  const eventId = request.nextUrl.searchParams.get("eventId")?.trim() || "";
  try {
    return await runWithClubHubSchoolFromRequest(request, null, async () => {
      const result = await deleteClubHubOpportunityEvent(auth.db, eventId);
      return NextResponse.json(result);
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not delete event." },
      { status: 400 },
    );
  }
}

export const GET = withRateLimit(getHandler, { preset: "syncWebhook" });
export const POST = withRateLimit(postHandler, { preset: "syncWebhook" });
export const DELETE = withRateLimit(deleteHandler, { preset: "syncWebhook" });
