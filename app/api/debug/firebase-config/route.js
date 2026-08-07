import { getFirebaseConfigDebug } from "@/lib/firebase/config";
import { withRateLimit } from "@/utils/rateLimit";

export const dynamic = "force-dynamic";

async function debugHandler() {
  return Response.json(getFirebaseConfigDebug(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export const GET = withRateLimit(debugHandler, { preset: "debug" });
