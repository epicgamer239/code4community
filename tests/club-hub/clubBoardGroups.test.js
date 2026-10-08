import { describe, expect, it } from "vitest";
import {
  CLUB_MEMBER_GROUP_BOARD,
  clubHasBoardMemberGroup,
} from "@/lib/club-hub/clubBoardGroups";

describe("clubBoardGroups", () => {
  it("marks BSU and Key Club as having a board roster group", () => {
    expect(clubHasBoardMemberGroup("black-student-union-bsu")).toBe(true);
    expect(clubHasBoardMemberGroup("key-club")).toBe(true);
  });

  it("does not mark clubs without board-only fair listings", () => {
    expect(clubHasBoardMemberGroup("tennis-club")).toBe(false);
  });

  it("uses stable board group id", () => {
    expect(CLUB_MEMBER_GROUP_BOARD).toBe("board");
  });
});
