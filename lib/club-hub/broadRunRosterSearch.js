import { BROAD_RUN_EMAIL_TO_NAME } from "@/lib/club-hub/broadRunRoster";
import { normalizeEmail } from "@/lib/email";

/**
 * @param {string} query
 * @param {number} [limit]
 * @returns {{ email: string, displayName: string }[]}
 */
export function searchBroadRunRoster(query, limit = 12) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  /** @type {{ email: string, displayName: string }[]} */
  const results = [];
  for (const [rawEmail, name] of Object.entries(BROAD_RUN_EMAIL_TO_NAME)) {
    const email = normalizeEmail(rawEmail) || rawEmail;
    if (!email.includes(q) && !name.toLowerCase().includes(q)) continue;
    results.push({ email, displayName: name });
    if (results.length >= limit) break;
  }
  return results;
}
