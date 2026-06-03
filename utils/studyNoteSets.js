import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { StudyCache } from "@/utils/cache";
import { invalidateOnDataChange } from "@/utils/cacheInvalidation";

const MAX_NOTES = 120_000;

/**
 * Short title from first non-empty line of notes.
 * @param {string} notes
 * @returns {string}
 */
export function deriveNoteSetName(notes) {
  const line =
    notes.trim().split(/\r?\n/).find((l) => l.trim().length > 0) ||
    "Untitled notes";
  const cleaned = line.trim().replace(/\s+/g, " ");
  return cleaned.length > 72 ? cleaned.slice(0, 69) + "…" : cleaned;
}

function tsToMs(v) {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.seconds === "number") return v.seconds * 1000;
  return 0;
}

/**
 * @param {{ uid: string } | null} user
 * @returns {Promise<Array<{ id: string, name: string, notes: string, subject: string, updatedAt?: unknown }>>}
 */
async function fetchStudyNoteSetsFromFirestore(user) {
  const ref = collection(firestore, "users", user.uid, "studyNoteSets");
  const snap = await getDocs(ref);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => tsToMs(b.updatedAt) - tsToMs(a.updatedAt));
  StudyCache.setNoteSets(user.uid, list);
  return list;
}

export async function loadStudyNoteSets(
  user,
  { preferCache = true, onFresh } = {}
) {
  if (!user?.uid || !firestore) return [];

  if (preferCache) {
    const cached = StudyCache.getNoteSets(user.uid);
    if (Array.isArray(cached)) {
      fetchStudyNoteSetsFromFirestore(user)
        .then((list) => onFresh?.(list))
      return cached;
    }
  }

  const list = await fetchStudyNoteSetsFromFirestore(user);
  onFresh?.(list);
  return list;
}

/**
 * @param {{ uid: string }} user
 * @param {{ name: string, notes: string, subject: string }} data
 * @returns {Promise<string>} new document id
 */
export async function createStudyNoteSet(user, { name, notes, subject }) {
  if (!user?.uid || !firestore) throw new Error("Not signed in");
  assertClientRateLimit("studyNoteCreate", user.uid);
  const ref = collection(firestore, "users", user.uid, "studyNoteSets");
  const docRef = await addDoc(ref, {
    name: String(name || "Untitled").slice(0, 200),
    notes: String(notes || "").slice(0, MAX_NOTES),
    subject: subject === "science" ? "science" : "history",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  invalidateOnDataChange("study_note_sets", user.uid);
  return docRef.id;
}

/**
 * @param {{ uid: string }} user
 * @param {string} id
 * @param {{ name?: string, notes?: string, subject?: string }} patch
 */
export async function updateStudyNoteSet(user, id, patch) {
  if (!user?.uid || !firestore || !id) return;
  assertClientRateLimit("studyNoteWrite", user.uid);
  const payload = { updatedAt: serverTimestamp() };
  if (patch.name != null) payload.name = String(patch.name).slice(0, 200);
  if (patch.notes != null) payload.notes = String(patch.notes).slice(0, MAX_NOTES);
  if (patch.subject != null)
    payload.subject = patch.subject === "science" ? "science" : "history";
  await setDoc(
    doc(firestore, "users", user.uid, "studyNoteSets", id),
    payload,
    { merge: true }
  );
  invalidateOnDataChange("study_note_sets", user.uid);
}

/** Max Firestore doc size is 1MB; skip saving if payload is huge */
const MAX_SESSION_RESUME_BYTES = 900_000;

/**
 * Persist in-progress AI quiz state so "Continue studying" can skip a new API call.
 * @param {{ uid: string }} user
 * @param {string} noteSetId
 * @param {object} resume plain JSON-serializable session snapshot
 */
export async function saveNoteSetSessionResume(user, noteSetId, resume) {
  if (!user?.uid || !firestore || !noteSetId || !resume) return;
  try {
    assertClientRateLimit("studySessionResume", user.uid);
    const json = JSON.stringify(resume);
    if (json.length > MAX_SESSION_RESUME_BYTES) {
      return;
    }
    await setDoc(
      doc(firestore, "users", user.uid, "studyNoteSets", noteSetId),
      {
        sessionResume: resume,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
  }
}

/**
 * @param {{ uid: string }} user
 * @param {string} noteSetId
 */
export async function clearNoteSetSessionResume(user, noteSetId) {
  if (!user?.uid || !firestore || !noteSetId) return;
  try {
    await setDoc(
      doc(firestore, "users", user.uid, "studyNoteSets", noteSetId),
      {
        sessionResume: deleteField(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
  }
}

/**
 * Permanently remove a saved note set document.
 * @param {{ uid: string }} user
 * @param {string} id
 */
export async function deleteStudyNoteSet(user, id) {
  if (!user?.uid || !firestore || !id) return;
  assertClientRateLimit("studyNoteWrite", user.uid);
  await deleteDoc(doc(firestore, "users", user.uid, "studyNoteSets", id));
  invalidateOnDataChange("study_note_sets", user.uid);
}
