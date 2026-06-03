/** Normalize Firestore Timestamp / plain objects / ISO strings to Date. */
export function firestoreToDate(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    const d = new Date(value.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatRequestTime(value, fallback = "Unknown time") {
  const d = firestoreToDate(value);
  if (!d) return fallback;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatRequestDateTime(value, fallback = "Recently") {
  const d = firestoreToDate(value);
  if (!d) return fallback;
  return d.toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

/** Milliseconds for sorting sessions newest-first (matches list Date/time column). */
export function sessionSortTimestampMs(session) {
  const created = firestoreToDate(session?.createdAt);
  if (created) return created.getTime();
  const updated = firestoreToDate(session?.updatedAt);
  if (updated) return updated.getTime();
  return 0;
}

/** Newest first. Does not mutate the input array. */
export function sortSessionsNewestFirst(sessions) {
  return [...sessions].sort(
    (a, b) => sessionSortTimestampMs(b) - sessionSortTimestampMs(a)
  );
}

/** Completed Math Lab session doc with Date fields for UI. */
export function hydrateCompletedSession(session) {
  return {
    ...session,
    completedAt: firestoreToDate(session.completedAt) || new Date(0),
    startTime: firestoreToDate(session.startTime) || new Date(0),
    endTime: firestoreToDate(session.endTime) || new Date(0),
  };
}

/** Duration between two timestamps (e.g. session start → end). */
export function formatIntervalDuration(startTime, endTime, fallback = "Unknown") {
  const start = firestoreToDate(startTime);
  const end = firestoreToDate(endTime);
  if (!start || !end) return fallback;
  const durationMinutes = Math.floor((end - start) / 60000);
  if (durationMinutes < 60) return `${durationMinutes}m`;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return `${hours}h ${minutes}m`;
}

/** Elapsed seconds as M:SS or H:MM:SS (Math Lab session tracking). */
export function formatClockDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/** Writing Center session list dates (Firestore Timestamp-safe). */
export function formatSessionDate(value, fallback = "—") {
  const d = firestoreToDate(value);
  if (!d) return fallback;
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
