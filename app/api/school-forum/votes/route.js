import { forumRoute } from "@/lib/school-forum/forumRoute";
import { changeVote } from "@/lib/school-forum/forumServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Body: { concernId, action: "add" | "remove" } */
export const POST = forumRoute(async ({ db, ctx, body }) => changeVote(db, ctx, await body()));
