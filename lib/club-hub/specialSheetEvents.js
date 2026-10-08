import { normalizeEmail, isValidEmail } from "@/lib/email";

export const CLUB_HUB_SPECIAL_SHEET_EVENTS = "clubHubSpecialSheetEvents";

/** @typedef {"gold" | "maroon"} SpecialSheetMeetingSlot */

/**
 * @param {string} raw
 * @returns {string[]}
 */
export function parseStudentEmailPaste(raw) {
  if (!raw?.trim()) return [];
  const parts = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  /** @type {string[]} */
  const emails = [];
  const seen = new Set();
  for (const part of parts) {
    const match = part.match(/[\w.+-]+@[\w.-]+\.\w+/);
    const candidate = normalizeEmail(match ? match[0] : part);
    if (!candidate || !isValidEmail(candidate)) continue;
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    emails.push(candidate);
  }
  return emails;
}

/**
 * @param {string} title
 * @param {SpecialSheetMeetingSlot} meetingSlot
 */
export function buildSpecialSheetColumnLabel(title, meetingSlot) {
  const slotLabel = meetingSlot === "gold" ? "Gold" : "Maroon";
  const trimmed = String(title || "Special event").trim().slice(0, 60);
  return `${trimmed} (${slotLabel})`;
}

/**
 * @param {string} title
 * @returns {string}
 */
export function specialSheetEventColumnKey(title) {
  return String(title || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
