#!/usr/bin/env node
/**
 * Align Firestore (and optional Auth) display names with the Broad Run roster CSV.
 * Updates: users, clubHubMemberships, clubHubBoardMembers.
 *
 * Usage:
 *   source .env.local   # FIREBASE_SERVICE_ACCOUNT_JSON, optional CLUB_ROSTER_SPREADSHEET_ID
 *   node scripts/sync-broad-run-display-names.mjs --project code4community26
 *   node scripts/sync-broad-run-display-names.mjs --project code4community26 --apply
 *   node scripts/sync-broad-run-display-names.mjs --apply --rebuild-sheets
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync, spawnSync } from "child_process";
import { cert, deleteApp, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const envPath = join(root, ".env.local");
  try {
    const text = readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq);
      const val = trimmed.slice(eq + 1);
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const CSV_PATH = join(
  root,
  "public",
  "Broad Run High School Name List & Emails - Sheet1.csv",
);

function parseArgs() {
  const args = process.argv.slice(2);
  let projectId = "";
  let apply = false;
  let rebuildSheets = false;
  let skipAuth = false;
  let useGcloud = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project" && args[i + 1]) projectId = args[++i];
    if (args[i] === "--apply") apply = true;
    if (args[i] === "--rebuild-sheets") rebuildSheets = true;
    if (args[i] === "--skip-auth") skipAuth = true;
    if (args[i] === "--use-gcloud") useGcloud = true;
  }
  return { projectId, apply, rebuildSheets, skipAuth, useGcloud };
}

/** Uses `gcloud auth print-access-token` (your logged-in Google account). */
function gcloudAccessCredential() {
  return {
    getAccessToken: async () => {
      const access_token = execSync("gcloud auth print-access-token", {
        encoding: "utf8",
      }).trim();
      return { access_token, expires_in: 3600 };
    },
  };
}

function normEmail(email) {
  return (email || "").toLowerCase().trim();
}

function parseServiceAccountEnv(raw) {
  if (!raw || typeof raw !== "string") return null;
  let parsed = JSON.parse(raw.trim());
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  return parsed;
}

/** @returns {Map<string, string>} */
function loadRosterByEmail() {
  const csv = readFileSync(CSV_PATH, "utf8");
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const line of csv.trim().split("\n").slice(1)) {
    const idx = line.lastIndexOf(",");
    if (idx < 0) continue;
    const name = line.slice(0, idx).trim();
    const email = normEmail(line.slice(idx + 1));
    if (email && name) map.set(email, name.slice(0, 100));
  }
  return map;
}

async function initAdmin(projectId, useGcloud) {
  if (useGcloud) {
    return null;
  }
  for (const app of getApps()) {
    await deleteApp(app);
  }
  const serviceAccount = parseServiceAccountEnv(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (!serviceAccount) {
    throw new Error("Set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local or pass --use-gcloud.");
  }
  const resolvedProject = projectId || serviceAccount.project_id;
  if (!resolvedProject) {
    throw new Error("Pass --project or use a service account with project_id.");
  }
  initializeApp({
    credential: cert(serviceAccount),
    projectId: resolvedProject,
  });
  return getFirestore();
}

function gcloudToken() {
  return execSync("gcloud auth print-access-token", { encoding: "utf8" }).trim();
}

/** @param {string} projectId @param {string} collectionId @param {string} [pageToken] */
async function restListCollection(projectId, collectionId, pageToken) {
  let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}?pageSize=300`;
  if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${gcloudToken()}` } });
  if (!res.ok) throw new Error(`Firestore list ${collectionId}: ${await res.text()}`);
  return res.json();
}

/** @param {string} projectId @param {string} collectionId */
async function* restEachDoc(projectId, collectionId) {
  let pageToken;
  do {
    const page = await restListCollection(projectId, collectionId, pageToken);
    for (const doc of page.documents || []) yield doc;
    pageToken = page.nextPageToken;
  } while (pageToken);
}

/** @param {object} doc */
function restStringField(doc, field) {
  return doc.fields?.[field]?.stringValue ?? "";
}

