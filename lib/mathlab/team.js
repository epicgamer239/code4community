import { isProtectedAdminEmail } from "@/lib/admin";
import { normalizeEmail } from "@/lib/email";
import { getTutorServices, hasAnyTutorService } from "@/lib/tutorServices";

/** @typedef {{ id: string, email?: string, displayName?: string, role?: string, mathLabRole?: string, writingCenterRole?: string, services?: string[], pending?: boolean }} TeamUser */

/**
 * @param {TeamUser} user
 * @returns {'protected-admin' | 'appointed-admin' | 'teacher' | 'tutor' | 'other'}
 */
export function classifyTeamUser(user) {
  const email = normalizeEmail(user.email);
  if (isProtectedAdminEmail(email)) return "protected-admin";
  if (user.role === "admin") return "appointed-admin";
  if (user.role === "teacher") return "teacher";
  if (hasAnyTutorService(user)) return "tutor";
  return "other";
}

/**
 * @param {TeamUser[]} users
 */
export function partitionTeamUsers(users) {
  const protectedAdmins = [];
  const appointedAdmins = [];
  const teachers = [];
  const tutors = [];

  for (const user of users) {
    const kind = classifyTeamUser(user);
    if (kind === "protected-admin") protectedAdmins.push(user);
    else if (kind === "appointed-admin") appointedAdmins.push(user);
    else if (kind === "teacher") teachers.push(user);
    else if (kind === "tutor") {
      tutors.push({ ...user, services: getTutorServices(user) });
    }
  }

  const byName = (a, b) =>
    (a.displayName || a.email || "").localeCompare(b.displayName || b.email || "", undefined, {
      sensitivity: "base",
    });

  protectedAdmins.sort(byName);
  appointedAdmins.sort(byName);
  teachers.sort(byName);
  tutors.sort(byName);

  return { protectedAdmins, appointedAdmins, teachers, tutors };
}

export const normalizeTeamEmail = normalizeEmail;

/** @deprecated Prefer isValidEmail from @/lib/email — team invites accept any email domain. */
export function isValidLcpsEmail(email) {
  return /^[^\s@]+@lcps\.org$/i.test(normalizeEmail(email));
}

/** @param {Array<{ id: string, email?: string } & Record<string, unknown>>} users @param {string} email */
export function findUserByNormalizedEmail(users, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const match = users.find((u) => normalizeEmail(u.email) === normalized);
  if (!match) return null;
  const { id, ...rest } = match;
  return { id, ...rest };
}
