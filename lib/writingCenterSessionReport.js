import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { firestore, storage } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { invalidateOnDataChange } from "@/utils/cacheInvalidation";

export const SESSION_REPORT_MAX_BYTES = 10 * 1024 * 1024;

export function getSessionReportUrl(session) {
  if (!session) return null;
  const url = session.sessionReportUrl || session.proofFileUrl;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

export function validateSessionReportFile(file) {
  if (!file) return "Select a PDF file.";
  const name = file.name?.toLowerCase() || "";
  const isPdf =
    file.type === "application/pdf" || name.endsWith(".pdf");
  if (!isPdf) return "Only PDF files are allowed.";
  if (file.size > SESSION_REPORT_MAX_BYTES) return "PDF must be under 10 MB.";
  return "";
}

/**
 * Upload tutor session report PDF to Firebase Storage and save URL on the session.
 */
export async function uploadSessionReport(sessionId, file, tutorUid) {
  if (!storage || !firestore) {
    throw new Error("Firebase is not configured.");
  }
  const validation = validateSessionReportFile(file);
  if (validation) throw new Error(validation);

  assertClientRateLimit("sessionReportUpload", tutorUid);

  const storagePath = `writing-center/sessions/${sessionId}/session-report.pdf`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: "application/pdf",
  });

  const downloadUrl = await getDownloadURL(storageRef);

  await updateDoc(doc(firestore, "sessions", sessionId), {
    sessionReportUrl: downloadUrl,
    sessionReportStoragePath: storagePath,
    sessionReportFileName: file.name || "session-report.pdf",
    sessionReportUploadedAt: serverTimestamp(),
    sessionReportUploadedBy: tutorUid,
    updatedAt: serverTimestamp(),
  });

  invalidateOnDataChange("writing_center_sessions", tutorUid);

  return downloadUrl;
}
