import { CONCERN_CATEGORIES, LIMITS } from "@/lib/school-forum/constants";
import { ForumError } from "@/lib/school-forum/errors";

const CATEGORY_VALUES = new Set(Object.values(CONCERN_CATEGORIES));

/**
 * Trim, drop control characters (keeping newlines), collapse runs of blank lines, and cap length.
 * @param {unknown} value
 * @param {number} max
 */
export function cleanText(value, max) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

export function isValidCategory(value) {
  return CATEGORY_VALUES.has(value);
}

/**
 * Validate a new concern or a moderator edit. Errors are keyed by field so the form can show
 * each one next to its input.
 * @param {{ title?: unknown, body?: unknown, category?: unknown }} input
 * @returns {{ title: string, body: string, category: string }}
 */
export function validateConcernInput(input) {
  const title = cleanText(input?.title, LIMITS.TITLE_MAX + 1);
  const body = cleanText(input?.body, LIMITS.BODY_MAX + 1);
  const category = typeof input?.category === "string" ? input.category : "";

  /** @type {Record<string, string>} */
  const fieldErrors = {};
  if (title.length < LIMITS.TITLE_MIN) {
    fieldErrors.title = `Give your concern a short title (at least ${LIMITS.TITLE_MIN} characters).`;
  } else if (title.length > LIMITS.TITLE_MAX) {
    fieldErrors.title = `Keep the title under ${LIMITS.TITLE_MAX} characters.`;
  }
  if (body.length < LIMITS.BODY_MIN) {
    fieldErrors.body = `Describe the concern in a bit more detail (at least ${LIMITS.BODY_MIN} characters).`;
  } else if (body.length > LIMITS.BODY_MAX) {
    fieldErrors.body = `Keep the description under ${LIMITS.BODY_MAX} characters.`;
  }
  if (!isValidCategory(category)) {
    fieldErrors.category = "Choose who could fix this.";
  }

  if (Object.keys(fieldErrors).length) {
    const err = new ForumError("Please fix the highlighted fields.");
    err.fieldErrors = fieldErrors;
    throw err;
  }
  return { title, body, category };
}

/** @param {unknown} reason */
export function validateRejectionReason(reason) {
  const text = cleanText(reason, LIMITS.REASON_MAX);
  if (text.length < 5) {
    throw new ForumError("Give the poster a short reason for the rejection.");
  }
  return text;
}
