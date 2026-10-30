import { afterEach, describe, expect, it } from "vitest";
import { setMeetingDayOverrides } from "@/lib/club-hub/clubDirectorySections";
import {
  getSeminarMembershipJoinError,
  meetingChoicesFromMemberships,
} from "@/lib/club-hub/seminarMembershipLimit";

describe("seminarMembershipLimit", () => {
  afterEach(() => {
    setMeetingDayOverrides({});
  });

  it("derives one gold and one maroon club from memberships", () => {
    expect(
      meetingChoicesFromMemberships([
        { clubSlug: "sports-talk", clubName: "Sports Talk", memberGroups: [] },
        { clubSlug: "yarn-arts-club", clubName: "Yarn Arts Club", memberGroups: [] },
        { clubSlug: "baking-club", clubName: "Baking Club", memberGroups: [] },
      ]),
    ).toEqual({
      goldClubSlug: "sports-talk",
      maroonClubSlug: "yarn-arts-club",
    });
  });

  it("blocks joining a second gold day club", () => {
    const err = getSeminarMembershipJoinError(
      [{ clubSlug: "sports-talk", clubName: "Sports Talk", memberGroups: [] }],
      "deca",
      { seminarDays: ["gold"] },
    );
    expect(err).toMatch(/one Gold day club/i);
  });

  it("allows joining a both-day club for maroon only when gold is taken", () => {
    expect(
      getSeminarMembershipJoinError(
        [{ clubSlug: "sports-talk", clubName: "Sports Talk", memberGroups: [] }],
        "code4community",
        { seminarDays: ["maroon"] },
      ),
    ).toBe("");
  });

  it("requires a day choice for both-day clubs", () => {
    expect(getSeminarMembershipJoinError([], "code4community")).toMatch(/Pick Gold days/i);
  });

  it("allows joining a maroon club when gold is already joined", () => {
    expect(
      getSeminarMembershipJoinError(
        [{ clubSlug: "sports-talk", clubName: "Sports Talk", memberGroups: [] }],
        "yarn-arts-club",
      ),
    ).toBe("");
  });

  it("allows unlimited general clubs", () => {
    expect(
      getSeminarMembershipJoinError(
        [
          { clubSlug: "sports-talk", memberGroups: [] },
          { clubSlug: "yarn-arts-club", memberGroups: [] },
        ],
        "baking-club",
      ),
    ).toBe("");
  });

  it("blocks self-join for board-invite-only clubs like Key Club", () => {
    expect(getSeminarMembershipJoinError([], "key-club")).toMatch(/board only/i);
    expect(
      getSeminarMembershipJoinError(
        [
          {
            clubSlug: "code4community",
            clubName: "Code4Community",
            memberGroups: [],
            seminarDays: ["gold"],
          },
        ],
        "key-club",
      ),
    ).toMatch(/board only/i);
  });

  it("does not count board-only seminar slots without board group", () => {
    expect(
      getSeminarMembershipJoinError(
        [{ clubSlug: "key-club", clubName: "Key Club", memberGroups: [] }],
        "sports-talk",
      ),
    ).toBe("");
    expect(
      meetingChoicesFromMemberships([
        { clubSlug: "key-club", clubName: "Key Club", memberGroups: [] },
      ]),
    ).toEqual({ goldClubSlug: "", maroonClubSlug: "" });
  });

  it("counts Key Club as Gold seminar only for board members", () => {
    expect(
      meetingChoicesFromMemberships([
        {
          clubSlug: "key-club",
          clubName: "Key Club",
          memberGroups: ["board"],
          seminarDays: ["gold"],
        },
      ]),
    ).toEqual({ goldClubSlug: "key-club", maroonClubSlug: "" });
    expect(
      getSeminarMembershipJoinError(
        [
          {
            clubSlug: "key-club",
            clubName: "Key Club",
            memberGroups: ["board"],
            seminarDays: ["gold"],
          },
        ],
        "sports-talk",
      ),
    ).toMatch(/one Gold day club/i);
  });

  it("honors seminarDays on a both-day membership", () => {
    expect(
      meetingChoicesFromMemberships([
        {
          clubSlug: "code4community",
          clubName: "Code4Community",
          memberGroups: [],
          seminarDays: ["gold"],
        },
      ]),
    ).toEqual({ goldClubSlug: "code4community", maroonClubSlug: "" });
  });
});
