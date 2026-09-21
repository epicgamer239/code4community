#!/usr/bin/env node
/**
 * Concatenate domain Firestore rule fragments into firestore.rules for deploy.
 * Edit files under firestore/fragments/ — do not hand-edit firestore.rules.
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FRAGMENTS = [
  "firestore/fragments/00-header.rules",
  "firestore/fragments/01-shared.rules",
  "firestore/fragments/02-users.rules",
  "firestore/fragments/03-mathlab.rules",
  "firestore/fragments/04-writing-center.rules",
  "firestore/fragments/05-library-pass.rules",
  "firestore/fragments/06-club-hub.rules",
  "firestore/fragments/07-seating.rules",
  "firestore/fragments/99-footer.rules",
];

const output = FRAGMENTS.map((rel) => {
  const path = join(root, rel);
  return readFileSync(path, "utf8").trimEnd();
}).join("\n\n") + "\n";

writeFileSync(join(root, "firestore.rules"), output);
console.log(`Built firestore.rules from ${FRAGMENTS.length} fragments`);
