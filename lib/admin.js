import { normalizeEmail } from "@/lib/email";
import adminEmails from "@/config/admin-emails.json";

/**
 * Admin configuration (Math Lab tutor management, hardcoded admin checks).
 * Canonical list: config/admin-emails.json (validated by scripts/check-admin-emails.js).
 */

export const ADMIN_CONFIG = {
  ADMIN_EMAILS: adminEmails,
  PERMISSIONS: {
    MANAGE_TUTORS: "manage_tutors",
    VIEW_ALL_SESSIONS: "view_all_sessions",
    MANAGE_USERS: "manage_users",
  },
};

/** @param {string | null | undefined} email */
export const isAdminEmail = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return ADMIN_CONFIG.ADMIN_EMAILS.some((e) => normalizeEmail(e) === normalized);
};

/** Built-in admins — cannot be removed or demoted via the admin dashboard. */
export const isProtectedAdminEmail = isAdminEmail;

/** @param {string | null | undefined} email */
export const canRemoveTeamPrivileges = (email) => {
  return !isProtectedAdminEmail(email);
};

export const getAdminConfig = () => ADMIN_CONFIG;
