import { forumRoute } from "@/lib/school-forum/forumRoute";
import { revealPosterIdentity } from "@/lib/school-forum/forumServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Admin only, logged. POST (not GET) so the reveal never lands in URLs or caches. Body: { concernId, reason } */
export const POST = forumRoute(async ({ db, ctx, body }) => ({
  poster: await revealPosterIdentity(db, ctx, await body()),
}));
