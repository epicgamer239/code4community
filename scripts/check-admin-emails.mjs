#!/usr/bin/env node
/**
 * Ensures admin allowlists in lib/admin.js, firestore.rules, and storage.rules stay in sync
 * with config/admin-emails.json.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** @param {string} path */
function read(path) {
  return readFileSync(join(root, path), "utf8");
}

const canonical = JSON.parse(read("config/admin-emails.json"))
  .map((email) => email.trim().toLowerCase())
  .sort();

const adminJs = read("lib/admin.js");
const firestoreRules = read("firestore.rules");
const storageRules = read("storage.rules");

if (!adminJs.includes("config/admin-emails.json")) {
  console.error("lib/admin.js must import admin emails from config/admin-emails.json");
  process.exit(1);
}

/** @param {string} content @param {string} label */
function assertEmailsPresent(content, label) {
  const missing = canonical.filter((email) => !content.toLowerCase().includes(email));
  if (missing.length > 0) {
    console.error(`${label} is missing admin emails: ${missing.join(", ")}`);
    process.exit(1);
  }
}

assertEmailsPresent(firestoreRules, "firestore.rules");
assertEmailsPresent(storageRules, "storage.rules");

console.log(`Admin allowlist OK (${canonical.length} emails)`);
