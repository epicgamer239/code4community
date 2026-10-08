import { describe, expect, it } from "vitest";
import {
  buildSpecialSheetColumnLabel,
  parseStudentEmailPaste,
} from "@/lib/club-hub/specialSheetEvents";
import { buildStudentMeetingSheetHeaders, studentMeetingUserIdColumnIndex } from "@/lib/club-hub/studentMeetingSheetLayout";

describe("parseStudentEmailPaste", () => {
  it("parses newline and comma separated emails", () => {
    const emails = parseStudentEmailPaste("a@lcps.org\nb@lcps.org, c@lcps.org");
    expect(emails).toEqual(["a@lcps.org", "b@lcps.org", "c@lcps.org"]);
  });

  it("dedupes and ignores invalid lines", () => {
    const emails = parseStudentEmailPaste("a@lcps.org\nnot-an-email\na@lcps.org");
    expect(emails).toEqual(["a@lcps.org"]);
  });
});

describe("special sheet column layout", () => {
  it("builds headers with special columns before user id", () => {
    const headers = buildStudentMeetingSheetHeaders([
      { columnLabel: "Seminar (Gold)" },
      { columnLabel: "Workshop (Maroon)" },
    ]);
    expect(headers).toEqual([
      "Student name",
      "Gold club",
      "Maroon club",
      "Seminar (Gold)",
      "Workshop (Maroon)",
      "User ID",
    ]);
    expect(studentMeetingUserIdColumnIndex(2)).toBe(5);
  });

  it("labels gold vs maroon in column title", () => {
    expect(buildSpecialSheetColumnLabel("Finance day", "gold")).toBe("Finance day (Gold)");
    expect(buildSpecialSheetColumnLabel("Finance day", "maroon")).toBe("Finance day (Maroon)");
  });
});
