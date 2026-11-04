import { ForumError } from "@/lib/school-forum/errors";
import { forumRoute } from "@/lib/school-forum/forumRoute";
import {
  closeCycleNow,
  createCycle,
  listCycles,
  setPresentationFlag,
} from "@/lib/school-forum/forumServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = forumRoute(async ({ db, ctx }) => ({ cycles: await listCycles(db, ctx) }));

/** Body: { action: "create" | "close" | "flag", ... } */
export const POST = forumRoute(async ({ db, ctx, body }) => {
  const input = await body();
  switch (input.action) {
    case "create":
      return createCycle(db, ctx, input);
    case "close":
      return closeCycleNow(db, ctx, input);
    case "flag":
      return setPresentationFlag(db, ctx, input);
    default:
      throw new ForumError("Unknown cycle action.");
  }
});
