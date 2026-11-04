import { CONCERN_STATES } from "@/lib/school-forum/constants";
import { ForumError, forbidden, notFound } from "@/lib/school-forum/errors";
import { FORUM_ACTIONS, forumCan } from "@/lib/school-forum/permissions";

export const MODERATION_ACTIONS = {
  APPROVE: "approve",
  REJECT: "reject",
  EDIT: "edit",
  MERGE: "merge",
  SAFETY: "safety",
  SET_CATEGORY: "setCategory",
};

const S = CONCERN_STATES;

/** Concern states each action may start from. Safety-flagged posts belong to admins only. */
const ALLOWED_FROM = {
  [MODERATION_ACTIONS.APPROVE]: [S.PENDING],
  [MODERATION_ACTIONS.REJECT]: [S.PENDING, S.APPROVED],
  [MODERATION_ACTIONS.EDIT]: [S.PENDING, S.APPROVED],
  [MODERATION_ACTIONS.MERGE]: [S.PENDING, S.APPROVED],
  [MODERATION_ACTIONS.SAFETY]: [S.PENDING, S.APPROVED, S.REJECTED],
  [MODERATION_ACTIONS.SET_CATEGORY]: [S.PENDING, S.APPROVED],
};

/**
 * Throws unless `ctx` may perform `action` on `concern` (and `target`, for merges).
 * @param {import("@/lib/school-forum/permissions").ForumContext} ctx
 * @param {{ schoolId: string, state: string } | null} concern
 * @param {string} action
 * @param {{ id: string, schoolId: string, state: string } | null} [target]
 */
export function assertCanModerate(ctx, concern, action, target = null) {
  if (!forumCan(ctx, FORUM_ACTIONS.MODERATE)) {
    throw forbidden("Only SCA moderators and admins can moderate posts.");
  }
  if (!concern || concern.schoolId !== ctx.schoolId) throw notFound();

  const allowed = ALLOWED_FROM[action];
  if (!allowed) throw new ForumError("Unknown moderation action.");
  if (!allowed.includes(concern.state)) {
    if (concern.state === S.SAFETY) {
      throw forbidden("This post is flagged as a safety concern and is handled by admins only.");
    }
    throw new ForumError(`This post can't be changed that way while it is ${concern.state}.`, 409);
  }

  if (action === MODERATION_ACTIONS.MERGE) {
    if (!target || target.schoolId !== ctx.schoolId) {
      throw notFound("The concern to merge into could not be found.");
    }
    if (target.id === concern.id) throw new ForumError("A concern can't be merged into itself.");
    if (target.state !== S.APPROVED) {
      throw new ForumError("You can only merge into a concern that is already on the board.", 409);
    }
  }
}
