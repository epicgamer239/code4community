import { forumRoute } from "@/lib/school-forum/forumRoute";
import { listModerationQueue, moderateConcern } from "@/lib/school-forum/forumServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = forumRoute(({ db, ctx }) => listModerationQueue(db, ctx));

/** Body: { concernId, action: approve | reject | edit | merge | safety | setCategory, ... } */
export const POST = forumRoute(async ({ db, ctx, body }) => moderateConcern(db, ctx, await body()));
