/**
 * Structured client-side error logging. Prefer this over silent catch blocks.
 * @param {string} context
 * @param {unknown} error
 */
export function logClientError(context, error) {
  if (process.env.NODE_ENV === "production") {
    console.warn(`[${context}]`, error instanceof Error ? error.message : error);
    return;
  }
  console.warn(`[${context}]`, error);
}
