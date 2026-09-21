import { describe, expect, it } from "vitest";
import { normalizeClubEvent } from "@/lib/club-hub/clubEvents";

describe("normalizeClubEvent", () => {
  it("normalizes a valid event", () => {
    const event = normalizeClubEvent(
      {
        clubSlug: "robotics",
        clubName: "Robotics",
        title: "Build night",
        description: "Bring tools",
        date: "2026-09-21",
        time: "3:30 PM",
        location: "Room 101",
        createdBy: "uid1",
        updatedBy: "uid1",
      },
      "evt1",
    );

    expect(event).toMatchObject({
      id: "evt1",
      clubSlug: "robotics",
      title: "Build night",
      date: "2026-09-21",
      time: "3:30 PM",
      location: "Room 101",
    });
  });

  it("rejects invalid dates and empty titles", () => {
    expect(normalizeClubEvent({ title: "x", date: "09-21-2026" })).toBeNull();
    expect(normalizeClubEvent({ title: "", date: "2026-09-21" })).toBeNull();
  });
});
