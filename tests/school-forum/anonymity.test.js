/**
 * Anonymity: nobody but a school's forum admins can ever get a poster's identity —
 * not from serializers, server functions, or the HTTP API.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BROAD_RUN_EMAIL_TO_NAME } from "@/lib/club-hub/broadRunRoster";
import { FORUM_COLLECTIONS as C } from "@/lib/school-forum/constants";
import { buildForumSeed } from "@/lib/school-forum/seedData";
import {
  toModeratorConcern,
  toOwnConcern,
  toPublicConcern,
} from "@/lib/school-forum/serializers";
import { FakeFirestore } from "./fakeFirestore";

// --- Route-level mocks: fake Admin Firestore + token verification ------------
const state = vi.hoisted(() => ({ db: null, tokens: {} }));

vi.mock("@/lib/firebase/admin", () => ({ getAdminFirestore: () => state.db }));
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    verifyIdToken: async (token) => {
      const user = state.tokens[token];
      if (!user) throw new Error("bad token");
      return user;
    },
  }),
}));

const { getForumOverview, listCycles, listModerationQueue, listMyConcerns, listSafetyQueue, listStatusBoard, revealPosterIdentity, submitConcern } =
  await import("@/lib/school-forum/forumServer");

const NOW = Date.UTC(2026, 9, 30, 15);
const ROSTER = Object.keys(BROAD_RUN_EMAIL_TO_NAME);
const POSTER_EMAIL = ROSTER[0];
const MOD_EMAIL = ROSTER[1];
const ADMIN_EMAIL = "forum-admin@lcps.org";

/** Every identity value in the database: poster uids and emails. */
function identityValues(db) {
  return db.all(C.AUTHORS).flatMap((a) => [a.uid, a.email]);
}

/** Fail if any identity value, or an identity-looking key, appears anywhere in `payload`. */
function expectNoIdentity(payload, db) {
  const text = JSON.stringify(payload);
  for (const value of identityValues(db)) {
    expect(text, `leaked ${value}`).not.toContain(value);
  }
  const keys = [];
  JSON.parse(text, (key, value) => {
    keys.push(key);
    return value;
  });
  for (const forbidden of ["uid", "email", "authorUid", "authorEmail", "poster", "byEmail", "studentId"]) {
    expect(keys, `response has a "${forbidden}" field`).not.toContain(forbidden);
  }
}

const ctx = (role, email, extra = {}) => ({
  uid: `${role}-uid`,
  email,
  schoolId: "broad-run",
  role,
  onRoster: true,
  isSiteAdmin: false,
  ...extra,
});

let db;
beforeEach(async () => {
  db = new FakeFirestore().load(buildForumSeed({ schoolId: "broad-run", now: NOW }));
  state.db = db;
  state.tokens = {
    poster: { uid: "poster-uid", email: POSTER_EMAIL },
    moderator: { uid: "mod-uid", email: MOD_EMAIL },
    admin: { uid: "admin-uid", email: ADMIN_EMAIL },
    outsider: { uid: "out-uid", email: "someone@gmail.com" },
    siteAdmin: { uid: "site-uid", email: "shail40926@gmail.com" },
  };
  db.load([
    { collection: C.STAFF, id: `broad-run__${MOD_EMAIL}`, data: { schoolId: "broad-run", email: MOD_EMAIL, role: "moderator" } },
    { collection: C.STAFF, id: `broad-run__${ADMIN_EMAIL}`, data: { schoolId: "broad-run", email: ADMIN_EMAIL, role: "admin" } },
  ]);
  // A real post from a real roster student, so identity values include a roster email.
  await submitConcern(db, ctx("student", POSTER_EMAIL, { uid: "poster-uid" }), {
    title: "Hallway lights flicker all day",
    body: "The lights in the 400 hallway flicker constantly and give people headaches.",
    category: "school",
  }, NOW);
});

describe("serializers never copy identity", () => {
  const stored = {
    id: "c1",
    schoolId: "broad-run",
    title: "T",
    body: "B",
    category: "school",
    state: "approved",
    authorUid: "secret-uid",
    authorEmail: "secret@lcps.org",
    email: "secret@lcps.org",
    uid: "secret-uid",
  };
  const priv = { originalTitle: "o", originalBody: "o", authorEmail: "secret@lcps.org", log: [{ byEmail: "mod@lcps.org" }] };

  it.each([
    ["public", () => toPublicConcern(stored, { responses: [{ text: "r", byEmail: "admin@lcps.org" }] })],
    ["moderator", () => toModeratorConcern(stored, priv)],
    ["own", () => toOwnConcern(stored, priv)],
  ])("%s view has no identity even if the stored doc did", (_name, build) => {
    const text = JSON.stringify(build());
    expect(text).not.toContain("secret");
    expect(text).not.toContain("@lcps.org");
  });
});

