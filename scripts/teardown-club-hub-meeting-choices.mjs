#!/usr/bin/env node
/**
 * After deploying code that derives Gold/Maroon from memberships only:
 * backup + delete all clubHubMeetingChoices docs, then refresh sheets.
 *
 * Usage:
 *   export FIREBASE_SERVICE_ACCOUNT_JSON=...   # prod SA
 *   export CLUB_ROSTER_SPREADSHEET_ID=1fdVX9URoMzroPllhTuZzINXzdpekwgoO_BDmF9NBN6c
 *   node scripts/teardown-club-hub-meeting-choices.mjs --dry-run
 *   node scripts/teardown-club-hub-meeting-choices.mjs --apply
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const COLLECTION = "clubHubMeetingChoices";

const apply = process.argv.includes("--apply");
const dryRun = process.argv.includes("--dry-run") || !apply;

if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.error("Set FIREBASE_SERVICE_ACCOUNT_JSON (prod service account).");
  process.exit(1);
}

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!getApps().length) {
  initializeApp({ credential: cert(sa) });
}
const db = getFirestore();

const snap = await db.collection(COLLECTION).get();
console.log(`Found ${snap.size} ${COLLECTION} docs (project ${sa.project_id}).`);

mkdirSync(join(root, "backups"), { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = join(root, "backups", `club-hub-meeting-choices-teardown-${stamp}.json`);
writeFileSync(
  backupPath,
  JSON.stringify(
    {
      project: sa.project_id,
      createdAt: new Date().toISOString(),
      dryRun,
      count: snap.size,
      docs: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    },
    null,
    2,
  ),
);
console.log("Backup:", backupPath);

if (dryRun) {
  console.log("Dry run only. Re-run with --apply to delete docs.");
  process.exit(0);
}

for (let i = 0; i < snap.docs.length; i += 400) {
  const chunk = snap.docs.slice(i, i + 400);
  const batch = db.batch();
  for (const doc of chunk) batch.delete(doc.ref);
  await batch.commit();
  console.log(`Deleted ${Math.min(i + chunk.length, snap.size)} / ${snap.size}`);
}

console.log("Done. Re-bootstrap sheets with:");
console.log("  RUN_CLUB_ROSTER_BOOTSTRAP=1 npm run test -- tests/club-hub/rosterSheetFullBootstrap.manual.test.js");
