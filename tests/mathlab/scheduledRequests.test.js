import { describe, expect, it } from "vitest";
import {
  MATHLAB_TIME_ZONE,
  canScheduleMathLabRequestOnDate,
  canSubmitLiveMathLabRequest,
  isWeekdayYmd,
  liveMathLabRequestBlockReason,
  nextWeekdayYmd,
  scheduledMathLabDateBlockReason,
} from "@/lib/mathlab/scheduledRequests";

/**
 * UTC Date for a wall-clock time in America/New_York.
 * @param {string} ymd YYYY-MM-DD
 * @param {string} hm HH:mm
 */
function easternInstant(ymd, hm) {
  const [year, month, day] = ymd.split("-").map(Number);
  const [hour, minute] = hm.split(":").map(Number);
  for (const offsetHours of [4, 5]) {
    const candidate = new Date(Date.UTC(year, month - 1, day, hour + offsetHours, minute));
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: MATHLAB_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(candidate);
    const map = Object.fromEntries(
      parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
    );
    if (
      Number(map.year) === year &&
      Number(map.month) === month &&
      Number(map.day) === day &&
      Number(map.hour) === hour &&
      Number(map.minute) === minute
    ) {
      return candidate;
    }
  }
  throw new Error(`Could not resolve Eastern instant for ${ymd} ${hm}`);
}

describe("Math Lab request windows", () => {
  it("treats Mon–Fri as weekdays", () => {
    expect(isWeekdayYmd("2026-11-09")).toBe(true); // Mon
    expect(isWeekdayYmd("2026-11-13")).toBe(true); // Fri
    expect(isWeekdayYmd("2026-11-14")).toBe(false); // Sat
    expect(isWeekdayYmd("2026-11-15")).toBe(false); // Sun
  });

  it("skips weekends when finding the next weekday", () => {
    expect(nextWeekdayYmd("2026-11-13")).toBe("2026-11-13");
    expect(nextWeekdayYmd("2026-11-14")).toBe("2026-11-16");
    expect(nextWeekdayYmd("2026-11-15")).toBe("2026-11-16");
  });

  it("allows live requests only weekdays 9:30–4:18 Eastern", () => {
    expect(canSubmitLiveMathLabRequest(easternInstant("2026-11-09", "09:30"))).toBe(true);
    expect(canSubmitLiveMathLabRequest(easternInstant("2026-11-09", "16:18"))).toBe(true);
    expect(canSubmitLiveMathLabRequest(easternInstant("2026-11-09", "09:29"))).toBe(false);
    expect(canSubmitLiveMathLabRequest(easternInstant("2026-11-09", "16:19"))).toBe(false);
    expect(canSubmitLiveMathLabRequest(easternInstant("2026-11-14", "12:00"))).toBe(false);
    expect(liveMathLabRequestBlockReason(easternInstant("2026-11-14", "12:00"))).toMatch(
      /Monday/,
    );
  });

  it("blocks scheduled weekend dates", () => {
    const monday = easternInstant("2026-11-09", "12:00");
    expect(canScheduleMathLabRequestOnDate("2026-11-09", monday)).toBe(true);
    expect(canScheduleMathLabRequestOnDate("2026-11-14", monday)).toBe(false);
    expect(scheduledMathLabDateBlockReason("2026-11-15", monday)).toMatch(/Monday/);
  });
});
