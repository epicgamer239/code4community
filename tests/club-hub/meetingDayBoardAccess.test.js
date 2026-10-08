import { describe, expect, it } from "vitest";
import {
  canPickClubForGoldMeetingDay,
  canPickClubForMaroonMeetingDay,
  FIRESTORE_GOLD_MEETING_BOARD_ONLY_SLUGS,
  FIRESTORE_MAROON_MEETING_BOARD_ONLY_SLUGS,
  requiresBoardForGoldMeetingPick,
  requiresBoardForMaroonMeetingPick,
} from "@/lib/club-hub/meetingDayBoardAccess";

describe("meetingDayBoardAccess", () => {
  it("requires board for Interact Maroon pick only", () => {
    expect(requiresBoardForMaroonMeetingPick("interact")).toBe(true);
    expect(requiresBoardForGoldMeetingPick("interact")).toBe(false);
  });

  it("allows all BSU members on Gold but board only on Maroon", () => {
    expect(requiresBoardForGoldMeetingPick("black-student-union-bsu")).toBe(false);
    expect(requiresBoardForMaroonMeetingPick("black-student-union-bsu")).toBe(true);
  });

  it("filters meeting options by board group", () => {
    const member = { clubSlug: "interact", memberGroups: [] };
    const board = { clubSlug: "interact", memberGroups: ["board"] };
    expect(canPickClubForMaroonMeetingDay(member)).toBe(false);
    expect(canPickClubForMaroonMeetingDay(board)).toBe(true);
  });

  it("exports Firestore slug lists aligned with requiresBoard helpers", () => {
    for (const slug of FIRESTORE_GOLD_MEETING_BOARD_ONLY_SLUGS) {
      expect(requiresBoardForGoldMeetingPick(slug)).toBe(true);
    }
    for (const slug of FIRESTORE_MAROON_MEETING_BOARD_ONLY_SLUGS) {
      expect(requiresBoardForMaroonMeetingPick(slug)).toBe(true);
    }
    expect(FIRESTORE_MAROON_MEETING_BOARD_ONLY_SLUGS).toContain("interact");
  });
});
