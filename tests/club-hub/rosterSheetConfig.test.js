import { describe, expect, it } from "vitest";
import { sanitizeSheetTabTitle } from "@/lib/club-hub/rosterSheetConfig";

describe("sanitizeSheetTabTitle", () => {
  it("strips invalid sheet characters", () => {
    expect(sanitizeSheetTabTitle("Robotics [Team]")).toBe("Robotics Team");
  });
});
