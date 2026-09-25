#!/usr/bin/env node
/**
 * One-off: migrate legacy users.role=admin (non–site-admin emails) → mathLabAdmin + role student.
 * Optional: legacy role=tutor → writingCenterRole tutor + role student.
 *
 * Usage:
 *   source .env.local  # FIREBASE_SERVICE_ACCOUNT_JSON
 *   node scripts/migrate-product-admin-roles.mjs --project code4community26
 *   node scripts/migrate-product-admin-roles.mjs --project c4cdev-6f9f4 --dry-run
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { cert, getApps, initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const adminEmails = JSON.parse(
  readFileSync(join(root, "config/admin-emails.json"), "utf8"),
);

const SITE = new Set(adminEmails.map((e) => e.toLowerCase().trim()));

function parseArgs() {
  const args = process.argv.slice(2);
  let projectId = "code4community26";
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project" && args[i + 1]) projectId = args[++i];
    if (args[i] === "--dry-run") dryRun = true;
  }
  return { projectId, dryRun };
}

function norm(email) {
  return (email || "").toLowerCase().trim();
}

function parseServiceAccountEnv(raw) {
  if (!raw || typeof raw !== "string") return null;
  let parsed = JSON.parse(raw.trim());
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  return parsed;
}

async function getDb(projectId) {
  for (const app of getApps()) {
    await deleteApp(app);
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccount = parseServiceAccountEnv(json);
  if (!serviceAccount) {
    throw new Error("Set FIREBASE_SERVICE_ACCOUNT_JSON (e.g. source .env.local).");
  }
  initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
  return getFirestore();
}

/** @param {FirebaseFirestore.DocumentData} data */
function buildUpdate(data) {
  const email = norm(data.email);
  const role = (data.role || "").toLowerCase();
  /** @type {Record<string, unknown>} */
  const update = { updatedAt: FieldValue.serverTimestamp() };

  if (role === "admin" && email && !SITE.has(email)) {
    update.role = "student";
    update.mathLabAdmin = true;
    return { kind: "legacy_appointed_admin", update };
  }

  if (role === "tutor") {
    update.role = "student";
    if (data.writingCenterRole !== "tutor") {
      update.writingCenterRole = "tutor";
    }
    return { kind: "legacy_role_tutor", update };
  }

  return null;
}

async function main() {
  const { projectId, dryRun } = parseArgs();
  const db = await getDb(projectId);
  const snap = await db.collection("users").get();
  const planned = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const plan = buildUpdate(data);
    if (plan) {
      planned.push({
        id: doc.id,
        email: data.email,
        beforeRole: data.role,
        kind: plan.kind,
        update: plan.update,
      });
    }
  }

  console.log(`Project: ${projectId}${dryRun ? " (dry run)" : ""}`);
  console.log(`Users scanned: ${snap.size}`);
  console.log(`To migrate: ${planned.length}`);

  for (const row of planned) {
    console.log(`- ${row.email} (${row.id}) ${row.kind}: ${row.beforeRole} →`, row.update);
    if (!dryRun) {
      await db.collection("users").doc(row.id).update(row.update);
    }
  }

  if (!dryRun && planned.length > 0) {
    console.log("Done.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
