import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FORUM_COLLECTIONS as C } from "@/lib/school-forum/constants";
import { FORUM_SCHOOLS } from "@/lib/school-forum/schools";
import {
  changeConcernStatus,
  changeVote,
  closeCycleNow,
  createCycle,
  getForumOverview,
  getMetrics,
  listCycles,
  listModerationQueue,
  listMyConcerns,
  moderateConcern,
  setPresentationFlag,
  setStaffRole,
  submitConcern,
} from "@/lib/school-forum/forumServer";
import { buildForumSeed } from "@/lib/school-forum/seedData";
import { FakeFirestore } from "./fakeFirestore";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 30, 15);

const ctx = (role, n = 1, extra = {}) => ({
  uid: `${role}-${n}`,
  email: `${role}-${n}@lcps.org`,
  schoolId: "broad-run",
  role,
  onRoster: true,
  isSiteAdmin: false,
  ...extra,
});
const student = (n = 1) => ctx("student", n);
const moderator = ctx("moderator");
const admin = ctx("admin");

const VALID_POST = {
  title: "Broken lockers in the 300 hall",
  body: "About a dozen lockers in the 300 hall won't open, so students carry everything all day.",
  category: "school",
};

let db;

async function postAndApprove(c = student(), input = VALID_POST, now = NOW) {
  const own = await submitConcern(db, c, input, now);
  await moderateConcern(db, moderator, { concernId: own.id, action: "approve" }, now);
  return own.id;
}

async function openCycle(now = NOW) {
  return (await createCycle(db, admin, { label: "Test cycle", startsAt: new Date(now - DAY) .toISOString(), endsAt: new Date(now + 13 * DAY).toISOString() }, now - 2 * DAY)).id;
}

beforeEach(() => {
  db = new FakeFirestore();
});

describe("posting and moderation", () => {
  it("new posts are pending and not on the public board", async () => {
    const own = await submitConcern(db, student(), VALID_POST, NOW);
    expect(own.state).toBe("pending");
    const overview = await getForumOverview(db, student(2), NOW);
    expect(overview.concerns).toHaveLength(0);
  });

  it("approved posts appear on the board", async () => {
    await postAndApprove();
    const overview = await getForumOverview(db, student(2), NOW);
    expect(overview.concerns.map((c) => c.title)).toEqual([VALID_POST.title]);
  });

  it("validates posts on the server", async () => {
    await expect(submitConcern(db, student(), { title: "x", body: "short", category: "nope" }, NOW)).rejects.toMatchObject({
      status: 400,
      fieldErrors: { title: expect.any(String), body: expect.any(String), category: expect.any(String) },
    });
  });

  it("only roster students can post", async () => {
    const teacherAdmin = ctx("admin", 9, { onRoster: false });
    await expect(submitConcern(db, teacherAdmin, VALID_POST, NOW)).rejects.toMatchObject({ status: 403 });
  });

  it("students can't moderate", async () => {
    const own = await submitConcern(db, student(), VALID_POST, NOW);
    await expect(moderateConcern(db, student(2), { concernId: own.id, action: "approve" }, NOW)).rejects.toMatchObject({ status: 403 });
    await expect(listModerationQueue(db, student(2))).rejects.toMatchObject({ status: 403 });
  });

  it("rejection reason reaches the poster", async () => {
    const own = await submitConcern(db, student(), VALID_POST, NOW);
    await moderateConcern(db, moderator, { concernId: own.id, action: "reject", reason: "Please don't name staff." }, NOW);
    const mine = await listMyConcerns(db, student());
    expect(mine[0]).toMatchObject({ state: "rejected", rejectionReason: "Please don't name staff." });
  });

  it("edits keep the original wording", async () => {
    const id = await postAndApprove();
    await moderateConcern(db, moderator, { concernId: id, action: "edit", ...VALID_POST, title: "Lockers in the 300 hall won't open" }, NOW);
    await moderateConcern(db, moderator, { concernId: id, action: "edit", ...VALID_POST, title: "Second edit of the locker post" }, NOW);
    const queue = await listModerationQueue(db, moderator);
    expect(queue.approved[0].title).toBe("Second edit of the locker post");
    expect(queue.approved[0].original.title).toBe(VALID_POST.title);
  });

  it("safety flags hide the post, route it to admins, and show the poster a counselor message", async () => {
    const id = await postAndApprove();
    await moderateConcern(db, moderator, { concernId: id, action: "safety", note: "possible bullying" }, NOW);
    expect((await getForumOverview(db, student(2), NOW)).concerns).toHaveLength(0);
    const mine = await listMyConcerns(db, student());
    expect(mine[0].safetyMessage).toMatch(/counselor/);
    // Moderators can no longer act on it.
    await expect(moderateConcern(db, moderator, { concernId: id, action: "approve" }, NOW)).rejects.toMatchObject({ status: 403 });
  });
});

