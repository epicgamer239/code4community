/**
 * Seeds School Concerns Forum demo data (runs through Vitest so `@/` imports resolve).
 *
 *   npm run seed:school-forum                       # c4cdev, or the emulator if FIRESTORE_EMULATOR_HOST is set
 *   SCHOOL_FORUM_SEED_ADMIN_EMAIL=you@lcps.org npm run seed:school-forum   # also make you a forum admin
 *
 * Refuses to write to the production project.
 */
import { describe, expect, it } from "vitest";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FORUM_COLLECTIONS } from "@/lib/school-forum/constants";
import { buildForumSeed } from "@/lib/school-forum/seedData";
import { normalizeEmail } from "@/lib/email";

const run = process.env.RUN_SCHOOL_FORUM_SEED === "1";
const PROD_PROJECT_ID = "code4community26";
const SCHOOL_ID = process.env.SCHOOL_FORUM_SEED_SCHOOL || "broad-run";

describe.skipIf(!run)("School Concerns Forum demo seed (manual)", () => {
  it("writes demo concerns, cycles, votes and responses", async () => {
    const db = getAdminFirestore();
    expect(db, "Firebase Admin is not configured").toBeTruthy();

    // Touch the database once so the project id is known, then refuse prod.
    await db.collection(FORUM_COLLECTIONS.CYCLES).limit(1).get();
    expect(db.projectId, "Refusing to seed the production project").not.toBe(PROD_PROJECT_ID);

    const docs = buildForumSeed({ schoolId: SCHOOL_ID });
    for (let i = 0; i < docs.length; i += 400) {
      const batch = db.batch();
      for (const { collection, id, data } of docs.slice(i, i + 400)) {
        batch.set(db.collection(collection).doc(id), data);
      }
      await batch.commit();
    }

    const adminEmail = normalizeEmail(process.env.SCHOOL_FORUM_SEED_ADMIN_EMAIL);
    if (adminEmail) {
      await db.collection(FORUM_COLLECTIONS.STAFF).doc(`${SCHOOL_ID}__${adminEmail}`).set({
        schoolId: SCHOOL_ID,
        email: adminEmail,
        role: "admin",
        addedByEmail: "seed",
        addedAt: new Date(),
      });
    }

    console.log(`Seeded ${docs.length} forum docs for ${SCHOOL_ID} in ${db.projectId}.`);
  }, 120_000);
});
