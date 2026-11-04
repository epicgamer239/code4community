import { forumRoute } from "@/lib/school-forum/forumRoute";
import { changeConcernStatus, listStatusBoard } from "@/lib/school-forum/forumServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = forumRoute(async ({ db, ctx }) => ({ concerns: await listStatusBoard(db, ctx) }));

/** Body: { concernId, status, response } */
export const POST = forumRoute(async ({ db, ctx, body }) => changeConcernStatus(db, ctx, await body()));