describe("voting through the server", () => {
  it("enforces 3 votes, 1 per concern, during an open cycle", async () => {
    await openCycle();
    const ids = [];
    for (let i = 0; i < 4; i++) {
      ids.push(await postAndApprove(student(10 + i), { ...VALID_POST, title: `Concern number ${i + 1} title` }));
    }
    const voter = student(1);
    for (const id of ids.slice(0, 3)) await changeVote(db, voter, { concernId: id, action: "add" }, NOW);
    await expect(changeVote(db, voter, { concernId: ids[3], action: "add" }, NOW)).rejects.toThrow(/all 3 votes/);
    await expect(changeVote(db, voter, { concernId: ids[0], action: "add" }, NOW)).rejects.toThrow(/already voted/);

    const res = await changeVote(db, voter, { concernId: ids[0], action: "remove" }, NOW);
    expect(res.votesLeft).toBe(1);
    await changeVote(db, voter, { concernId: ids[3], action: "add" }, NOW);

    const overview = await getForumOverview(db, voter, NOW);
    expect(overview.myVotes.sort()).toEqual([ids[1], ids[2], ids[3]].sort());
  });

  it("rejects votes when no cycle is open, and on pending concerns", async () => {
    const id = await postAndApprove();
    await expect(changeVote(db, student(2), { concernId: id, action: "add" }, NOW)).rejects.toThrow(/no open cycle/);
    await openCycle();
    const pending = await submitConcern(db, student(3), VALID_POST, NOW);
    await expect(changeVote(db, student(2), { concernId: pending.id, action: "add" }, NOW)).rejects.toThrow(/isn't open for voting/);
  });

  it("closes the cycle at its end date: votes lock and results are ranked", async () => {
    await openCycle();
    const a = await postAndApprove(student(5), { ...VALID_POST, title: "First concern title" });
    const b = await postAndApprove(student(6), { ...VALID_POST, title: "Second concern title" });
    await changeVote(db, student(1), { concernId: b, action: "add" }, NOW);
    await changeVote(db, student(2), { concernId: b, action: "add" }, NOW);
    await changeVote(db, student(3), { concernId: a, action: "add" }, NOW);

    const after = NOW + 14 * DAY;
    await expect(changeVote(db, student(1), { concernId: b, action: "remove" }, after)).rejects.toThrow(/closed|no open cycle/);

    const [cycle] = await listCycles(db, moderator, after);
    expect(cycle.phase).toBe("closed");
    expect(cycle.summary.map((r) => [r.concernId, r.votes, r.rank])).toEqual([
      [b, 2, 1],
      [a, 1, 2],
    ]);
    expect(cycle.uniqueVoters).toBe(3);
  });

  it("unaddressed concerns carry over and votes reset in the next cycle", async () => {
    const first = await openCycle();
    const id = await postAndApprove();
    await changeVote(db, student(2), { concernId: id, action: "add" }, NOW);
    await closeCycleNow(db, admin, { cycleId: first }, NOW + DAY);

    const later = NOW + 2 * DAY;
    await createCycle(db, admin, { startsAt: new Date(later).toISOString() }, later);
    const overview = await getForumOverview(db, student(2), later + 1000);
    expect(overview.cycle).not.toBeNull();
    expect(overview.myVotes).toEqual([]);
    expect(overview.concerns[0]).toMatchObject({ id, votes: 0 });
    await changeVote(db, student(2), { concernId: id, action: "add" }, later + 1000);
  });

  it("merging moves votes to the target and refunds double votes", async () => {
    await openCycle();
    const main = await postAndApprove(student(5), { ...VALID_POST, title: "Main concern title" });
    const dup = await postAndApprove(student(6), { ...VALID_POST, title: "Duplicate concern title" });
    await changeVote(db, student(1), { concernId: dup, action: "add" }, NOW);
    await changeVote(db, student(2), { concernId: dup, action: "add" }, NOW);
    await changeVote(db, student(2), { concernId: main, action: "add" }, NOW);

    await moderateConcern(db, moderator, { concernId: dup, action: "merge", targetId: main }, NOW);
    const overview = await getForumOverview(db, student(2), NOW);
    expect(overview.concerns.map((c) => [c.id, c.votes, c.mergedCount])).toEqual([[main, 2, 1]]);
    expect(overview.myVotes).toEqual([main]);
  });

  it("moderators can flag low-vote concerns for the presentation", async () => {
    const cycleId = await openCycle();
    const id = await postAndApprove();
    await setPresentationFlag(db, moderator, { cycleId, concernId: id, flagged: true }, NOW);
    await closeCycleNow(db, admin, { cycleId }, NOW + 1000);
    const [cycle] = await listCycles(db, moderator, NOW + 2000);
    expect(cycle.summary).toEqual([expect.objectContaining({ concernId: id, votes: 0, addedByFlag: true })]);
    await expect(setPresentationFlag(db, student(), { cycleId, concernId: id, flagged: true }, NOW)).rejects.toMatchObject({ status: 403 });
  });

  it("only admins manage cycles", async () => {
    await expect(createCycle(db, moderator, { startsAt: new Date(NOW).toISOString() }, NOW)).rejects.toMatchObject({ status: 403 });
    const id = await openCycle();
    await expect(closeCycleNow(db, moderator, { cycleId: id }, NOW)).rejects.toMatchObject({ status: 403 });
  });
});

describe("status board", () => {
  it("requires an admin response after Presented and shows it publicly", async () => {
    const id = await postAndApprove();
    await changeConcernStatus(db, admin, { concernId: id, status: "presented" }, NOW);
    await expect(changeConcernStatus(db, admin, { concernId: id, status: "in_progress" }, NOW)).rejects.toThrow(/public response/);
    await changeConcernStatus(db, admin, { concernId: id, status: "in_progress", response: "Facilities ordered new lockers." }, NOW);
    const [concern] = (await getForumOverview(db, student(2), NOW)).concerns;
    expect(concern.publicStatus).toBe("in_progress");
    expect(concern.responses).toEqual([expect.objectContaining({ status: "in_progress", text: "Facilities ordered new lockers." })]);
  });

  it("moderators can't change statuses", async () => {
    const id = await postAndApprove();
    await expect(changeConcernStatus(db, moderator, { concernId: id, status: "presented" }, NOW)).rejects.toMatchObject({ status: 403 });
  });
});

describe("school isolation", () => {
  beforeAll(() => {
    FORUM_SCHOOLS["other-school"] = {
      id: "other-school",
      name: "Other High School",
      shortName: "OHS",
      isOnRoster: () => false,
      lookupName: () => null,
    };
  });
  afterAll(() => {
    delete FORUM_SCHOOLS["other-school"];
  });

  const otherAdmin = { ...admin, uid: "other-admin", email: "other-admin@lcps.org", schoolId: "other-school" };
  const otherStudent = { ...student(50), schoolId: "other-school" };

  it("other schools can't see or act on concerns", async () => {
    await openCycle();
    const id = await postAndApprove();
    expect((await getForumOverview(db, otherStudent, NOW)).concerns).toHaveLength(0);
    await expect(changeVote(db, otherStudent, { concernId: id, action: "add" }, NOW)).rejects.toThrow(/no open cycle|isn't open/);
    await expect(moderateConcern(db, { ...otherAdmin, role: "moderator" }, { concernId: id, action: "reject", reason: "nope nope" }, NOW)).rejects.toMatchObject({ status: 404 });
    await expect(changeConcernStatus(db, otherAdmin, { concernId: id, status: "presented" }, NOW)).rejects.toMatchObject({ status: 404 });
  });

  it("forum admins can only appoint staff at their own school", async () => {
    await setStaffRole(db, admin, { email: "mod@lcps.org", role: "moderator" }, NOW);
    await expect(setStaffRole(db, admin, { schoolId: "other-school", email: "x@lcps.org", role: "admin" }, NOW)).rejects.toMatchObject({
      status: 403,
    });
    await expect(setStaffRole(db, otherAdmin, { email: "mod@lcps.org", role: "moderator" }, NOW)).rejects.toThrow(/another school/);
  });
});

describe("metrics", () => {
  it("counts per-cycle activity from the seed data", async () => {
    db.load(buildForumSeed({ schoolId: "broad-run", now: NOW }));
    const rows = await getMetrics(db, admin, NOW);
    expect(rows.map((r) => r.label)).toEqual(["Cycle 1", "Cycle 2"]);
    const [c1, c2] = rows;
    expect(c1.uniqueVoters).toBeGreaterThan(0);
    // Presented and resolved after cycle 1 closed but before cycle 2 opened: still cycle 1's.
    expect(c1.concernsPresented).toBe(4);
    expect(c1.concernsResolved).toBe(1);
    expect(c2.concernsPresented).toBe(0);
    expect(c2.uniqueVoters).toBeGreaterThan(0);
    expect(c2.postsSubmitted).toBeGreaterThan(0);
    expect(c2.safetyFlagged).toBe(1);
    await expect(getMetrics(db, moderator, NOW)).rejects.toMatchObject({ status: 403 });
  });

  it("seed data lands in every state and the board shows only approved posts", async () => {
    db.load(buildForumSeed({ schoolId: "broad-run", now: NOW }));
    const states = new Set(db.all(C.CONCERNS).map((c) => c.state));
    expect([...states].sort()).toEqual(["approved", "merged", "pending", "rejected", "safety"]);
    const overview = await getForumOverview(db, student(), NOW);
    expect(overview.cycle?.label).toBe("Cycle 2");
    expect(overview.concerns.every((c) => c.id.startsWith("seed-"))).toBe(true);
    expect(overview.concerns).toHaveLength(13);
    expect(overview.latestResults.results.some((r) => r.addedByFlag)).toBe(true);
  });
});
