import { describe, expect, it } from "vitest";
import { isLcpsOrgEmail, isSignupEmailAllowed } from "@/lib/auth/signupEmailPolicy";

describe("signupEmailPolicy", () => {
  it("allows @lcps.org emails", () => {
    expect(isLcpsOrgEmail("student@lcps.org")).toBe(true);
    expect(isSignupEmailAllowed("Student@LCPS.org", {})).toBe(true);
  });

  it("blocks other domains unless allowlisted", () => {
    expect(isSignupEmailAllowed("x@gmail.com", {})).toBe(false);
    expect(isSignupEmailAllowed("x@gmail.com", { "x@gmail.com": true })).toBe(true);
  });

  it("always allows built-in site admins", () => {
    expect(isSignupEmailAllowed("shail40926@gmail.com", {})).toBe(true);
  });
});
