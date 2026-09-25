import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { normalizeEmail, isValidEmail } from "@/lib/email";

export const SIGNUP_ALLOWLIST_DOC_PATH = ["siteConfig", "signupAllowlist"];

/** @param {unknown} raw */
export function normalizeEmailAllowlistMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  /** @type {Record<string, boolean>} */
  const map = {};
  for (const [key, value] of Object.entries(raw)) {
    const email = normalizeEmail(key);
    if (email && isValidEmail(email) && value === true) {
      map[email] = true;
    }
  }
  return map;
}

/** @returns {Promise<Record<string, boolean>>} */
export async function fetchSignupEmailAllowlist() {
  if (!firestore) return {};
  const ref = doc(firestore, SIGNUP_ALLOWLIST_DOC_PATH[0], SIGNUP_ALLOWLIST_DOC_PATH[1]);
  const snap = await getDoc(ref);
  if (!snap.exists()) return {};
  return normalizeEmailAllowlistMap(snap.data()?.emailAllowlist);
}

/** @returns {Promise<string[]>} */
export async function fetchSignupAllowlistEmailsSorted() {
  const map = await fetchSignupEmailAllowlist();
  return Object.keys(map).sort((a, b) => a.localeCompare(b));
}

/**
 * @param {{ email: string, adminUid: string, existing?: Record<string, boolean> }} args
 */
export async function addEmailToSignupAllowlist({ email, adminUid, existing = null }) {
  if (!firestore) throw new Error("Firebase is not configured.");
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw new Error("Enter a valid email.");
  if (normalized.endsWith("@lcps.org")) {
    throw new Error("@lcps.org addresses can sign up without the allowlist.");
  }
  assertClientRateLimit("siteConfigWrite", adminUid);

  const emailAllowlist = { ...(existing ?? (await fetchSignupEmailAllowlist())), [normalized]: true };
  const ref = doc(firestore, SIGNUP_ALLOWLIST_DOC_PATH[0], SIGNUP_ALLOWLIST_DOC_PATH[1]);
  await setDoc(
    ref,
    {
      emailAllowlist,
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    },
    { merge: true },
  );
  return emailAllowlist;
}

/**
 * @param {{ email: string, adminUid: string, existing?: Record<string, boolean> }} args
 */
export async function removeEmailFromSignupAllowlist({ email, adminUid, existing = null }) {
  if (!firestore) throw new Error("Firebase is not configured.");
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("Missing email.");
  assertClientRateLimit("siteConfigWrite", adminUid);

  const emailAllowlist = { ...(existing ?? (await fetchSignupEmailAllowlist())) };
  delete emailAllowlist[normalized];

  const ref = doc(firestore, SIGNUP_ALLOWLIST_DOC_PATH[0], SIGNUP_ALLOWLIST_DOC_PATH[1]);
  await setDoc(
    ref,
    {
      emailAllowlist,
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    },
    { merge: true },
  );
  return emailAllowlist;
}
