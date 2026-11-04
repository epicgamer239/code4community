import { LIMITS, PUBLIC_STATUSES } from "@/lib/school-forum/constants";
import { ForumError } from "@/lib/school-forum/errors";
import { cleanText } from "@/lib/school-forum/validation";

const VALID = new Set(Object.values(PUBLIC_STATUSES));
const RESPONSE_MIN = 10;

/**
 * Only Open → Presented may happen without an explanation. Every other change
 * (anything after Presented, or skipping straight past it) needs a public admin response.
 */
export function statusChangeRequiresResponse(from, to) {
  return !(from === PUBLIC_STATUSES.OPEN && to === PUBLIC_STATUSES.PRESENTED);
}

/**
 * @param {{ from: string, to: string, response?: unknown }} input
 * @returns {{ to: string, response: string, requiresResponse: boolean }}
 */
export function validateStatusChange({ from, to, response }) {
  const current = from || PUBLIC_STATUSES.OPEN;
  if (!VALID.has(to)) throw new ForumError("Choose a valid status.");
  if (to === current) throw new ForumError("The concern already has that status.");

  const text = cleanText(response, LIMITS.RESPONSE_MAX);
  const requiresResponse = statusChangeRequiresResponse(current, to);
  if (requiresResponse && text.length < RESPONSE_MIN) {
    throw new ForumError(
      "Write a short public response (at least 10 characters) explaining this status change.",
    );
  }
  return { to, response: text, requiresResponse };
}
