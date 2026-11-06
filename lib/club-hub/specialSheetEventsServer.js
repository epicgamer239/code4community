import { FieldValue } from "firebase-admin/firestore";
import {
  CLUB_HUB_SPECIAL_SHEET_EVENTS,
  buildSpecialSheetColumnLabel,
  parseStudentEmailPaste,
  specialSheetEventColumnKey,
} from "@/lib/club-hub/specialSheetEvents";
import { normalizeEmail } from "@/lib/email";
import { clubHubCol } from "@/lib/club-hub/activeSchool";

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 */
export async function listSpecialSheetEvents(db) {
  const snap = await db
    .collection(clubHubCol("specialSheetEvents"))
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string[]} emails
 */
export async function resolveStudentEmailsToUserIds(db, emails) {
  /** @type {{ email: string, userId: string }[]} */
  const matched = [];
  /** @type {string[]} */
  const unmatched = [];

  const { getAuth } = await import("firebase-admin/auth");
  const auth = getAuth();

  for (const email of emails) {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      unmatched.push(email);
      continue;
    }

    let userId = null;
    const snap = await db.collection("users").where("email", "==", normalized).limit(1).get();
    if (!snap.empty) {
      userId = snap.docs[0].id;
    } else {
      try {
        const user = await auth.getUserByEmail(normalized);
        userId = user.uid;
      } catch {
        userId = null;
      }
    }

    if (userId) matched.push({ email: normalized, userId });
    else unmatched.push(normalized);
  }

  return { matched, unmatched };
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{
 *   title: string,
 *   studentListPaste: string,
 *   createdByEmail: string,
 *   createdByUid: string,
 * }} input
 */
export async function createSpecialSheetEvent(db, input) {
  const title = String(input.title || "").trim();
  if (!title) throw new Error("Enter an event title.");
  const studentEmails = parseStudentEmailPaste(input.studentListPaste);
  if (studentEmails.length === 0) {
    throw new Error("Paste at least one valid student email.");
  }

  const { matched, unmatched } = await resolveStudentEmailsToUserIds(db, studentEmails);
  if (matched.length === 0) {
    throw new Error("No pasted emails matched a site account.");
  }

  const columnLabel = buildSpecialSheetColumnLabel(title);
  const baseKey = specialSheetEventColumnKey(title);
  const id = `${baseKey}-${Date.now()}`;

  const doc = {
    title,
    columnLabel,
    studentEmails: matched.map((m) => m.email),
    studentUserIds: matched.map((m) => m.userId),
    createdAt: FieldValue.serverTimestamp(),
    createdByEmail: normalizeEmail(input.createdByEmail) || "",
    createdByUid: input.createdByUid || "",
  };

  await db.collection(clubHubCol("specialSheetEvents")).doc(id).set(doc);

  return {
    id,
    ...doc,
    unmatchedEmails: unmatched,
  };
}
