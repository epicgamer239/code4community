import { normalizeEmail } from "@/lib/email";
import { FORUM_ROLES } from "@/lib/school-forum/constants";
import { getForumSchool, rosterSchoolIdForEmail } from "@/lib/school-forum/schools";

export const FORUM_ACTIONS = {
  VIEW_BOARD: "viewBoard",
  POST: "post",
  VOTE: "vote",
  MODERATE: "moderate",
  FLAG_FOR_PRESENTATION: "flagForPresentation",
  VIEW_SAFETY_QUEUE: "viewSafetyQueue",
  VIEW_IDENTITY: "viewIdentity",
  MANAGE_CYCLES: "manageCycles",
  CHANGE_STATUS: "changeStatus",
  VIEW_METRICS: "viewMetrics",
  MANAGE_STAFF: "manageStaff",
};

const A = FORUM_ACTIONS;

const STUDENT_ACTIONS = [A.VIEW_BOARD, A.POST, A.VOTE];
const MODERATOR_ACTIONS = [...STUDENT_ACTIONS, A.MODERATE, A.FLAG_FOR_PRESENTATION];
const ADMIN_ACTIONS = [
  ...MODERATOR_ACTIONS,
  A.VIEW_SAFETY_QUEUE,
  A.VIEW_IDENTITY,
  A.MANAGE_CYCLES,
  A.CHANGE_STATUS,
  A.VIEW_METRICS,
  A.MANAGE_STAFF,
];

const ROLE_ACTIONS = {
  [FORUM_ROLES.STUDENT]: new Set(STUDENT_ACTIONS),
  [FORUM_ROLES.MODERATOR]: new Set(MODERATOR_ACTIONS),
  [FORUM_ROLES.ADMIN]: new Set(ADMIN_ACTIONS),
};

/** Posting and voting are for students on the school roster (staff who aren't students can't). */
const ROSTER_ONLY_ACTIONS = new Set([A.POST, A.VOTE]);

const ROLE_RANK = {
  [FORUM_ROLES.STUDENT]: 1,
  [FORUM_ROLES.MODERATOR]: 2,
  [FORUM_ROLES.ADMIN]: 3,
};

/**
 * @typedef {{
 *   uid: string,
 *   email: string,
 *   schoolId: string | null,
 *   role: "student" | "moderator" | "admin" | null,
 *   onRoster: boolean,
 *   isSiteAdmin: boolean,
 * }} ForumContext
 */

/**
 * Work out a signed-in user's forum school and role.
 * Staff appointments win over the roster; otherwise the roster decides the school.
 * Site admins with neither get no school (they can only appoint staff).
 *
 * @param {{ uid: string, email: string, staffRecords?: { schoolId?: string, role?: string }[], isSiteAdmin?: boolean }} input
 * @returns {ForumContext}
 */
export function resolveForumContext({ uid, email, staffRecords = [], isSiteAdmin = false }) {
  const normalized = normalizeEmail(email);
  const staff = staffRecords.find(
    (r) =>
      getForumSchool(r?.schoolId) &&
      (r.role === FORUM_ROLES.MODERATOR || r.role === FORUM_ROLES.ADMIN),
  );

  if (staff) {
    const school = getForumSchool(staff.schoolId);
    return {
      uid,
      email: normalized,
      schoolId: school.id,
      role: /** @type {"moderator" | "admin"} */ (staff.role),
      onRoster: school.isOnRoster(normalized),
      isSiteAdmin: Boolean(isSiteAdmin),
    };
  }

  const rosterSchoolId = rosterSchoolIdForEmail(normalized);
  return {
    uid,
    email: normalized,
    schoolId: rosterSchoolId,
    role: rosterSchoolId ? FORUM_ROLES.STUDENT : null,
    onRoster: Boolean(rosterSchoolId),
    isSiteAdmin: Boolean(isSiteAdmin),
  };
}

/**
 * @param {ForumContext | null | undefined} ctx
 * @param {string} action one of FORUM_ACTIONS
 */
export function forumCan(ctx, action) {
  if (!ctx) return false;
  // Site admins may appoint forum staff for any school, but get no other powers from that alone
  // (in particular, not poster identity).
  if (action === A.MANAGE_STAFF && ctx.isSiteAdmin) return true;
  if (!ctx.schoolId || !ctx.role) return false;
  const allowed = ROLE_ACTIONS[ctx.role];
  if (!allowed?.has(action)) return false;
  if (ROSTER_ONLY_ACTIONS.has(action) && !ctx.onRoster) return false;
  return true;
}

/**
 * @param {ForumContext | null | undefined} ctx
 * @param {"student" | "moderator" | "admin"} minRole
 */
export function hasForumRole(ctx, minRole) {
  if (!ctx?.role) return false;
  return (ROLE_RANK[ctx.role] ?? 0) >= (ROLE_RANK[minRole] ?? Infinity);
}

/** Capabilities the UI uses to show tabs and buttons (the server re-checks every action). */
export function forumCapabilities(ctx) {
  return Object.fromEntries(Object.values(A).map((action) => [action, forumCan(ctx, action)]));
}
