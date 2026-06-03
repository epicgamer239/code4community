import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { firestore } from "@/firebase";

const COLLECTION = "users";
export const STUDY_STATS_FIELD = "studyStats";

/** @typedef {{ seconds: number, questions: number, correct: number, wrong: number, skipped: number }} DailyBucket */

/**
 * @returns {{ totalQuestions: number, correct: number, wrong: number, skipped: number, totalSeconds: number, daily: Record<string, DailyBucket> }}
 */
export function emptyStudyStats() {
  return {
    totalQuestions: 0,
    correct: 0,
    wrong: 0,
    skipped: 0,
    totalSeconds: 0,
    daily: {},
  };
}

/**
 * @param {unknown} data
 */
export function coerceStudyStats(data) {
  const base = emptyStudyStats();
  if (!data || typeof data !== "object") return base;
  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) && x >= 0 ? Math.min(1e9, Math.floor(x)) : 0;
  };
  base.totalQuestions = n(data.totalQuestions);
  base.correct = n(data.correct);
  base.wrong = n(data.wrong);
  base.skipped = n(data.skipped);
  base.totalSeconds = n(data.totalSeconds);
  const daily = data.daily;
  if (daily && typeof daily === "object") {
    for (const [key, bucket] of Object.entries(daily)) {
      if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      if (!bucket || typeof bucket !== "object") continue;
      base.daily[key] = {
        seconds: n(bucket.seconds),
        questions: n(bucket.questions),
        correct: n(bucket.correct),
        wrong: n(bucket.wrong),
        skipped: n(bucket.skipped),
      };
    }
  }
  return base;
}

export function getLocalDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {import("firebase/auth").User} user
 */
export async function loadStudyStats(user) {
  if (!user?.uid || !firestore) return emptyStudyStats();
  try {
    const ref = doc(firestore, COLLECTION, user.uid);
    const snap = await getDoc(ref);
    const raw = snap.exists() ? snap.data()?.[STUDY_STATS_FIELD] : null;
    return coerceStudyStats(raw);
  } catch (e) {
    return emptyStudyStats();
  }
}

/**
 * @param {"correct" | "wrong" | "skipped"} outcome
 */
export async function recordStudyQuestionResult(user, outcome) {
  if (!user?.uid || !firestore) return;
  if (outcome !== "correct" && outcome !== "wrong" && outcome !== "skipped") return;
  const dateKey = getLocalDateKey();
  try {
    assertClientRateLimit("studyProgressWrite", user.uid);
    const ref = doc(firestore, COLLECTION, user.uid);
    const snap = await getDoc(ref);
    const raw = snap.exists() ? snap.data()?.[STUDY_STATS_FIELD] : null;
    const s = coerceStudyStats(raw);
    s.totalQuestions += 1;
    if (outcome === "correct") s.correct += 1;
    else if (outcome === "wrong") s.wrong += 1;
    else s.skipped += 1;
    const d = s.daily[dateKey] || {
      seconds: 0,
      questions: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
    };
    d.questions += 1;
    if (outcome === "correct") d.correct += 1;
    else if (outcome === "wrong") d.wrong += 1;
    else d.skipped += 1;
    s.daily[dateKey] = d;
    await setDoc(
      ref,
      {
        [STUDY_STATS_FIELD]: {
          ...s,
          updatedAt: serverTimestamp(),
        },
      },
      { merge: true }
    );
  } catch (e) {
  }
}

/**
 * @param {number} seconds
 */
export async function mergeStudyStatsTime(user, seconds) {
  if (!user?.uid || !firestore) return;
  const sec = Math.min(86400 * 7, Math.max(0, Math.floor(Number(seconds)) || 0));
  if (sec <= 0) return;
  const dateKey = getLocalDateKey();
  try {
    assertClientRateLimit("studyProgressWrite", user.uid);
    const ref = doc(firestore, COLLECTION, user.uid);
    const snap = await getDoc(ref);
    const raw = snap.exists() ? snap.data()?.[STUDY_STATS_FIELD] : null;
    const s = coerceStudyStats(raw);
    s.totalSeconds += sec;
    const d = s.daily[dateKey] || {
      seconds: 0,
      questions: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
    };
    d.seconds += sec;
    s.daily[dateKey] = d;
    await setDoc(
      ref,
      {
        [STUDY_STATS_FIELD]: {
          ...s,
          updatedAt: serverTimestamp(),
        },
      },
      { merge: true }
    );
  } catch (e) {
  }
}

export function formatDurationSeconds(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
}
