import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import { getSessionReportUrl } from "@/lib/writing-center/sessionReport";
import { resolveDisplayName } from "@/lib/profile";
import { assertClientRateLimit } from "@/utils/clientRateLimit";

export const WRITING_CENTER_RECEIPT_SHARES = "writingCenterReceiptShares";

/** @param {string} sessionId @param {string} teacherId */
export function receiptShareDocId(sessionId, teacherId) {
  return `${sessionId}_${teacherId}`;
}

/**
 * Teachers students can send receipts to (role == teacher).
 * @param {import('firebase/firestore').Firestore} db
 */
export async function fetchWritingCenterTeachers(db = firestore) {
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, "users"), where("role", "==", "teacher"), limit(200)),
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) =>
      resolveDisplayName(a).localeCompare(resolveDisplayName(b), undefined, {
        sensitivity: "base",
      }),
    );
}

/**
 * Tickets shared with this teacher.
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} teacherId
 */
export async function fetchReceiptSharesForTeacher(db, teacherId) {
  if (!db || !teacherId) return [];
  const snap = await getDocs(
    query(
      collection(db, WRITING_CENTER_RECEIPT_SHARES),
      where("teacherId", "==", teacherId),
      limit(500),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Shares already sent by this student (for UI badges).
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} studentId
 */
export async function fetchReceiptSharesByStudent(db, studentId) {
  if (!db || !studentId) return [];
  const snap = await getDocs(
    query(
      collection(db, WRITING_CENTER_RECEIPT_SHARES),
      where("studentId", "==", studentId),
      limit(500),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * @param {{
 *   session: Record<string, unknown> & { id: string },
 *   teacher: { id: string, email?: string, displayName?: string },
 *   sharedBy: { uid: string, displayName?: string | null, email?: string | null },
 * }} args
 */
export async function shareSessionReceiptWithTeacher({ session, teacher, sharedBy }) {
  if (!firestore) throw new Error("Firebase is not configured.");
  const reportUrl = getSessionReportUrl(session);
  if (!reportUrl) throw new Error("This session has no PDF receipt yet.");
  if (!teacher?.id) throw new Error("Choose a teacher.");
  if (session.studentId !== sharedBy.uid) {
    throw new Error("Only the student on this session can send the receipt.");
  }

  assertClientRateLimit("receiptShareCreate", sharedBy.uid);

  const id = receiptShareDocId(session.id, teacher.id);
  await setDoc(
    doc(firestore, WRITING_CENTER_RECEIPT_SHARES, id),
    {
      sessionId: session.id,
      studentId: session.studentId,
      studentName: session.studentName || resolveDisplayName(sharedBy) || "",
      studentEmail: session.studentEmail || sharedBy.email || "",
      teacherId: teacher.id,
      teacherName: resolveDisplayName(teacher) || teacher.email || "",
      teacherEmail: teacher.email || "",
      tutorId: session.tutorId || "",
      tutorName: session.tutorName || "",
      sessionReportUrl: reportUrl,
      sessionReportFileName: session.sessionReportFileName || "session-report.pdf",
      sessionType: session.sessionType || "",
      subject: session.subject || "",
      sessionStatus: session.status || "COMPLETED",
      sessionCreatedAt: session.createdAt || null,
      sessionEndTime: session.sessionEndTime || null,
      sharedAt: serverTimestamp(),
      sharedBy: sharedBy.uid,
      sharedByName: resolveDisplayName(sharedBy) || sharedBy.email || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return id;
}
