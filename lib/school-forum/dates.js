import { firestoreToDate } from "@/lib/firestoreDates";

/** Firestore Timestamp / Date / ISO / millis → epoch millis, or null. */
export function toMillis(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const d = firestoreToDate(value);
  return d ? d.getTime() : null;
}

/** → ISO string, or null. */
export function toIso(value) {
  const ms = toMillis(value);
  return ms == null ? null : new Date(ms).toISOString();
}

/**
 * Calendar day only (YYYY-MM-DD, US Eastern). Used on public views so exact post times
 * can't be matched against when a student was seen on their device.
 */
export function toPublicDay(value) {
  const ms = toMillis(value);
  if (ms == null) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}
