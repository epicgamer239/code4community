import { describe, expect, it } from "vitest";
import { planSeminarMembershipTrim } from "@/lib/club-hub/seminarDataReconcileAdmin";

describe("planSeminarMembershipTrim", () => {
  it("keeps earliest gold and earliest maroon", () => {
    const { keep, remove } = planSeminarMembershipTrim([
      {
        id: "mock-trial__u",
        clubSlug: "mock-trial",
        clubName: "Mock Trial",
        userId: "u",
        memberGroups: [],
        seminarDays: ["gold"],
        joinedAt: { toMillis: () => 200 },
      },
      {
        id: "best-buddies__u",
        clubSlug: "best-buddies",
        clubName: "Best Buddies",
        userId: "u",
        memberGroups: [],
        seminarDays: ["maroon"],
        joinedAt: { toMillis: () => 100 },
      },
      {
        id: "deca__u",
        clubSlug: "deca",
        clubName: "DECA",
        userId: "u",
        memberGroups: [],
        seminarDays: ["maroon"],
        joinedAt: { toMillis: () => 300 },
      },
    ]);
    expect(keep.map((row) => row.membership.clubSlug).sort()).toEqual([
      "best-buddies",
      "mock-trial",
    ]);
    expect(remove.map((row) => row.membership.clubSlug)).toEqual(["deca"]);
  });
});

