import { describe, expect, it } from "vitest";
import { extractScoreFromLine, matchOutOfScore } from "@/lib/grade-calculator/extractScore";
import { isDuplicateAssignment, pushAssignmentIfNew } from "@/lib/grade-calculator/assignmentRecords";

describe("grade-calculator extractScore", () => {
  it("matches out-of scores in text", () => {
    expect(matchOutOfScore("105 out of 100.0000")).toEqual({ earned: 105, possible: 100 });
  });

  it("prefers Raw Score over earlier out-of on a line scan", () => {
    let state = { foundScore: false, earned: 0, possible: 0 };
    state = extractScoreFromLine("39 out of 40", state);
    expect(state).toEqual({ foundScore: true, earned: 39, possible: 40 });
    state = extractScoreFromLine("Raw Score 9.75/10", state);
    expect(state).toEqual({ foundScore: true, earned: 9.75, possible: 10 });
  });
});

describe("grade-calculator assignmentRecords", () => {
  it("skips duplicate assignments", () => {
    const list = [];
    pushAssignmentIfNew(list, {
      date: "1/2/25",
      name: "Quiz 1",
      category: "Minor Summative",
      earned: 10,
      possible: 10,
    });
    expect(list).toHaveLength(1);
    expect(
      isDuplicateAssignment(list, "1/2/25", "Quiz 1", 10),
    ).toBe(true);
    pushAssignmentIfNew(list, {
      date: "1/2/25",
      name: "Quiz 1",
      category: "Minor Summative",
      earned: 10,
      possible: 10,
    });
    expect(list).toHaveLength(1);
  });
});
