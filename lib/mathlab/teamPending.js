import { isProtectedAdminEmail } from "@/lib/admin";
import { normalizeEmail } from "@/lib/email";
import {
  TUTOR_SERVICE,
  getTutorServices,
  normalizeTutorServices,
} from "@/lib/tutorServices";

export const MATHLAB_TEAM_PENDING_COLLECTION = "mathLabTeamPending";

/** @typedef {'tutor' | 'admin' | 'teacher'} TeamGrantType */

/** @param {string} email */
export function pendingTeamDocId(email) {
  return normalizeEmail(email);
}

/**
 * @param {{ grantType?: TeamGrantType, services?: string[] } | null | undefined} pending
 * @param {{ role?: string, mathLabRole?: string, writingCenterRole?: string }} profile
 * @param {string} email
 */
export function applyPendingGrantToProfile(pending, profile, email) {
  if (!pending?.grantType) return profile;
  if (isProtectedAdminEmail(email)) {
    return { ...profile, role: "admin" };
  }
  if (pending.grantType === "admin") {
    return { ...profile, role: "admin" };
  }
  if (pending.grantType === "teacher") {
    return { ...profile, role: "teacher" };
  }
  if (pending.grantType === "tutor") {
    const services = normalizeTutorServices(pending.services);
    // Legacy pending tutor docs (no services) → Math Lab only
    const effective =
      services.length > 0 ? services : [TUTOR_SERVICE.MATH_LAB];
    return {
      ...profile,
      mathLabRole: effective.includes(TUTOR_SERVICE.MATH_LAB)
        ? "tutor"
        : profile.mathLabRole || "",
      writingCenterRole: effective.includes(TUTOR_SERVICE.WRITING_CENTER)
        ? "tutor"
        : profile.writingCenterRole || "",
    };
  }
  return profile;
}

export function mergePendingIntoTeam(parts, pendingRows) {
  const appointedEmails = new Set(
    parts.appointedAdmins.map((u) => normalizeEmail(u.email)).filter(Boolean),
  );
  const teacherEmails = new Set(
    (parts.teachers || []).map((u) => normalizeEmail(u.email)).filter(Boolean),
  );
  const tutorEmails = new Set(parts.tutors.map((u) => normalizeEmail(u.email)).filter(Boolean));
  const protectedEmails = new Set(
    parts.protectedAdmins.map((u) => normalizeEmail(u.email)).filter(Boolean),
  );

  const appointedAdmins = [...parts.appointedAdmins];
  const teachers = [...(parts.teachers || [])];
  const tutors = [...parts.tutors];

  for (const row of pendingRows) {
    const email = normalizeEmail(row.email);
    if (!email || protectedEmails.has(email)) continue;
    if (row.grantType === "admin") {
      if (appointedEmails.has(email) || teacherEmails.has(email) || tutorEmails.has(email)) continue;
      appointedAdmins.push({ id: row.id, email, displayName: email, pending: true });
      appointedEmails.add(email);
    } else if (row.grantType === "teacher") {
      if (appointedEmails.has(email) || teacherEmails.has(email) || tutorEmails.has(email)) continue;
      teachers.push({ id: row.id, email, displayName: email, pending: true });
      teacherEmails.add(email);
    } else if (row.grantType === "tutor") {
      if (appointedEmails.has(email) || teacherEmails.has(email)) continue;
      const services = normalizeTutorServices(row.services);
      const effective = services.length > 0 ? services : [TUTOR_SERVICE.MATH_LAB];
      if (tutorEmails.has(email)) {
        const existing = tutors.find((u) => normalizeEmail(u.email) === email);
        if (existing) {
          existing.services = normalizeTutorServices([
            ...getTutorServices(existing),
            ...effective,
          ]);
          existing.pending = existing.pending || true;
        }
        continue;
      }
      tutors.push({
        id: row.id,
        email,
        displayName: email,
        pending: true,
        services: effective,
      });
      tutorEmails.add(email);
    }
  }

  const byName = (a, b) =>
    (a.displayName || a.email || "").localeCompare(b.displayName || b.email || "", undefined, {
      sensitivity: "base",
    });
  appointedAdmins.sort(byName);
  teachers.sort(byName);
  tutors.sort(byName);

  return { ...parts, appointedAdmins, teachers, tutors };
}
