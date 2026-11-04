import { describe, expect, it } from "vitest";
import { BROAD_RUN_EMAIL_TO_NAME } from "@/lib/club-hub/broadRunRoster";
import { MODERATION_ACTIONS, assertCanModerate } from "@/lib/school-forum/moderation";
import {
  FORUM_ACTIONS as A,
  forumCan,
  hasForumRole,
  resolveForumContext,
} from "@/lib/school-forum/permissions";

const ROSTER_EMAIL = Object.keys(BROAD_RUN_EMAIL_TO_NAME)[0];

const ctx = (role, extra = {}) => ({
  uid: `${role}-uid`,
  email: `${role}@lcps.org`,
  schoolId: "broad-run",
  role,
  onRoster: true,
  isSiteAdmin: false,
  ...extra,
});

describe("resolveForumContext", () => {
  it("gives roster students the student role at their school", () => {
    const c = resolveForumContext({ uid: "u1", email: ROSTER_EMAIL.toUpperCase() });
    expect(c).toMatchObject({ schoolId: "broad-run", role: "student", onRoster: true });
  });

  it("gives non-roster users no school and no role", () => {
    const c = resolveForumContext({ uid: "u2", email: "someone@gmail.com" });
    expect(c.schoolId).toBeNull();
    expect(c.role).toBeNull();
    expect(forumCan(c, A.VIEW_BOARD)).toBe(false);
  });

  it("uses staff appointments over the roster", () => {
    const c = resolveForumContext({
      uid: "u3",
      email: ROSTER_EMAIL,
      staffRecords: [{ schoolId: "broad-run", role: "moderator" }],
    });
    expect(c.role).toBe("moderator");
    expect(c.onRoster).toBe(true);
  });

  it("lets staff who aren't on the roster moderate but not post or vote", () => {
    const c = resolveForumContext({
      uid: "t1",
      email: "teacher@lcps.org",
      staffRecords: [{ schoolId: "broad-run", role: "admin" }],
    });
    expect(forumCan(c, A.CHANGE_STATUS)).toBe(true);
    expect(forumCan(c, A.POST)).toBe(false);
    expect(forumCan(c, A.VOTE)).toBe(false);
  });

  it("ignores staff records for unknown schools or roles", () => {
    const c = resolveForumContext({
      uid: "u4",
      email: "x@lcps.org",
      staffRecords: [{ schoolId: "nowhere", role: "admin" }, { schoolId: "broad-run", role: "owner" }],
    });
    expect(c.role).toBeNull();
  });
});

describe("forumCan role matrix", () => {
  const student = ctx("student");
  const moderator = ctx("moderator");
  const admin = ctx("admin");

  it("students can view, post and vote only", () => {
    expect(forumCan(student, A.VIEW_BOARD)).toBe(true);
    expect(forumCan(student, A.POST)).toBe(true);
    expect(forumCan(student, A.VOTE)).toBe(true);
    for (const action of [A.MODERATE, A.VIEW_IDENTITY, A.MANAGE_CYCLES, A.CHANGE_STATUS, A.VIEW_METRICS, A.VIEW_SAFETY_QUEUE]) {
      expect(forumCan(student, action)).toBe(false);
    }
  });

  it("moderators can moderate and flag, but not see identity, safety queue, cycles, statuses or metrics", () => {
    expect(forumCan(moderator, A.MODERATE)).toBe(true);
    expect(forumCan(moderator, A.FLAG_FOR_PRESENTATION)).toBe(true);
    for (const action of [A.VIEW_IDENTITY, A.VIEW_SAFETY_QUEUE, A.MANAGE_CYCLES, A.CHANGE_STATUS, A.VIEW_METRICS, A.MANAGE_STAFF]) {
      expect(forumCan(moderator, action)).toBe(false);
    }
  });

  it("admins can do everything", () => {
    for (const action of Object.values(A)) expect(forumCan(admin, action)).toBe(true);
  });

  it("site admins without a forum role can only manage staff (no identity access)", () => {
    const siteAdmin = { ...ctx(null), schoolId: null, role: null, onRoster: false, isSiteAdmin: true };
    expect(forumCan(siteAdmin, A.MANAGE_STAFF)).toBe(true);
    expect(forumCan(siteAdmin, A.VIEW_IDENTITY)).toBe(false);
    expect(forumCan(siteAdmin, A.MODERATE)).toBe(false);
  });

  it("a site admin who is a student still can't see identity", () => {
    const c = ctx("student", { isSiteAdmin: true });
    expect(forumCan(c, A.VIEW_IDENTITY)).toBe(false);
  });

  it("ranks roles", () => {
    expect(hasForumRole(admin, "moderator")).toBe(true);
    expect(hasForumRole(moderator, "admin")).toBe(false);
    expect(hasForumRole(null, "student")).toBe(false);
  });
});

describe("moderation permissions", () => {
  const pending = { id: "c1", schoolId: "broad-run", state: "pending" };
  const approved = { id: "c2", schoolId: "broad-run", state: "approved" };

  it("students can't moderate", () => {
    expect(() => assertCanModerate(ctx("student"), pending, MODERATION_ACTIONS.APPROVE)).toThrow(/moderators/);
  });

  it("moderators and admins can approve pending posts", () => {
    expect(() => assertCanModerate(ctx("moderator"), pending, MODERATION_ACTIONS.APPROVE)).not.toThrow();
    expect(() => assertCanModerate(ctx("admin"), pending, MODERATION_ACTIONS.APPROVE)).not.toThrow();
  });

  it("hides other schools' posts as not found", () => {
    const other = { ...pending, schoolId: "other-school" };
    expect(() => assertCanModerate(ctx("moderator"), other, MODERATION_ACTIONS.APPROVE)).toThrow(/could not be found/);
  });

  it("moderators can't touch safety-flagged posts", () => {
    const safety = { ...pending, state: "safety" };
    expect(() => assertCanModerate(ctx("moderator"), safety, MODERATION_ACTIONS.APPROVE)).toThrow(/admins only/);
    expect(() => assertCanModerate(ctx("moderator"), safety, MODERATION_ACTIONS.EDIT)).toThrow(/admins only/);
  });

  it("can't approve twice", () => {
    expect(() => assertCanModerate(ctx("moderator"), approved, MODERATION_ACTIONS.APPROVE)).toThrow();
  });

  it("merges only into an approved concern at the same school", () => {
    expect(() => assertCanModerate(ctx("moderator"), pending, MODERATION_ACTIONS.MERGE, approved)).not.toThrow();
    expect(() => assertCanModerate(ctx("moderator"), pending, MODERATION_ACTIONS.MERGE, { ...pending, id: "c3" })).toThrow(/already on the board/);
    expect(() => assertCanModerate(ctx("moderator"), approved, MODERATION_ACTIONS.MERGE, approved)).toThrow(/itself/);
    expect(() =>
      assertCanModerate(ctx("moderator"), pending, MODERATION_ACTIONS.MERGE, { ...approved, schoolId: "other-school" }),
    ).toThrow(/could not be found/);
  });
});