describe("server functions", () => {
  it("students and moderators never receive identity from any view", async () => {
    const student = ctx("student", "s@lcps.org", { uid: "s-uid" });
    const moderator = ctx("moderator", MOD_EMAIL);
    expectNoIdentity(await getForumOverview(db, student, NOW), db);
    expectNoIdentity(await getForumOverview(db, moderator, NOW), db);
    expectNoIdentity(await listModerationQueue(db, moderator), db);
    expectNoIdentity(await listCycles(db, moderator, NOW), db);
    expectNoIdentity(await listMyConcerns(db, ctx("student", POSTER_EMAIL, { uid: "poster-uid" })), db);
  });

  it("admin list views don't include identity either (it needs an explicit reveal)", async () => {
    const admin = ctx("admin", ADMIN_EMAIL);
    expectNoIdentity(await listSafetyQueue(db, admin), db);
    expectNoIdentity(await listStatusBoard(db, admin), db);
  });

  it("students, moderators and non-forum site admins can't reveal a poster", async () => {
    const input = { concernId: "seed-safety", reason: "checking who posted" };
    await expect(revealPosterIdentity(db, ctx("student", "s@lcps.org"), input, NOW)).rejects.toMatchObject({ status: 403 });
    await expect(revealPosterIdentity(db, ctx("moderator", MOD_EMAIL), input, NOW)).rejects.toMatchObject({ status: 403 });
    const siteAdmin = { uid: "site", email: "shail40926@gmail.com", schoolId: null, role: null, onRoster: false, isSiteAdmin: true };
    await expect(revealPosterIdentity(db, siteAdmin, input, NOW)).rejects.toMatchObject({ status: 403 });
  });

  it("admins of another school can't reveal", async () => {
    const other = ctx("admin", "other@lcps.org", { schoolId: "other-school" });
    await expect(revealPosterIdentity(db, other, { concernId: "seed-safety", reason: "checking who posted" }, NOW)).rejects.toMatchObject({ status: 404 });
  });

  it("school admins can reveal, with a reason, and it's logged", async () => {
    const admin = ctx("admin", ADMIN_EMAIL);
    await expect(revealPosterIdentity(db, admin, { concernId: "seed-safety", reason: "" }, NOW)).rejects.toThrow(/why/);
    const poster = await revealPosterIdentity(db, admin, { concernId: "seed-safety", reason: "safety follow-up" }, NOW);
    expect(poster.email).toMatch(/^seed-student-\d+@example\.invalid$/);
    expect(db.all(C.IDENTITY_ACCESS_LOG)).toEqual([
      expect.objectContaining({ concernId: "seed-safety", byEmail: ADMIN_EMAIL, reason: "safety follow-up" }),
    ]);
  });
});

describe("HTTP API", () => {
  const routes = {
    overview: () => import("@/app/api/school-forum/overview/route"),
    myConcerns: () => import("@/app/api/school-forum/my-concerns/route"),
    moderation: () => import("@/app/api/school-forum/moderation/route"),
    cycles: () => import("@/app/api/school-forum/cycles/route"),
    identity: () => import("@/app/api/school-forum/admin/identity/route"),
    safety: () => import("@/app/api/school-forum/admin/safety/route"),
    status: () => import("@/app/api/school-forum/admin/status/route"),
    metrics: () => import("@/app/api/school-forum/admin/metrics/route"),
  };

  const call = async (route, method, token, body) => {
    const mod = await routes[route]();
    const headers = { "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` };
    if (token) headers.authorization = `Bearer ${token}`;
    if (body) headers["content-type"] = "application/json";
    const res = await mod[method](
      new Request(`http://localhost/api/school-forum/${route}`, { method, headers, body: body ? JSON.stringify(body) : undefined }),
    );
    return { status: res.status, body: await res.json(), headers: res.headers };
  };

  it("requires sign-in", async () => {
    expect((await call("overview", "GET", null)).status).toBe(401);
    expect((await call("overview", "GET", "forged")).status).toBe(401);
  });

  it("blocks users who aren't on a school roster", async () => {
    const res = await call("overview", "GET", "outsider");
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("not-on-roster");
  });

  it("GET responses to students and moderators contain no identity, and are never cached", async () => {
    for (const [route, token] of [
      ["overview", "poster"],
      ["myConcerns", "poster"],
      ["overview", "moderator"],
      ["moderation", "moderator"],
      ["cycles", "moderator"],
    ]) {
      const res = await call(route, "GET", token);
      expect(res.status, `${route} as ${token}`).toBe(200);
      expect(res.headers.get("cache-control")).toContain("no-store");
      expectNoIdentity(res.body, db);
    }
  });

  it("moderators are refused every admin endpoint", async () => {
    expect((await call("identity", "POST", "moderator", { concernId: "seed-safety", reason: "just curious" })).status).toBe(403);
    expect((await call("safety", "GET", "moderator")).status).toBe(403);
    expect((await call("status", "GET", "moderator")).status).toBe(403);
    expect((await call("metrics", "GET", "moderator")).status).toBe(403);
  });

  it("students are refused moderation and admin endpoints", async () => {
    expect((await call("moderation", "GET", "poster")).status).toBe(403);
    expect((await call("identity", "POST", "poster", { concernId: "seed-safety", reason: "just curious" })).status).toBe(403);
  });

  it("a site admin who isn't a forum admin can't reveal posters", async () => {
    expect((await call("identity", "POST", "siteAdmin", { concernId: "seed-safety", reason: "just curious" })).status).toBe(403);
  });

  it("forum admins can reveal through the API", async () => {
    const res = await call("identity", "POST", "admin", { concernId: "seed-safety", reason: "safety follow-up" });
    expect(res.status).toBe(200);
    expect(res.body.poster.email).toMatch(/@example\.invalid$/);
  });
});
