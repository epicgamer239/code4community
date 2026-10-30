import { isAdminEmail } from "@/lib/admin";
import { normalizeEmail } from "@/lib/email";

export const isAdminByEmail = (email) => isAdminEmail(normalizeEmail(email));

/** Site super admin only (config allowlist). */
export const isAdminUser = (_userRole, email) => isAdminByEmail(email);

export const isTeacherOrAdmin = (userRole) =>
  userRole === "teacher" || userRole === "admin";

export const isTutorOrHigher = (userRole, mathLabRole = null) => {
  // Math Lab tutoring is mathLabRole (or teacher/admin). role===tutor is Writing Center only.
  if (userRole === "teacher" || userRole === "admin") return true;
  return mathLabRole === "tutor";
};
