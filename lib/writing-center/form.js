/** Public Writing Center async Google Form (view / prefill). */
export const WRITING_CENTER_ASYNC_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScQJ_8c3mRYa1HKmGuViEkuRaOayLAbyPJlHt64LrAAIRws8A/viewform";

/** Form editor ID (from …/forms/d/THIS_ID/edit) — used to build response deep links. */
export const WRITING_CENTER_FORM_ID =
  process.env.NEXT_PUBLIC_WC_FORM_ID || "1nRtpON5vn7gNOgWaMjcK7v9Fh1EXPkZXsXuUUL1sZDE";

/**
 * Optional prefill entry IDs from Google Form → ⋮ → Get pre-filled link.
 * Set in .env.local as NEXT_PUBLIC_WC_FORM_ENTRY_* when known.
 */
export function buildAsyncFormUrl({ email = "", name = "" } = {}) {
  const params = new URLSearchParams();
  params.set("usp", "pp_url");

  const emailEntry = process.env.NEXT_PUBLIC_WC_FORM_ENTRY_EMAIL;
  const nameEntry = process.env.NEXT_PUBLIC_WC_FORM_ENTRY_NAME;

  if (emailEntry && email) params.set(emailEntry, email);
  if (nameEntry && name) params.set(nameEntry, name);

  const qs = params.toString();
  return qs ? `${WRITING_CENTER_ASYNC_FORM_URL}?${qs}` : WRITING_CENTER_ASYNC_FORM_URL;
}

/** Build …/edit#response=ACY… (Forms API id — not FormResponse.getId()). */
export function buildGoogleFormResponseViewUrl(formId, apiResponseId) {
  if (!formId || !apiResponseId) return null;
  return `https://docs.google.com/forms/d/${formId}/edit#response=${apiResponseId}`;
}

/** Opens this submission in Google Forms → Responses. */
export function getGoogleFormResponseUrl(session) {
  const formId = session?.googleFormId || WRITING_CENTER_FORM_ID;
  const apiId = session?.googleFormApiResponseId;
  const fromParts = buildGoogleFormResponseViewUrl(formId, apiId);
  if (fromParts) return fromParts;

  const stored = session?.googleFormResponseUrl || "";
  if (stored.includes("#response=")) return stored;

  return null;
}

export function isAsyncFormSession(session) {
  return (
    session?.sessionType === "ASYNC" &&
    (session?.source === "google_form" || Boolean(session?.googleFormResponseId))
  );
}
