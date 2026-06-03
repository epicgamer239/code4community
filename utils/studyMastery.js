import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { firestore } from "@/firebase";

const COLLECTION = "users";
export const STUDY_MASTERY_FIELD = "studyMastery";

/**
 * @typedef {{ score: number, lastAt: string, dueAt?: string }} MasteryEntry
 * @typedef {{ tags: Record<string, MasteryEntry> }} SubjectMastery
 * @typedef {{ history: SubjectMastery, science: SubjectMastery }} StudyMastery
 */

/** @returns {StudyMastery} */
export function emptyStudyMastery() {
  return {
    history: { tags: {} },
    science: { tags: {} },
  };
}

/**
 * @param {unknown} v
 * @returns {MasteryEntry | null}
 */
function coerceMasteryEntry(v) {
  if (!v || typeof v !== "object") return null;
  const score = Number(v.score);
  const lastAt = typeof v.lastAt === "string" && v.lastAt.length > 0 ? v.lastAt : null;
  if (!Number.isFinite(score) || !lastAt) return null;
  const dueAt =
    typeof v.dueAt === "string" && v.dueAt.length > 0 ? v.dueAt : undefined;
  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    lastAt,
    ...(dueAt ? { dueAt } : {}),
  };
}

/**
 * @param {unknown} data
 * @returns {StudyMastery}
 */
export function coerceStudyMastery(data) {
  const base = emptyStudyMastery();
  if (!data || typeof data !== "object") return base;
  for (const sub of ["history", "science"]) {
    const s = data[sub];
    if (!s || typeof s !== "object") continue;
    const tags = s.tags;
    if (tags && typeof tags === "object") {
      for (const [k, v] of Object.entries(tags)) {
        if (typeof k !== "string" || k.length === 0 || k.length > 64) continue;
        const e = coerceMasteryEntry(v);
        if (e) base[sub].tags[k] = e;
      }
    }
  }
  return base;
}

/**
 * Score after forgetting curve since last practice (read path / before update).
 * @param {number} score
 * @param {number} lastAtMs
 * @param {number} nowMs
 */
export function decayedMasteryScore(score, lastAtMs, nowMs) {
  const days = Math.max(0, (nowMs - lastAtMs) / 86_400_000);
  if (days < 1) return Math.min(100, Math.max(0, Math.round(score)));
  const d = Math.floor(days);
  return Math.max(
    0,
    Math.round(score * 0.99 ** d - d * 0.35)
  );
}

/**
 * @param {import("firebase/auth").User} user
 */
export async function loadStudyMastery(user) {
  if (!user?.uid || !firestore) return emptyStudyMastery();
  try {
    const ref = doc(firestore, COLLECTION, user.uid);
    const snap = await getDoc(ref);
    const raw = snap.exists() ? snap.data()?.[STUDY_MASTERY_FIELD] : null;
    return coerceStudyMastery(raw);
  } catch (e) {
    return emptyStudyMastery();
  }
}

/**
 * Update per-skill mastery and spaced-repetition due time after an attempt.
 * @param {import("firebase/auth").User} user
 * @param {"history" | "science"} subject
 * @param {string} normalizedTag from normalizeSkillTag()
 * @param {boolean} correct
 */
