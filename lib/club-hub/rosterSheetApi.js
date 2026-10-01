import { getRosterSheetAuthClient } from "@/lib/club-hub/rosterSheetAuth";
import { getClubRosterSpreadsheetId } from "@/lib/club-hub/rosterSheetConfig";

/** @returns {{ auth: import("google-auth-library").JWT, spreadsheetId: string } | null} */
export function getRosterSheetClient() {
  const auth = getRosterSheetAuthClient();
  const spreadsheetId = getClubRosterSpreadsheetId();
  if (!auth || !spreadsheetId) return null;
  return { auth, spreadsheetId };
}

/**
 * @param {{ auth: import("google-auth-library").JWT, spreadsheetId: string }} client
 * @param {string} path
 * @param {{ method?: string, query?: Record<string, string>, body?: unknown }} [opts]
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sheetsRequest(client, path, opts = {}) {
  let lastError = "Sheets API error";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { token } = await client.auth.getAccessToken();
    if (!token) throw new Error("Could not obtain Google access token.");

    let url = `https://sheets.googleapis.com/v4${path}`;
    if (opts.query && Object.keys(opts.query).length) {
      url += `?${new URLSearchParams(opts.query).toString()}`;
    }

    const res = await fetch(url, {
      method: opts.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    const text = await res.text();
    /** @type {{ error?: { message?: string } } | null} */
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (res.ok) return data;

    lastError = data?.error?.message || res.statusText || "Sheets API error";
    const rateLimited =
      res.status === 429 || /quota exceeded/i.test(lastError) || /rate limit/i.test(lastError);
    if (rateLimited && attempt < 5) {
      await sleep(15_000 * (attempt + 1));
      continue;
    }
    throw new Error(lastError);
  }
  throw new Error(lastError);
}

/**
 * Minimal Sheets v4 client (fetch + service account). Avoids googleapis auth quirks on Node 22.
 * @param {{ auth: import("google-auth-library").JWT, spreadsheetId: string }} client
 */
export function createRosterSheetsClient(client) {
  const { spreadsheetId } = client;
  const sid = encodeURIComponent(spreadsheetId);

  return {
    spreadsheets: {
      get: ({ fields }) =>
        sheetsRequest(client, `/spreadsheets/${sid}`, {
          query: fields ? { fields } : undefined,
        }),
      batchUpdate: ({ requestBody }) =>
        sheetsRequest(client, `/spreadsheets/${sid}:batchUpdate`, {
          method: "POST",
          body: requestBody,
        }),
      values: {
        get: ({ range }) =>
          sheetsRequest(client, `/spreadsheets/${sid}/values/${encodeURIComponent(range)}`),
        update: ({ range, valueInputOption, requestBody }) =>
          sheetsRequest(
            client,
            `/spreadsheets/${sid}/values/${encodeURIComponent(range)}`,
            {
              method: "PUT",
              query: { valueInputOption: valueInputOption || "RAW" },
              body: requestBody,
            },
          ),
        append: ({ range, valueInputOption, insertDataOption, requestBody }) =>
          sheetsRequest(
            client,
            `/spreadsheets/${sid}/values/${encodeURIComponent(range)}:append`,
            {
              method: "POST",
              query: {
                valueInputOption: valueInputOption || "RAW",
                insertDataOption: insertDataOption || "INSERT_ROWS",
              },
              body: requestBody,
            },
          ),
        clear: ({ range }) =>
          sheetsRequest(
            client,
            `/spreadsheets/${sid}/values/${encodeURIComponent(range)}:clear`,
            { method: "POST", body: {} },
          ),
      },
    },
  };
}

/** @returns {ReturnType<typeof createRosterSheetsClient> | null} */
export function getRosterSheetsApi() {
  const client = getRosterSheetClient();
  if (!client) return null;
  return createRosterSheetsClient(client);
}
