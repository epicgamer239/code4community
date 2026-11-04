import { forumRoute } from "@/lib/school-forum/forumRoute";
import { listSafetyQueue, reviewSafetyConcern } from "@/lib/school-forum/forumServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = forumRoute(async ({ db, ctx }) => ({ concerns: await listSafetyQueue(db, ctx) }));

/** Body: { concernId, note } */
export const POST = forumRoute(async ({ db, ctx, body }) => reviewSafetyConcern(db, ctx, await body()));
