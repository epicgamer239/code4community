import { describe, expect, it } from "vitest";
import { emailsEqual, normalizeEmail } from "@/lib/email";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Tim.Cathcart@LCPS.org ")).toBe("tim.cathcart@lcps.org");
  });

  it("returns empty string for non-strings", () => {
    expect(normalizeEmail(null)).toBe("");
  });
});

describe("emailsEqual", () => {
  it("compares normalized emails", () => {
    expect(emailsEqual("A@B.com", "a@b.com")).toBe(true);
    expect(emailsEqual("a@b.com", "c@d.com")).toBe(false);
  });
});
