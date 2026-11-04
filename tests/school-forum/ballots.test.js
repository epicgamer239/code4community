import { describe, expect, it } from "vitest";
import {
  applyBallotChange,
  countUniqueVoters,
  normalizeBallotIds,
  remapBallotForMerge,
  tallyBallots,
} from "@/lib/school-forum/ballots";

const open = { cycleOpen: true, isEligible: () => true };

describe("vote limits", () => {
  it("adds votes up to 3", () => {
    let ids = [];
    ids = applyBallotChange(ids, { concernId: "a", action: "add" }, open);
    ids = applyBallotChange(ids, { concernId: "b", action: "add" }, open);
    ids = applyBallotChange(ids, { concernId: "c", action: "add" }, open);
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("rejects a 4th vote", () => {
    expect(() => applyBallotChange(["a", "b", "c"], { concernId: "d", action: "add" }, open)).toThrow(/all 3 votes/);
  });

  it("allows at most one vote per concern", () => {
    expect(() => applyBallotChange(["a"], { concernId: "a", action: "add" }, open)).toThrow(/already voted/);
  });

  it("lets students change votes while the cycle is open", () => {
    let ids = applyBallotChange(["a", "b", "c"], { concernId: "b", action: "remove" }, open);
    ids = applyBallotChange(ids, { concernId: "d", action: "add" }, open);
    expect(ids).toEqual(["a", "c", "d"]);
  });

  it("locks votes once the cycle closes", () => {
    const closed = { cycleOpen: false, isEligible: () => true };
    expect(() => applyBallotChange([], { concernId: "a", action: "add" }, closed)).toThrow(/closed/);
    expect(() => applyBallotChange(["a"], { concernId: "a", action: "remove" }, closed)).toThrow(/closed/);
  });

  it("rejects votes for ineligible concerns", () => {
    expect(() =>
      applyBallotChange([], { concernId: "x", action: "add" }, { cycleOpen: true, isEligible: () => false }),
    ).toThrow(/isn't open for voting/);
  });

  it("can remove a vote from a concern that is no longer eligible", () => {
    expect(
      applyBallotChange(["x"], { concernId: "x", action: "remove" }, { cycleOpen: true, isEligible: () => false }),
    ).toEqual([]);
  });

  it("errors on removing a vote that doesn't exist", () => {
    expect(() => applyBallotChange([], { concernId: "a", action: "remove" }, open)).toThrow(/haven't voted/);
  });

  it("normalizes tampered stored ballots", () => {
    expect(normalizeBallotIds(["a", "a", 5, "", "b", "c", "d"])).toEqual(["a", "b", "c"]);
    expect(normalizeBallotIds(null)).toEqual([]);
  });
});

describe("tallies", () => {
  it("counts votes per concern and unique voters", () => {
    const ballots = [{ concernIds: ["a", "b"] }, { concernIds: ["a"] }, { concernIds: [] }];
    expect(tallyBallots(ballots)).toEqual({ a: 2, b: 1 });
    expect(countUniqueVoters(ballots)).toBe(2);
  });
});

describe("merge vote combining", () => {
  it("moves a vote from the duplicate to the target", () => {
    expect(remapBallotForMerge(["dup", "x"], "dup", "main")).toEqual({ ids: ["main", "x"], changed: true });
  });

  it("refunds the vote when the voter already voted for the target", () => {
    expect(remapBallotForMerge(["dup", "main"], "dup", "main")).toEqual({ ids: ["main"], changed: true });
  });

  it("leaves unrelated ballots alone", () => {
    expect(remapBallotForMerge(["x"], "dup", "main")).toEqual({ ids: ["x"], changed: false });
  });
});
