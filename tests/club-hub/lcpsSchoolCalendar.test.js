import { describe, expect, it } from "vitest";
import {
  isLcpsNoSchoolKind,
  mergeLcpsDaysIntoEventsByDate,
} from "@/lib/club-hub/lcpsSchoolCalendar2026";

describe("lcpsSchoolCalendar2026", () => {
  it("treats end of quarter as in-session, not no school", () => {
    expect(isLcpsNoSchoolKind("end-quarter")).toBe(false);
    const merged = mergeLcpsDaysIntoEventsByDate({}, "2026-10-28", "2026-10-28");
    const block = merged["2026-10-28"]?.[0];
    expect(block?.title).toBe("End of quarter");
    expect(block?.isLcpsNoSchool).toBe(false);
    expect(block?.location).toBe("School in session");
  });

  it("marks student holidays as no school", () => {
    const merged = mergeLcpsDaysIntoEventsByDate({}, "2026-10-29", "2026-10-29");
    expect(merged["2026-10-29"]?.[0]?.isLcpsNoSchool).toBe(true);
  });
});
