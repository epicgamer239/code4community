import { normalizeEmail } from "@/lib/email";

export const WRITING_CENTER_TEAM_PENDING_COLLECTION = "writingCenterTeamPending";

/** @typedef {'writingCenterAdmin'} WritingCenterGrantType */

/** @param {string} email */
export function pendingWritingCenterTeamDocId(email) {
  return normalizeEmail(email);
}

/**
 * @param {{ grantType?: WritingCenterGrantType } | null | undefined} pending
 * @param {{ writingCenterAdmin?: boolean }} profile
 */
export function applyWritingCenterPendingGrantToProfile(pending, profile) {
  if (!pending?.grantType) return profile;
  if (pending.grantType === "writingCenterAdmin") {
    return { ...profile, writingCenterAdmin: true };
  }
  return profile;
}
