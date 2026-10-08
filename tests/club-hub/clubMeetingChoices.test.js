import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import {
  getMeetingChoiceSwitchError,
  meetingChoiceSwitchNeedsCooldown,
  MEETING_CHOICE_SWITCH_COOLDOWN_MS,
  validateMeetingChoices,
} from "@/lib/club-hub/clubMeetingChoices";

describe("validateMeetingChoices", () => {
  const joined = new Set(["deca", "anime-club"]);

  it("accepts valid gold and maroon picks", () => {
    expect(
      validateMeetingChoices(
        { goldClubSlug: "deca", maroonClubSlug: "deca" },
        joined,
        [
          { clubSlug: "deca", memberGroups: [] },
          { clubSlug: "anime-club", memberGroups: [] },
        ],
      ),
    ).toBe("");
  });

  it("rejects Interact maroon for non-board members", () => {
    const memberships = [
      { clubSlug: "interact", memberGroups: [] },
      { clubSlug: "deca", memberGroups: [] },
    ];
    const slugs = new Set(["interact", "deca"]);
    expect(
      validateMeetingChoices({ goldClubSlug: "", maroonClubSlug: "interact" }, slugs, memberships),
    ).toMatch(/board members only/i);
    expect(
      validateMeetingChoices(
        { goldClubSlug: "", maroonClubSlug: "interact" },
        slugs,
        [{ clubSlug: "interact", memberGroups: ["board"] }],
      ),
    ).toBe("");
  });

  it("rejects gold club not joined", () => {
    expect(
      validateMeetingChoices({ goldClubSlug: "robotics", maroonClubSlug: "" }, joined),
    ).toMatch(/Gold/);
  });

  it("rejects general-only club for gold", () => {
    expect(
      validateMeetingChoices({ goldClubSlug: "anime-club", maroonClubSlug: "" }, joined),
    ).toMatch(/Gold/);
  });
});

describe("meeting choice switch cooldown", () => {
  it("detects club-to-club switches only", () => {
    expect(meetingChoiceSwitchNeedsCooldown("deca", "robotics")).toBe(true);
    expect(meetingChoiceSwitchNeedsCooldown("", "deca")).toBe(false);
    expect(meetingChoiceSwitchNeedsCooldown("deca", "")).toBe(false);
    expect(meetingChoiceSwitchNeedsCooldown("deca", "deca")).toBe(false);
  });

  it("blocks within 30 minutes of last switch", () => {
    const now = Date.now();
    const choicesUpdatedAt = Timestamp.fromMillis(now - 5 * 60_000);
    const err = getMeetingChoiceSwitchError(
      { goldClubSlug: "deca", maroonClubSlug: "" },
      { goldClubSlug: "ai", maroonClubSlug: "" },
      choicesUpdatedAt,
      now,
    );
    expect(err).toMatch(/minute/);
  });

  it("allows switch after cooldown", () => {
    const now = Date.now();
    const choicesUpdatedAt = Timestamp.fromMillis(
      now - MEETING_CHOICE_SWITCH_COOLDOWN_MS - 1000,
    );
    const err = getMeetingChoiceSwitchError(
      { goldClubSlug: "deca", maroonClubSlug: "" },
      { goldClubSlug: "ai", maroonClubSlug: "" },
      choicesUpdatedAt,
      now,
    );
    expect(err).toBe("");
  });
});
