#!/usr/bin/env node
/**
 * Regenerate lib/club-hub/broadRunRoster.js from the CSV in public/.
 * Run: node scripts/generate-broad-run-roster.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const csvPath = path.join(
  root,
  "public",
  "Broad Run High School Name List & Emails - Sheet1.csv",
);
const outPath = path.join(root, "lib", "club-hub", "broadRunRoster.js");

const csv = fs.readFileSync(csvPath, "utf8");
const map = {};
for (const line of csv.trim().split("\n").slice(1)) {
  const idx = line.lastIndexOf(",");
  if (idx < 0) continue;
  const email = line.slice(idx + 1).trim().toLowerCase();
  const name = line.slice(0, idx).trim();
  if (email && name) map[email] = name;
}

const out = `/** Auto-generated from public/Broad Run High School Name List & Emails - Sheet1.csv */
export const BROAD_RUN_EMAIL_TO_NAME = ${JSON.stringify(map, null, 2)};

export function lookupBroadRunName(email) {
  if (!email || typeof email !== "string") return null;
  return BROAD_RUN_EMAIL_TO_NAME[email.trim().toLowerCase()] ?? null;
}
`;

fs.writeFileSync(outPath, out);
console.log(`Wrote ${Object.keys(map).length} entries to lib/club-hub/broadRunRoster.js`);
