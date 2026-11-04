import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, describe, it } from "vitest";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { FORUM_COLLECTIONS } from "@/lib/school-forum/constants";

const rules = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../firestore.rules"),
  "utf8",
);

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

/** @type {import("@firebase/rules-unit-testing").RulesTestEnvironment | null} */
let testEnv = null;

describe.skipIf(!hasEmulator)("School Concerns Forum Firestore rules", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "code4community-rules-test",
      firestore: { rules },
    });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), FORUM_COLLECTIONS.AUTHORS, "c1"), {
        schoolId: "broad-run",
        uid: "alice",
        email: "alice@lcps.org",
      });
    });
  });

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  it.each(Object.values(FORUM_COLLECTIONS))("clients can't read or write %s", async (name) => {
    // Even a site admin or the poster themself goes through the API, never Firestore directly.
    for (const email of ["alice@lcps.org", "1021676@lcps.org"]) {
      const db = testEnv.authenticatedContext(email === "alice@lcps.org" ? "alice" : "site-admin", { email }).firestore();
      await assertFails(getDoc(doc(db, name, "c1")));
      await assertFails(getDocs(collection(db, name)));
      await assertFails(setDoc(doc(db, name, "new"), { schoolId: "broad-run" }));
    }
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), name, "c1")));
  });
});
