import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
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
 * Upload session report PDF (tutor for regular sessions; overseeing teacher for mini lessons).
 */
export async function uploadSessionReport(sessionId, file, uploaderUid) {
  if (!storage || !firestore) {
    throw new Error("Firebase is not configured.");
  }
  const validation = validateSessionReportFile(file);
  if (validation) throw new Error(validation);
  if (!uploaderUid) throw new Error("Sign in to upload a session report.");

  assertClientRateLimit("sessionReportUpload", uploaderUid);

  const sessionRef = doc(firestore, "sessions", sessionId);
  const sessionSnap = await getDoc(sessionRef);
  if (!sessionSnap.exists()) {
    throw new Error("Session not found. Refresh and try again.");
  }
  const session = sessionSnap.data() || {};
  const isMiniLesson = session.sessionType === "MINI_LESSON";

  if (isMiniLesson) {
    if (!session.teacherId || session.teacherId !== uploaderUid) {
      const who = session.teacherName || session.teacherEmail || "the assigned teacher";
      throw new Error(
        `This mini lesson is assigned to ${who} for tutor rating upload.`,
      );
    }
  } else if (session.tutorId && session.tutorId !== uploaderUid) {
    const who = session.tutorName || session.tutorEmail || "another tutor";
    throw new Error(
      `This session is assigned to ${who}. Sign in as that tutor to upload the report.`,
    );
  } else if (!session.tutorId) {
    throw new Error("This session has no assigned tutor yet.");
  }

  const storagePath = `writing-center/sessions/${sessionId}/session-report.pdf`;
  const storageRef = ref(storage, storagePath);

  try {
    await uploadBytes(storageRef, file, {
      contentType: "application/pdf",
      customMetadata: {
        sessionId,
        uploadedBy: uploaderUid,
      },
    });
  } catch (err) {
    const code = err?.code || "";
    const message = err?.message || String(err);
    if (
      code === "storage/unauthorized" ||
      /unauthorized|permission/i.test(message)
    ) {
      throw new Error(
        isMiniLesson
          ? "Upload denied by Storage rules. Confirm you are signed in as the assigned teacher and try again."
          : "Upload denied by Storage rules. Confirm you are signed in as the assigned tutor and try again.",
      );
    }
    if (/cors|network|Failed to fetch|ERR_FAILED/i.test(message)) {
      throw new Error(
        "Could not reach Firebase Storage. Refresh and try again. If this keeps happening, Storage may not be set up for this Firebase project.",
      );
    }
    throw err instanceof Error ? err : new Error(message || "Upload failed.");
  }

  const downloadUrl = await getDownloadURL(storageRef);

  await updateDoc(sessionRef, {
    sessionReportUrl: downloadUrl,
    sessionReportStoragePath: storagePath,
    sessionReportFileName: file.name || "session-report.pdf",
    sessionReportUploadedAt: serverTimestamp(),
    sessionReportUploadedBy: uploaderUid,
    updatedAt: serverTimestamp(),
  });

  invalidateOnDataChange("writing_center_sessions", uploaderUid);

  return downloadUrl;
}
