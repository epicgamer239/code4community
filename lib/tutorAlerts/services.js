/** @typedef {"mathlab" | "writing-center"} TutorAlertService */

export const TUTOR_ALERT_MATHLAB = "mathlab";
export const TUTOR_ALERT_WRITING_CENTER = "writing-center";

/** @type {Record<TutorAlertService, string>} */
export const ACCEPTING_FIELD_BY_SERVICE = {
  [TUTOR_ALERT_MATHLAB]: "acceptingMathLabTutoring",
  [TUTOR_ALERT_WRITING_CENTER]: "acceptingWritingCenterTutoring",
};

export const WEB_PUSH_TOKENS_FIELD = "tutorWebPushTokens";

/**
 * @param {TutorAlertService} service
 * @param {Record<string, unknown> | null | undefined} userData
 */
export function isAcceptingTutoring(service, userData) {
  const field = ACCEPTING_FIELD_BY_SERVICE[service];
  if (!field) return false;
  return Boolean(userData?.[field]);
}
