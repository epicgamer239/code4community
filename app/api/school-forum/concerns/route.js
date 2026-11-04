import { forumRoute } from "@/lib/school-forum/forumRoute";
import { submitConcern } from "@/lib/school-forum/forumServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = forumRoute(
  async ({ db, ctx, body }) => ({ concern: await submitConcern(db, ctx, await body()) }),
  { preset: "schoolForumPost" },
);
