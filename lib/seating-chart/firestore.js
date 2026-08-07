import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";

export const SEATING_CHARTS = "seatingCharts";

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

/**
 * @param {{
 *   chartName?: string,
 *   students?: unknown[],
 *   furniture?: unknown[],
 *   restrictions?: unknown[],
 * }} raw
 */
export function normalizeSeatingChartPayload(raw) {
  return {
    chartName: typeof raw?.chartName === "string" ? raw.chartName.slice(0, 64) : "",
    students: Array.isArray(raw?.students) ? raw.students : [],
    furniture: Array.isArray(raw?.furniture) ? raw.furniture : [],
    restrictions: Array.isArray(raw?.restrictions) ? raw.restrictions : [],
  };
}

/**
 * @param {string} uid
 */
export async function fetchUserSeatingChart(uid) {
  if (!firestore || !uid) return null;
  const snap = await getDoc(doc(firestore, SEATING_CHARTS, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...normalizeSeatingChartPayload(data),
    savedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.savedAt || null,
  };
}

/**
 * @param {{
 *   uid: string,
 *   chartName: string,
 *   students: unknown[],
 *   furniture: unknown[],
 *   restrictions: unknown[],
 * }} args
 */
export async function saveUserSeatingChart({
  uid,
  chartName,
  students,
  furniture,
  restrictions,
}) {
  if (!firestore) throw new Error("Firebase is not configured.");
  if (!uid) throw new Error("Sign in to save your seating chart.");

  assertClientRateLimit("seatingChartSave", uid);

  const payload = normalizeSeatingChartPayload({
    chartName,
    students,
    furniture,
    restrictions,
  });

  await setDoc(
    doc(firestore, SEATING_CHARTS, uid),
    stripUndefined({
      ownerId: uid,
      ...payload,
      updatedAt: serverTimestamp(),
      savedAt: new Date().toISOString(),
    }),
    { merge: true },
  );

  return payload;
}