/**
 * @param {string} docName full resource name
 * @param {Record<string, object>} fields
 * @param {string[]} updateMask
 */
async function restPatchDoc(docName, fields, updateMask) {
  const qs = updateMask.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join("&");
  const res = await fetch(`https://firestore.googleapis.com/v1/${docName}?${qs}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${gcloudToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore patch: ${await res.text()}`);
}

/** @param {string} projectId @param {string} uid @param {string} displayName */
async function restAuthDisplayName(projectId, uid, displayName) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gcloudToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localId: uid, displayName, returnSecureToken: false }),
    },
  );
  if (!res.ok) {
    throw new Error(await res.text());
  }
}

/**
 * @param {string} current
 * @param {string} next
 */
function nameNeedsUpdate(current, next) {
  if (!next) return false;
  const cur = (current || "").trim();
  return cur !== next;
}

async function main() {
  const { projectId: projectArg, apply, rebuildSheets, skipAuth, useGcloud } = parseArgs();
  const roster = loadRosterByEmail();
  const db = await initAdmin(projectArg, useGcloud);
  const projectId =
    projectArg ||
    (useGcloud
      ? "code4community26"
      : parseServiceAccountEnv(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)?.project_id);
  const auth = !useGcloud && !skipAuth ? getAuth() : null;

  /** @type {{ users: number, memberships: number, boardClubs: number, auth: number, samples: string[] }} */
  const stats = { users: 0, memberships: 0, boardClubs: 0, auth: 0, samples: [] };

  const logSample = (msg) => {
    if (stats.samples.length < 12) stats.samples.push(msg);
  };

  // --- users ---
  if (useGcloud) {
    for await (const doc of restEachDoc(projectId, "users")) {
      const uid = doc.name.split("/").pop();
      const email = normEmail(restStringField(doc, "email"));
      const current = restStringField(doc, "displayName");
      const rosterName = roster.get(email);
      if (!rosterName || !nameNeedsUpdate(current, rosterName)) continue;
      logSample(`users/${uid}: "${current}" → "${rosterName}" (${email})`);
      stats.users += 1;
      if (apply) {
        await restPatchDoc(
          doc.name,
          {
            displayName: { stringValue: rosterName },
            updatedAt: { timestampValue: new Date().toISOString() },
          },
          ["displayName", "updatedAt"],
        );
        if (!skipAuth) {
          try {
            await restAuthDisplayName(projectId, uid, rosterName);
            stats.auth += 1;
          } catch (err) {
            console.warn(`Auth update failed for ${uid} (${email}):`, err.message);
          }
        }
      }
    }
  } else {
    const userSnap = await db.collection("users").get();
    for (const doc of userSnap.docs) {
      const data = doc.data();
      const email = normEmail(data.email);
      const rosterName = roster.get(email);
      if (!rosterName || !nameNeedsUpdate(data.displayName, rosterName)) continue;
      logSample(`users/${doc.id}: "${data.displayName}" → "${rosterName}" (${email})`);
      stats.users += 1;
      if (apply) {
        await doc.ref.update({
          displayName: rosterName,
          updatedAt: FieldValue.serverTimestamp(),
        });
        if (auth) {
          try {
            await auth.updateUser(doc.id, { displayName: rosterName });
            stats.auth += 1;
          } catch (err) {
            console.warn(`Auth update failed for ${doc.id} (${email}):`, err.message);
          }
        }
      }
    }
  }

  // --- club memberships (names shown on rosters + sheet) ---
  if (useGcloud) {
    for await (const doc of restEachDoc(projectId, "clubHubMemberships")) {
      const email = normEmail(restStringField(doc, "userEmail"));
      const current = restStringField(doc, "displayName");
      const rosterName = roster.get(email);
      if (!rosterName || !nameNeedsUpdate(current, rosterName)) continue;
      logSample(`clubHubMemberships/${doc.name.split("/").pop()}: "${current}" → "${rosterName}"`);
      stats.memberships += 1;
      if (apply) {
        await restPatchDoc(doc.name, { displayName: { stringValue: rosterName } }, [
          "displayName",
        ]);
      }
    }
  } else {
    const memSnap = await db.collection("clubHubMemberships").get();
    for (const doc of memSnap.docs) {
      const data = doc.data();
      const email = normEmail(data.userEmail);
      const rosterName = roster.get(email);
      if (!rosterName || !nameNeedsUpdate(data.displayName, rosterName)) continue;
      logSample(`clubHubMemberships/${doc.id}: "${data.displayName}" → "${rosterName}"`);
      stats.memberships += 1;
      if (apply) {
        await doc.ref.update({ displayName: rosterName });
      }
    }
  }

  // --- board member rosters on club docs ---
  if (useGcloud) {
    for await (const doc of restEachDoc(projectId, "clubHubBoardMembers")) {
      const membersRaw = doc.fields?.members?.arrayValue?.values;
      if (!Array.isArray(membersRaw) || !membersRaw.length) continue;
      let changed = false;
      const nextValues = membersRaw.map((entry) => {
        const fields = entry.mapValue?.fields || {};
        const email = normEmail(fields.email?.stringValue || "");
        const current = fields.displayName?.stringValue || "";
        const rosterName = roster.get(email);
        if (!rosterName || !nameNeedsUpdate(current, rosterName)) return entry;
        changed = true;
        logSample(
          `clubHubBoardMembers/${doc.name.split("/").pop()}: ${email} "${current}" → "${rosterName}"`,
        );
        return {
          mapValue: {
            fields: {
              ...fields,
              displayName: { stringValue: rosterName.slice(0, 100) },
            },
          },
        };
      });
      if (changed) {
        stats.boardClubs += 1;
        if (apply) {
          await restPatchDoc(doc.name, { members: { arrayValue: { values: nextValues } } }, [
            "members",
          ]);
        }
      }
    }
  } else {
    const boardSnap = await db.collection("clubHubBoardMembers").get();
    for (const doc of boardSnap.docs) {
      const data = doc.data();
      const members = data.members;
      if (!Array.isArray(members) || !members.length) continue;
      let changed = false;
      const nextMembers = members.map((m) => {
        const email = normEmail(m.email);
        const rosterName = roster.get(email);
        if (!rosterName || !nameNeedsUpdate(m.displayName, rosterName)) return m;
        changed = true;
        logSample(`clubHubBoardMembers/${doc.id}: ${email} "${m.displayName}" → "${rosterName}"`);
        return { ...m, displayName: rosterName.slice(0, 100) };
      });
      if (changed) {
        stats.boardClubs += 1;
        if (apply) {
          await doc.ref.update({ members: nextMembers });
        }
      }
    }
  }

  console.log(`Project: ${projectId}${apply ? "" : " (dry run — pass --apply to write)"}`);
  console.log(`Roster entries: ${roster.size}`);
  console.log(`Users to update: ${stats.users}${apply && !skipAuth ? ` (Auth: ${stats.auth})` : ""}`);
  console.log(`Memberships to update: ${stats.memberships}`);
  console.log(`Board club docs to update: ${stats.boardClubs}`);
  if (stats.samples.length) {
    console.log("Sample changes:");
    for (const line of stats.samples) console.log(`  ${line}`);
  }

  if (!apply) {
    console.log("\nRe-run with --apply to write Firestore" + (skipAuth ? "" : " + Auth") + ".");
    return;
  }

  if (rebuildSheets) {
    if (!process.env.CLUB_ROSTER_SPREADSHEET_ID) {
      console.warn("CLUB_ROSTER_SPREADSHEET_ID unset — skipping sheet rebuild.");
      return;
    }
    console.log("\nRebuilding Google Sheets from Firestore…");
    const result = spawnSync(
      "npm",
      ["run", "test", "--", "tests/club-hub/rosterSheetFullBootstrap.manual.test.js"],
      {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env, RUN_CLUB_ROSTER_BOOTSTRAP: "1" },
      },
    );
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  } else {
    console.log("\nSheet not rebuilt. Add --rebuild-sheets after --apply to refresh Google Sheets.");
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
