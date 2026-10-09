import { BROAD_RUN_EMAIL_TO_NAME } from "@/lib/club-hub/broadRunRoster";
import { normalizeEmail } from "@/lib/email";

/** @type {{ email: string, displayName: string }[] | null} */
let sortedRosterCache = null;

/** @returns {{ email: string, displayName: string }[]} */
export function getBroadRunRosterEntries() {
  if (sortedRosterCache) return sortedRosterCache;
  sortedRosterCache = Object.entries(BROAD_RUN_EMAIL_TO_NAME)
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
export function filterBroadRunRosterEntries(query) {
  const q = query.trim().toLowerCase();
  const all = getBroadRunRosterEntries();
  if (!q) return all;
  return all.filter(
    (row) => row.displayName.toLowerCase().includes(q) || row.email.toLowerCase().includes(q),
  );
}

/**
 * @param {string} query
 * @param {number} [limit]
 * @returns {{ email: string, displayName: string }[]}
 */
export function searchBroadRunRoster(query, limit = 12) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const results = [];
  for (const row of filterBroadRunRosterEntries(query)) {
    results.push(row);
    if (results.length >= limit) break;
  }
  return results;
}
