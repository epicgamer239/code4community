import { describe, expect, it } from "vitest";
import {
  isLegacyMathLabAdminRole,
  isMathLabAdminUser,
  isSiteAdminUser,
  isWritingCenterAdminUser,
} from "@/lib/auth/productAdmins";

describe("productAdmins", () => {
  it("treats config emails as site admins", () => {
    expect(isSiteAdminUser(null, "shail40926@gmail.com")).toBe(true);
    expect(isMathLabAdminUser(null, "shail40926@gmail.com")).toBe(true);
    expect(isWritingCenterAdminUser(null, "shail40926@gmail.com")).toBe(true);
  });

  it("mathLabAdmin does not grant Writing Center admin", () => {
    const profile = { email: "deputy@lcps.org", role: "student", mathLabAdmin: true };
    expect(isMathLabAdminUser(profile, profile.email)).toBe(true);
    expect(isWritingCenterAdminUser(profile, profile.email)).toBe(false);
  });

  it("writingCenterAdmin does not grant Math Lab admin", () => {
    const profile = { email: "wc@lcps.org", role: "student", writingCenterAdmin: true };
    expect(isWritingCenterAdminUser(profile, profile.email)).toBe(true);
    expect(isMathLabAdminUser(profile, profile.email)).toBe(false);
  });

  it("legacy role=admin (non-config) counts as Math Lab admin only", () => {
    const profile = { email: "deputy@lcps.org", role: "admin" };
    expect(isLegacyMathLabAdminRole(profile)).toBe(true);
    expect(isMathLabAdminUser(profile, profile.email)).toBe(true);
    expect(isWritingCenterAdminUser(profile, profile.email)).toBe(false);
  });
});
