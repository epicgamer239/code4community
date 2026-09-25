import { isAdminEmail } from "@/lib/admin";
import { normalizeEmail } from "@/lib/email";

/**
 * Site super admins (config/admin-emails.json). Full access to /admin, Club Hub site tools, both products.
 * @param {{ email?: string, role?: string, mathLabAdmin?: boolean, writingCenterAdmin?: boolean } | null | undefined} userData
 * @param {string | null | undefined} [email]
 */
export function isSiteAdminUser(userData, email) {
  const normalized = normalizeEmail(email || userData?.email);
  return Boolean(normalized && isAdminEmail(normalized));
}

/** Appointed Math Lab admins used role=admin before product-scoped flags existed. */
export function isLegacyMathLabAdminRole(userData) {
  const role = (userData?.role || "").toLowerCase();
  if (role !== "admin") return false;
  return !isSiteAdminUser(userData, userData?.email);
}

/**
 * Math Lab team panel (/mathlab/admin) and Math Lab admin Firestore actions.
 * @param {{ email?: string, role?: string, mathLabAdmin?: boolean, writingCenterAdmin?: boolean } | null | undefined} userData
 * @param {string | null | undefined} [email]
 */
export function isMathLabAdminUser(userData, email) {
  if (isSiteAdminUser(userData, email)) return true;
  if (userData?.mathLabAdmin === true) return true;
  if (isLegacyMathLabAdminRole(userData)) return true;
  return false;
}

/**
 * Writing Center admin dashboard and WC admin Firestore actions.
 * @param {{ email?: string, role?: string, mathLabAdmin?: boolean, writingCenterAdmin?: boolean } | null | undefined} userData
 * @param {string | null | undefined} [email]
 */
export function isWritingCenterAdminUser(userData, email) {
  if (isSiteAdminUser(userData, email)) return true;
  if (userData?.writingCenterAdmin === true) return true;
  return false;
}

/**
 * Migrate legacy appointed site role=admin → mathLabAdmin on profile load.
 * @param {Record<string, unknown>} profile
 */
export function applyLegacyProductAdminMigration(profile) {
  if (!profile || typeof profile !== "object") return profile;
  if (!isLegacyMathLabAdminRole(profile)) return profile;
  return {
    ...profile,
    role: "student",
    mathLabAdmin: true,
  };
}
