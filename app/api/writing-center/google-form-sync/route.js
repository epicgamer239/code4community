import { NextResponse } from "next/server";
import { createSessionFromGoogleForm } from "@/lib/writing-center/googleFormSync";
import { withRateLimit } from "@/utils/rateLimit";

export const runtime = "nodejs";

function verifySecret(request) {
  const expected = process.env.WRITING_CENTER_GOOGLE_FORM_SYNC_SECRET;
  if (!expected) return false;

  const auth = request.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) {
    return auth.slice(7) === expected;
  }

  return request.headers.get("x-wc-sync-secret") === expected;
}

async function syncHandler(request) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await createSessionFromGoogleForm({
    responseId: body.responseId,
    submittedAt: body.submittedAt,
    fields: body.fields,
    googleFormId: body.googleFormId,
    googleFormApiResponseId: body.googleFormApiResponseId,
    googleFormResponseUrl: body.googleFormResponseUrl,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      success: true,
      duplicate: result.duplicate || false,
      sessionId: result.sessionId || null,
    },
    { status: result.status }
  );
}

export const POST = withRateLimit(syncHandler, { preset: "syncWebhook" });
