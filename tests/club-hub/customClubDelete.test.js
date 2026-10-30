import { afterEach, describe, expect, it } from "vitest";
import { clubNameToSlug, getClubBySlug, listAllDirectoryClubs } from "@/lib/club-hub/broadRunClubDirectory";
import { clubDeleteConfirmationPhrase } from "@/lib/club-hub/customClubStore";
import { setRemovedClubSlugs } from "@/lib/club-hub/removedClubsStore";

describe("clubDeleteConfirmationPhrase", () => {
  it("builds the typed confirmation line", () => {
    expect(clubDeleteConfirmationPhrase("Yarn Arts Club")).toBe(
      "I am sure I want to delete Yarn Arts Club",
    );
  });
});

describe("removed directory clubs", () => {
  afterEach(() => {
    setRemovedClubSlugs([]);
  });

  it("hides soft-removed directory clubs from listings", () => {
    const sample = listAllDirectoryClubs()[0];
    expect(sample).toBeTruthy();
    const slug = clubNameToSlug(sample.name);
    setRemovedClubSlugs([slug]);
    expect(getClubBySlug(slug)).toBeNull();
    expect(listAllDirectoryClubs().some((club) => clubNameToSlug(club.name) === slug)).toBe(false);
  });
});