export async function recordStudySkillOutcome(user, subject, normalizedTag, correct) {
  if (!user?.uid || !firestore) return;
  const tag =
    typeof normalizedTag === "string" && normalizedTag.length > 0
      ? normalizedTag.slice(0, 64)
      : "general";
  const sub = subject === "science" ? "science" : "history";
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  try {
    assertClientRateLimit("studyProgressWrite", user.uid);
    const ref = doc(firestore, COLLECTION, user.uid);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data()?.[STUDY_MASTERY_FIELD] : null;
    const sm = coerceStudyMastery(existing);
    const prevEntry = sm[sub].tags[tag];
    let score = prevEntry?.score ?? 55;
    const lastMs = prevEntry?.lastAt ? Date.parse(prevEntry.lastAt) || now : now;
    score = decayedMasteryScore(score, lastMs, now);
    if (correct) score = Math.min(100, score + 5);
    else score = Math.max(0, score - 12);

    let dueAt;
    if (!correct) {
      dueAt = new Date(now + 60 * 60 * 1000).toISOString();
    } else if (score < 55) {
      dueAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
    } else {
      dueAt = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
    }

    sm[sub].tags[tag] = { score, lastAt: nowIso, dueAt };

    await setDoc(
      ref,
      {
        [STUDY_MASTERY_FIELD]: {
          ...sm,
          [sub]: {
            tags: sm[sub].tags,
            updatedAt: serverTimestamp(),
          },
        },
      },
      { merge: true }
    );
  } catch (e) {
  }
}

/**
 * Tags that are due for spaced review (dueAt <= now), highest urgency first.
 * @param {StudyMastery} sm
 * @param {"history" | "science"} subject
 * @param {number} [now]
 * @param {number} [limit]
 * @returns {string[]}
 */
export function getDueReviewTagKeys(sm, subject, now = Date.now(), limit = 8) {
  const sub = subject === "science" ? "science" : "history";
  const tags = sm[sub]?.tags || {};
  const due = Object.entries(tags)
    .filter(([, e]) => e?.dueAt && Date.parse(e.dueAt) <= now)
    .sort((a, b) => Date.parse(a[1].dueAt) - Date.parse(b[1].dueAt))
    .map(([k]) => k);
  return [...new Set(due)].slice(0, limit);
}

/**
 * Skill tags with low mastery after decay (for insights / alerts).
 * @param {StudyMastery} sm
 * @param {"history" | "science"} subject
 * @param {number} [threshold] default 40
 */
/**
 * Maps recent AI quiz outcomes to a server hint for quiz generation.
 * @param {boolean[]} recentOutcomes true = answered correctly
 * @returns {"steady" | "strong" | "struggling"}
 */
export function computePerformanceTier(recentOutcomes) {
  const arr = Array.isArray(recentOutcomes) ? recentOutcomes.slice(-14) : [];
  if (arr.length < 3) return "steady";
  const correct = arr.filter(Boolean).length;
  const r = correct / arr.length;
  if (r >= 0.78) return "strong";
  if (r <= 0.42) return "struggling";
  return "steady";
}

export function getLowMasteryTagKeys(sm, subject, threshold = 40, now = Date.now()) {
  const sub = subject === "science" ? "science" : "history";
  const tags = sm[sub]?.tags || {};
  const out = [];
  for (const [k, e] of Object.entries(tags)) {
    if (!e?.lastAt) continue;
    const lastMs = Date.parse(e.lastAt) || now;
    const s = decayedMasteryScore(e.score, lastMs, now);
    if (s < threshold) out.push({ tag: k, score: s });
  }
  out.sort((a, b) => a.score - b.score);
  return out;
}

/**
 * Skill tags with strong mastery after decay (for strengths display).
 * @param {StudyMastery} sm
 * @param {"history" | "science"} subject
 * @param {number} [threshold] default 60
 * @param {number} [now]
 * @param {number} [limit]
 * @returns {string[]}
 */
export function getHighMasteryTagKeys(
  sm,
  subject,
  threshold = 60,
  now = Date.now(),
  limit = 8
) {
  const sub = subject === "science" ? "science" : "history";
  const tags = sm[sub]?.tags || {};
  const out = [];
  for (const [k, e] of Object.entries(tags)) {
    if (!e?.lastAt) continue;
    const lastMs = Date.parse(e.lastAt) || now;
    const s = decayedMasteryScore(e.score, lastMs, now);
    if (s >= threshold) out.push({ tag: k, score: s });
  }
  out.sort((a, b) => b.score - a.score);
  return [...new Set(out.map((x) => x.tag))].slice(0, limit);
}
