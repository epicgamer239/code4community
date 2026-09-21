#!/usr/bin/env node
/**
 * One-time / maintenance script: ensure the built-in Club Hub coordinator access doc exists.
 *
 * Usage (requires Firebase Admin credentials):
 *   node scripts/seed-protected-club-hub-coordinator.mjs
 */
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "../lib/firebase/admin.js";

// Inlined from lib/club-hub/access.js — avoid @/ imports that break plain Node runs.
const CLUB_HUB_ACCESS_COLLECTION = "clubHubAccess";
const PROTECTED_CLUB_HUB_COORDINATOR_EMAIL = "katrice.white@lcps.org";

/** @param {string} email */
function clubHubAccessDocId(email) {
  return email.trim().toLowerCase();
}

async function main() {
  const db = getAdminFirestore();
  if (!db) {
    console.error("Firebase Admin is not configured.");
    process.exit(1);
  }

  const email = PROTECTED_CLUB_HUB_COORDINATOR_EMAIL;
  const docId = clubHubAccessDocId(email);
  const ref = db.collection(CLUB_HUB_ACCESS_COLLECTION).doc(docId);
  const existing = await ref.get();

  await ref.set(
    {
      email,
      isCoordinator: true,
      manualClubSlugs: existing.exists ? existing.data()?.manualClubSlugs || {} : {},
      directoryClubSlugs: existing.exists ? existing.data()?.directoryClubSlugs || {} : {},
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: "seed-protected-club-hub-coordinator",
    },
    { merge: true },
  );

  console.log(`Ensured coordinator access for ${email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
