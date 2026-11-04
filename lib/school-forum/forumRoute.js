import { NextResponse } from "next/server";
import {
  forumErrorResponse,
  readJsonBody,
  requireForumContextFromRequest,
} from "@/lib/school-forum/forumRouteAuth";
import {
  RATE_LIMIT_PRESETS,
  checkSlidingWindowRateLimit,
  rateLimitNextResponse,
} from "@/utils/rateLimit";

/** Forum responses can hold per-user data; never cache them anywhere. */
const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Wrap a forum API handler: verify the caller, resolve school + role on the server,
 * rate-limit per user, and turn ForumErrors into JSON.
 * @param {(args: { request: Request, db: any, ctx: import("@/lib/school-forum/permissions").ForumContext, body: () => Promise<any> }) => Promise<any>} handler
 * @param {{ preset?: "schoolForum" | "schoolForumPost" }} [options]
 */
export function forumRoute(handler, options = {}) {
  const preset = options.preset || "schoolForum";
  return async (request) => {
    const auth = await requireForumContextFromRequest(request);
    if (auth.error) return auth.error;

    const limit = checkSlidingWindowRateLimit({
      key: `forum:${preset}:${auth.ctx.uid}`,
      ...RATE_LIMIT_PRESETS[preset],
    });
    if (!limit.allowed) return rateLimitNextResponse(limit, NextResponse);

    try {
      const result = await handler({
        request,
        db: auth.db,
        ctx: auth.ctx,
        body: () => readJsonBody(request),
      });
      if (result instanceof Response) {
        result.headers.set("Cache-Control", NO_STORE["Cache-Control"]);
        return result;
      }
      return NextResponse.json(result ?? { ok: true }, { headers: NO_STORE });
    } catch (err) {
      const res = forumErrorResponse(err);
      res.headers.set("Cache-Control", NO_STORE["Cache-Control"]);
      return res;
    }
  };
}
