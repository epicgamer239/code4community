import { describe, expect, it } from "vitest";
import {
  CYCLE_PHASES,
  cyclePhase,
  cyclesNeedingClose,
  defaultCycleEnd,
  findOpenCycle,
  isVoteEligibleConcern,
  isVotingOpen,
  rankConcerns,
  summarizeResults,
  validateNewCycle,
} from "@/lib/school-forum/cycles";
import {
  statusChangeRequiresResponse,
  validateStatusChange,
} from "@/lib/school-forum/statusTransitions";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 30, 15);
const cycle = (startDays, endDays, extra = {}) => ({
  id: `c${startDays}`,
  startsAt: new Date(NOW + startDays * DAY),
  endsAt: new Date(NOW + endDays * DAY),
  ...extra,
});

describe("cycle open/close", () => {
  it("defaults to 14 days", () => {
    expect(defaultCycleEnd(NOW) - NOW).toBe(14 * DAY);
  });

  it("is scheduled before start, open during, ended after, closed once closed", () => {
    expect(cyclePhase(cycle(1, 15), NOW)).toBe(CYCLE_PHASES.SCHEDULED);
    expect(cyclePhase(cycle(-1, 13), NOW)).toBe(CYCLE_PHASES.OPEN);
    expect(cyclePhase(cycle(-15, -1), NOW)).toBe(CYCLE_PHASES.ENDED);
    expect(cyclePhase(cycle(-1, 13, { closedAt: new Date(NOW) }), NOW)).toBe(CYCLE_PHASES.CLOSED);
  });

  it("voting opens exactly at start and locks exactly at end", () => {
    const c = cycle(0, 14);
    expect(isVotingOpen(c, NOW - 1)).toBe(false);
    expect(isVotingOpen(c, NOW)).toBe(true);
    expect(isVotingOpen(c, NOW + 14 * DAY - 1)).toBe(true);
    expect(isVotingOpen(c, NOW + 14 * DAY)).toBe(false);
  });

  it("an early close locks voting immediately", () => {
    expect(isVotingOpen(cycle(-1, 13, { closedAt: new Date(NOW - 1000) }), NOW)).toBe(false);
  });

  it("finds the open cycle and those needing to close", () => {
    const cycles = [cycle(-30, -16, { closedAt: new Date(NOW - 16 * DAY) }), cycle(-15, -1), cycle(0, 14)];
    expect(findOpenCycle(cycles, NOW).id).toBe("c0");
    expect(cyclesNeedingClose(cycles, NOW).map((c) => c.id)).toEqual(["c-15"]);
  });

  it("validates new cycles", () => {
    expect(validateNewCycle({ startsAt: new Date(NOW) }, [], NOW)).toEqual({ startMs: NOW, endMs: NOW + 14 * DAY });
    expect(() => validateNewCycle({ startsAt: "nope" }, [], NOW)).toThrow(/start date/);
    expect(() => validateNewCycle({ startsAt: new Date(NOW), endsAt: new Date(NOW - DAY) }, [], NOW)).toThrow(/after the start/);
    expect(() => validateNewCycle({ startsAt: new Date(NOW - 20 * DAY), endsAt: new Date(NOW - DAY) }, [], NOW)).toThrow(/future/);
    expect(() => validateNewCycle({ startsAt: new Date(NOW), endsAt: new Date(NOW + 90 * DAY) }, [], NOW)).toThrow(/at most/);
  });

  it("rejects overlapping cycles but allows back-to-back ones", () => {
    const existing = [cycle(-5, 9)];
    expect(() => validateNewCycle({ startsAt: new Date(NOW + 8 * DAY) }, existing, NOW)).toThrow(/overlap/);
    expect(() => validateNewCycle({ startsAt: new Date(NOW + 9 * DAY) }, existing, NOW)).not.toThrow();
  });

  it("treats an early-closed cycle as ending at its close time", () => {
    const existing = [cycle(-5, 9, { closedAt: new Date(NOW - DAY) })];
    expect(() => validateNewCycle({ startsAt: new Date(NOW) }, existing, NOW)).not.toThrow();
  });
});

describe("carry-over and results", () => {
  it("only approved, still-open concerns carry over into voting", () => {
    expect(isVoteEligibleConcern({ state: "approved", publicStatus: "open" })).toBe(true);
    expect(isVoteEligibleConcern({ state: "approved" })).toBe(true);
    expect(isVoteEligibleConcern({ state: "approved", publicStatus: "presented" })).toBe(false);
    expect(isVoteEligibleConcern({ state: "pending", publicStatus: "open" })).toBe(false);
    expect(isVoteEligibleConcern({ state: "merged", publicStatus: "open" })).toBe(false);
  });

  const concerns = [
    { id: "a", title: "A", category: "school", createdAt: new Date(NOW - 3 * DAY) },
    { id: "b", title: "B", category: "school", createdAt: new Date(NOW - 2 * DAY) },
    { id: "c", title: "C", category: "district", createdAt: new Date(NOW - 5 * DAY) },
    { id: "d", title: "D", category: "outside", createdAt: new Date(NOW - DAY) },
  ];

  it("ranks by votes with shared ranks for ties (older post listed first)", () => {
    const ranked = rankConcerns(concerns, { a: 5, b: 9, c: 5 });
    expect(ranked.map((r) => [r.concernId, r.votes, r.rank])).toEqual([
      ["b", 9, 1],
      ["c", 5, 2],
      ["a", 5, 2],
      ["d", 0, 4],
    ]);
  });

  it("summary has the top concerns with votes, plus flagged low-vote ones", () => {
    const ranked = rankConcerns(concerns, { a: 5, b: 9, c: 5 });
    const summary = summarizeResults(ranked, ["d"], 2);
    expect(summary.map((r) => [r.concernId, r.addedByFlag])).toEqual([
      ["b", false],
      ["c", false],
      ["d", true],
    ]);
  });
});

describe("status changes", () => {
  it("only Open → Presented skips the response", () => {
    expect(statusChangeRequiresResponse("open", "presented")).toBe(false);
    expect(statusChangeRequiresResponse("presented", "in_progress")).toBe(true);
    expect(statusChangeRequiresResponse("in_progress", "resolved")).toBe(true);
    expect(statusChangeRequiresResponse("open", "resolved")).toBe(true);
    expect(statusChangeRequiresResponse("presented", "open")).toBe(true);
  });

  it("requires a real response after Presented", () => {
    expect(() => validateStatusChange({ from: "presented", to: "resolved", response: "" })).toThrow(/public response/);
    expect(() => validateStatusChange({ from: "presented", to: "resolved", response: "ok" })).toThrow(/public response/);
    expect(validateStatusChange({ from: "presented", to: "resolved", response: "  Fixed by facilities on Monday. " }).response).toBe(
      "Fixed by facilities on Monday.",
    );
  });

  it("rejects unknown or unchanged statuses", () => {
    expect(() => validateStatusChange({ from: "open", to: "done" })).toThrow(/valid status/);
    expect(() => validateStatusChange({ from: "open", to: "open" })).toThrow(/already/);
  });
});
