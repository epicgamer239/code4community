import { normalizeEmail, isValidEmail } from "@/lib/email";
import { isAdminEmail } from "@/lib/admin";

const LCPS_EMAIL_SUFFIX = "@lcps.org";

/** @param {string | null | undefined} email */
export function isLcpsOrgEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized.endsWith(LCPS_EMAIL_SUFFIX);
}

/**
 * @param {string | null | undefined} email
 * @param {Record<string, boolean> | null | undefined} externalAllowlist
 */
export function isSignupEmailAllowed(email, externalAllowlist = null) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) return false;
  if (isAdminEmail(normalized)) return true;
  if (isLcpsOrgEmail(normalized)) return true;
  return Boolean(externalAllowlist?.[normalized]);
}

/** @param {string | null | undefined} email @param {Record<string, boolean> | null | undefined} externalAllowlist */
export function signupEmailRejectionMessage(email, externalAllowlist = null) {
  if (isSignupEmailAllowed(email, externalAllowlist)) return "";
  return "Sign up is limited to @lcps.org school emails. If you need access with another email, ask a site admin to add you to the signup allowlist.";
}
