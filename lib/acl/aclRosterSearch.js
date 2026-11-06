import { ACL_EMAIL_TO_NAME } from "@/lib/acl/aclRoster";
import { normalizeEmail } from "@/lib/email";

/** @type {{ email: string, displayName: string }[] | null} */
let sortedRosterCache = null;

/** @returns {{ email: string, displayName: string }[]} */
export function getAclRosterEntries() {
  if (sortedRosterCache) return sortedRosterCache;
  sortedRosterCache = Object.entries(ACL_EMAIL_TO_NAME)
    .map(([rawEmail, name]) => ({
      email: normalizeEmail(rawEmail) || rawEmail,
      displayName: name,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  return sortedRosterCache;
}

/**
 * @param {string} query
 * @returns {{ email: string, displayName: string }[]}
 */
export function filterAclRosterEntries(query) {
  const q = query.trim().toLowerCase();
  const all = getAclRosterEntries();
  if (!q) return all;
  return all.filter(
    (row) => row.displayName.toLowerCase().includes(q) || row.email.toLowerCase().includes(q),
  );
}

/**
 * @param {string} query
 * @param {number} [limit]
 * @returns {{ email: string, name: string, displayName: string }[]}
 */
export function searchAclRoster(query, limit = 12) {
  const q = String(query || "").trim().toLowerCase();
  if (q.length < 2) return [];
  const out = [];
  for (const row of filterAclRosterEntries(query)) {
    out.push({ email: row.email, name: row.displayName, displayName: row.displayName });
    if (out.length >= limit) break;
  }
  return out;
}
