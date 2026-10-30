import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { firestore } from "@/firebase";
import { normalizeEmail } from "@/lib/email";

/**
 * Find a user doc by email. Tries an equality query first, then scans a provided
 * cached list, then falls back to a full users collection scan only if needed.
 *
 * @param {string} email
 * @param {{ cachedUsers?: Array<{ id: string, email?: string } & Record<string, unknown>> }} [opts]
 * @returns {Promise<({ id: string } & Record<string, unknown>) | null>}
 */
export async function findUserByNormalizedEmailFromFirestore(email, opts = {}) {
  const normalized = normalizeEmail(email);
  if (!normalized || !firestore) return null;

  try {
    const snap = await getDocs(
      query(collection(firestore, "users"), where("email", "==", normalized), limit(1)),
    );
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
  } catch {
    // Missing index or rules — fall through.
  }

  const cached = opts.cachedUsers || [];
  const fromCache = cached.find((user) => normalizeEmail(user.email) === normalized);
  if (fromCache) return fromCache;

  const all = await getDocs(collection(firestore, "users"));
  for (const docSnap of all.docs) {
    const data = docSnap.data();
    if (normalizeEmail(data.email) === normalized) {
      return { id: docSnap.id, ...data };
    }
  }
  return null;
}
