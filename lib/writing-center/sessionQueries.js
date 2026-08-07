import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";

/** Statuses that need a live dashboard wire. */
export const WC_LIVE_STATUSES = ["PENDING", "ACCEPTED", "IN_PROGRESS"];

/** Past / archived statuses — fetch once, not realtime. */
export const WC_HISTORY_STATUSES = ["COMPLETED", "CANCELLED"];

export const WC_HISTORY_FETCH_LIMIT = 1000;

/** @param {string | undefined} status */
export function isLiveWritingCenterStatus(status) {
  return WC_LIVE_STATUSES.includes(status);
}

/**
 * Merge live + history; live docs win on id collision.
 * @param {Array<{ id: string }>} live
 * @param {Array<{ id: string }>} history
 */
export function mergeWritingCenterSessions(live, history) {
  const map = new Map();
  for (const session of history || []) {
    if (session?.id) map.set(session.id, session);
  }
  for (const session of live || []) {
    if (session?.id) map.set(session.id, session);
  }
  return Array.from(map.values());
}

/** @param {import('firebase/firestore').Firestore} firestore */
export function liveWritingCenterSessionsQuery(firestore) {
  return query(
    collection(firestore, "sessions"),
    where("status", "in", WC_LIVE_STATUSES),
  );
}

/**
 * One-shot past sessions for admin boards.
 * @param {import('firebase/firestore').Firestore} firestore
 */
export async function fetchWritingCenterHistorySessions(firestore) {
  const snap = await getDocs(
    query(
      collection(firestore, "sessions"),
      where("status", "in", WC_HISTORY_STATUSES),
      limit(WC_HISTORY_FETCH_LIMIT),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * One-shot completed/cancelled sessions for one tutor.
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {string} tutorId
 */
export async function fetchTutorWritingCenterHistory(firestore, tutorId) {
  if (!tutorId) return [];
  const snap = await getDocs(
    query(
      collection(firestore, "sessions"),
      where("tutorId", "==", tutorId),
      where("status", "in", WC_HISTORY_STATUSES),
      limit(WC_HISTORY_FETCH_LIMIT),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Live student board: only active statuses for this student.
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {string} studentId
 */
export function liveStudentWritingCenterSessionsQuery(firestore, studentId) {
  return query(
    collection(firestore, "sessions"),
    where("studentId", "==", studentId),
    where("status", "in", WC_LIVE_STATUSES),
  );
}

/**
 * One-shot past sessions for one student.
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {string} studentId
 */
export async function fetchStudentWritingCenterHistory(firestore, studentId) {
  if (!studentId) return [];
  const snap = await getDocs(
    query(
      collection(firestore, "sessions"),
      where("studentId", "==", studentId),
      where("status", "in", WC_HISTORY_STATUSES),
      limit(WC_HISTORY_FETCH_LIMIT),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
