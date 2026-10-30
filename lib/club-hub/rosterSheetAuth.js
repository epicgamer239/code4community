import { JWT } from "google-auth-library";
import { ROSTER_PROTECT_EXTRA_EDITORS } from "@/lib/club-hub/rosterSheetConfig";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function parseServiceAccountEnv(raw) {
  if (!raw || typeof raw !== "string") return null;
  let parsed = JSON.parse(raw.trim());
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  return parsed;
}

/** @returns {string | null} */
export function getRosterServiceAccountEmail() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const sa = parseServiceAccountEnv(raw || "");
  return sa?.client_email?.trim() || null;
}

/** Service account + allowed human editors for protected roster ranges. */
export function getRosterProtectedRangeEditors() {
  /** @type {string[]} */
  const editors = [];
  const sa = getRosterServiceAccountEmail();
  if (sa) editors.push(sa);
  for (const email of ROSTER_PROTECT_EXTRA_EDITORS) {
    const trimmed = String(email || "").trim();
    if (trimmed && !editors.includes(trimmed)) editors.push(trimmed);
  }
  return editors;
}

/** @returns {import("google-auth-library").JWT | null} */
export function getRosterSheetAuthClient() {
  const saEmail = getRosterServiceAccountEmail();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const sa = parseServiceAccountEnv(raw || "");
  if (!saEmail || !sa?.private_key) {
    return null;
  }
  return new JWT({
    email: saEmail,
    key: sa.private_key,
    scopes: [SHEETS_SCOPE],
  });
}
