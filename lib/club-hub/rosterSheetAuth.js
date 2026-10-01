import { JWT } from "google-auth-library";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function parseServiceAccountEnv(raw) {
  if (!raw || typeof raw !== "string") return null;
  let parsed = JSON.parse(raw.trim());
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  return parsed;
}

/** @returns {import("google-auth-library").JWT | null} */
export function getRosterSheetAuthClient() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const sa = parseServiceAccountEnv(raw || "");
  if (!sa?.client_email || !sa?.private_key) {
    return null;
  }
  return new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: [SHEETS_SCOPE],
  });
}
