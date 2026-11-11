import { lookupAclName } from "@/lib/acl/aclRoster";
import { lookupBroadRunName } from "@/lib/club-hub/broadRunRoster";
import { normalizeEmail } from "@/lib/email";

/**
 * Resolve a school-roster display name for an LCPS email.
 * Checks Broad Run and ACL (signup is site-wide; either campus may sign up).
 * @param {string | null | undefined} email
 * @returns {string | null}
 */
export function lookupLcpsRosterName(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return lookupBroadRunName(normalized) || lookupAclName(normalized) || null;
}

/**
 * True when the stored name is missing or still just the student ID local-part.
 * @param {string | null | undefined} displayName
 * @param {string | null | undefined} email
 */
export function isPlaceholderDisplayName(displayName, email) {
  const name = typeof displayName === "string" ? displayName.trim() : "";
  if (!name) return true;
  const local = normalizeEmail(email)?.split("@")[0] || "";
  return Boolean(local) && name.toLowerCase() === local.toLowerCase();
}
