import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  doc,
  getDoc,
  increment,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const rules = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../firestore.rules"),
  "utf8",
);

const PROJECT_ID = "code4community-rules-test";
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

/** @type {import("@firebase/rules-unit-testing").RulesTestEnvironment | null} */
let testEnv = null;

describe.skipIf(!hasEmulator)("Club Hub Firestore rules", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules },
    });
  });

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe("clubHubMemberships", () => {
    it("allows a user to create their own membership", async () => {
      const alice = testEnv.authenticatedContext("alice", {
        email: "alice@lcps.org",
      });
      const db = alice.firestore();

      await assertSucceeds(
        setDoc(doc(db, "clubHubMemberships", "robotics__alice"), {
          clubSlug: "robotics",
          clubName: "Robotics",
          userId: "alice",
          userEmail: "alice@lcps.org",
          displayName: "Alice",
          joinedAt: serverTimestamp(),
        }),
      );
    });

    it("denies creating membership for another user", async () => {
      const alice = testEnv.authenticatedContext("alice", {
        email: "alice@lcps.org",
      });
      const db = alice.firestore();

      await assertFails(
        setDoc(doc(db, "clubHubMemberships", "robotics__bob"), {
          clubSlug: "robotics",
          clubName: "Robotics",
          userId: "bob",
          userEmail: "bob@lcps.org",
          displayName: "Bob",
          joinedAt: serverTimestamp(),
        }),
      );
    });
  });

  describe("clubHubEvents", () => {
    it("allows sponsor with synced access to create an event", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, "clubHubAccess", "sponsor@lcps.org"), {
          email: "sponsor@lcps.org",
          isCoordinator: false,
          manualClubSlugs: {},
          directoryClubSlugs: { robotics: true },
          updatedAt: serverTimestamp(),
          updatedBy: "admin",
        });
      });

      const sponsor = testEnv.authenticatedContext("sponsor", {
        email: "sponsor@lcps.org",
      });
      const db = sponsor.firestore();

      await assertSucceeds(
        setDoc(doc(db, "clubHubEvents", "evt1"), {
          clubSlug: "robotics",
          clubName: "Robotics",
          title: "Meeting",
          date: "2026-09-21",
          time: "3:00 PM",
          description: "",
          location: "101",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: "sponsor",
          updatedBy: "sponsor",
        }),
      );
    });

    it("denies event create without clubHubAccess", async () => {
      const sponsor = testEnv.authenticatedContext("sponsor", {
        email: "sponsor@lcps.org",
      });
      const db = sponsor.firestore();

      await assertFails(
        setDoc(doc(db, "clubHubEvents", "evt2"), {
          clubSlug: "robotics",
          clubName: "Robotics",
          title: "Meeting",
          date: "2026-09-21",
          time: "3:00 PM",
          description: "",
          location: "101",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: "sponsor",
          updatedBy: "sponsor",
        }),
      );
    });
  });

  describe("clubHubMembershipCounts", () => {
    it("allows first join to create count doc with memberCount 1", async () => {
      const alice = testEnv.authenticatedContext("alice", {
        email: "alice@lcps.org",
      });
      const db = alice.firestore();

      await assertSucceeds(
        setDoc(
          doc(db, "clubHubMembershipCounts", "robotics"),
          {
            clubSlug: "robotics",
            clubName: "Robotics",
            memberCount: increment(1),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
      );
    });

    it("allows incrementing an existing count by 1", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, "clubHubMembershipCounts", "robotics"), {
          clubSlug: "robotics",
          clubName: "Robotics",
          memberCount: 2,
          updatedAt: serverTimestamp(),
        });
      });

      const alice = testEnv.authenticatedContext("alice", {
        email: "alice@lcps.org",
      });
      const db = alice.firestore();

      await assertSucceeds(
        setDoc(
          doc(db, "clubHubMembershipCounts", "robotics"),
          {
            clubSlug: "robotics",
            clubName: "Robotics",
            memberCount: increment(1),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
      );
    });

    it("denies arbitrary count jumps", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, "clubHubMembershipCounts", "robotics"), {
          clubSlug: "robotics",
          clubName: "Robotics",
          memberCount: 2,
          updatedAt: serverTimestamp(),
        });
      });

      const alice = testEnv.authenticatedContext("alice", {
        email: "alice@lcps.org",
      });
      const db = alice.firestore();

      await assertFails(
        setDoc(
          doc(db, "clubHubMembershipCounts", "robotics"),
          {
            clubSlug: "robotics",
            clubName: "Robotics",
            memberCount: 10,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
      );
    });
  });

  describe("clubHubPages", () => {
    it("allows reading club pages publicly", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, "clubHubPages", "robotics"), {
          slug: "robotics",
          about: "About robotics",
          updatedAt: serverTimestamp(),
          updatedBy: "admin",
        });
      });

      const guest = testEnv.unauthenticatedContext();
      await assertSucceeds(getDoc(doc(guest.firestore(), "clubHubPages", "robotics")));
    });
  });
});
