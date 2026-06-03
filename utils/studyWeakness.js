import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { firestore } from "@/firebase";
import { normalizeStudyTopicKey, shouldSkipTopicWeaknessKey } from "@/utils/studyTopicKey";

const COLLECTION = "users";
export const STUDY_WEAKNESS_FIELD = "studyWeakness";

/** @typedef {{ tags: Record<string, number>, topics: Record<string, number> }} SubjectWeakness */

/**
 * @returns {{ history: SubjectWeakness, science: SubjectWeakness }}
 */
export function emptyStudyWeakness() {
  return {
    history: { tags: {}, topics: {} },
    science: { tags: {}, topics: {} },
  };
}

/**
 * @param {unknown} data
 * @returns {{ history: SubjectWeakness, science: SubjectWeakness }}
 */
export function coerceStudyWeakness(data) {
  const base = emptyStudyWeakness();
  if (!data || typeof data !== "object") return base;
  for (const sub of ["history", "science"]) {
    const s = data[sub];
    if (!s || typeof s !== "object") continue;
    const tags = s.tags;
    if (tags && typeof tags === "object") {
      for (const [k, v] of Object.entries(tags)) {
        const n = Number(v);
        if (typeof k === "string" && k.length > 0 && Number.isFinite(n) && n > 0) {
          base[sub].tags[k] = Math.min(10_000, Math.floor(n));
        }
      }
    }
    const topics = s.topics;
    if (topics && typeof topics === "object") {
      for (const [k, v] of Object.entries(topics)) {
        const n = Number(v);
        if (typeof k === "string" && k.length > 0 && Number.isFinite(n) && n > 0) {
          base[sub].topics[k] = Math.min(10_000, Math.floor(n));
        }
      }
    }
  }
  return base;
}

/**
 * Load weakness map for the signed-in user.
 * @param {import("firebase/auth").User} user
 */
export async function loadStudyWeakness(user) {
  if (!user?.uid || !firestore) return emptyStudyWeakness();
  try {
    const ref = doc(firestore, COLLECTION, user.uid);
    const snap = await getDoc(ref);
    const raw = snap.exists() ? snap.data()?.[STUDY_WEAKNESS_FIELD] : null;
    return coerceStudyWeakness(raw);
  } catch (e) {
    return emptyStudyWeakness();
  }
}

/**
 * Increment miss count for a skill tag (client Firestore; user doc).
 * @param {"history" | "science"} subject
 * @param {string} normalizedTag from normalizeSkillTag()
 */
export async function recordStudyMiss(user, subject, normalizedTag) {
  if (!user?.uid || !firestore) return;
  const tag =
    typeof normalizedTag === "string" && normalizedTag.length > 0
      ? normalizedTag.slice(0, 64)
      : "general";
  const sub = subject === "science" ? "science" : "history";
  try {
    assertClientRateLimit("studyProgressWrite", user.uid);
    const ref = doc(firestore, COLLECTION, user.uid);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data()?.[STUDY_WEAKNESS_FIELD] : null;
    const sw = coerceStudyWeakness(existing);
    const prev = sw[sub].tags[tag] || 0;
    sw[sub].tags[tag] = Math.min(10_000, prev + 1);
    await setDoc(
      ref,
      {
        [STUDY_WEAKNESS_FIELD]: {
          ...sw,
          [sub]: {
            tags: sw[sub].tags,
            topics: sw[sub].topics || {},
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
 * Top tag keys by miss count (for adaptive generation).
 * @param {{ history: SubjectWeakness, science: SubjectWeakness }} sw
 * @param {"history" | "science"} subject
 * @param {number} [limit]
 */
export function getTopWeakTagKeys(sw, subject, limit = 5) {
  const sub = subject === "science" ? "science" : "history";
  const tags = sw[sub]?.tags || {};
  return Object.entries(tags)
    .filter(([, c]) => typeof c === "number" && c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

/**
 * Increment miss count for a content topic (normalized key).
 * @param {"history" | "science"} subject
 * @param {string} topicKey from normalizeStudyTopicKey()
 */
export async function recordStudyTopicMiss(user, subject, topicKey) {
  if (!user?.uid || !firestore) return;
  const key = normalizeStudyTopicKey(topicKey);
  if (shouldSkipTopicWeaknessKey(key)) return;
  const sub = subject === "science" ? "science" : "history";
  try {
    assertClientRateLimit("studyProgressWrite", user.uid);
    const ref = doc(firestore, COLLECTION, user.uid);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data()?.[STUDY_WEAKNESS_FIELD] : null;
    const sw = coerceStudyWeakness(existing);
    const prev = sw[sub].topics[key] || 0;
    sw[sub].topics[key] = Math.min(10_000, prev + 1);
    await setDoc(
      ref,
      {
        [STUDY_WEAKNESS_FIELD]: {
          ...sw,
          [sub]: {
            tags: sw[sub].tags,
            topics: sw[sub].topics,
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
 * Top topic keys by miss count (cross-session adaptive generation).
 * @param {{ history: SubjectWeakness, science: SubjectWeakness }} sw
 * @param {"history" | "science"} subject
 * @param {number} [limit]
 */
export function getTopWeakTopicKeys(sw, subject, limit = 5) {
  const sub = subject === "science" ? "science" : "history";
  const topics = sw[sub]?.topics || {};
  return Object.entries(topics)
    .filter(([k, c]) => typeof c === "number" && c > 0 && !shouldSkipTopicWeaknessKey(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}
