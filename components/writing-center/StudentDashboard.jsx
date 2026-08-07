"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/utils/AuthContext";
import { firestore } from "@/firebase";
import {
  updateDoc,
  doc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { buildAsyncFormUrl } from "@/lib/writing-center/form";
import { SessionRequestList } from "./SessionRequestList";
import { SessionReportLink } from "./SessionReportLink";
import { SendReceiptToTeacherButton } from "./SendReceiptToTeacher";
import { getSessionReportUrl } from "@/lib/writing-center/sessionReport";
import {
  liveStudentWritingCenterSessionsQuery,
  fetchStudentWritingCenterHistory,
  mergeWritingCenterSessions,
  WC_LIVE_STATUSES,
} from "@/lib/writing-center/sessionQueries";
import { fetchReceiptSharesByStudent } from "@/lib/writing-center/receiptShares";
import { subscribeWhileVisible } from "@/lib/firestore/sharedQueryListener";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { WritingCenterCache } from "@/utils/cache";
import { hydrateLiveList, mapSnapshotDocs } from "@/utils/liveFirestoreCache";
import { invalidateOnDataChange } from "@/utils/cacheInvalidation";

export default function StudentDashboard({ preview = false, asUser = null }) {
  const [liveSessions, setLiveSessions] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [receiptShares, setReceiptShares] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [sessionType, setSessionType] = useState("IN_PERSON");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: authUser } = useAuth();
  const asUserId = asUser?.uid || asUser?.id || null;
  const user = useMemo(() => {
    if (!asUserId) return authUser;
    return {
      uid: asUserId,
      displayName: asUser.displayName || null,
      email: asUser.email || "",
    };
  }, [asUserId, asUser?.displayName, asUser?.email, authUser]);

  const sessions = useMemo(
    () => mergeWritingCenterSessions(liveSessions, pastSessions),
    [liveSessions, pastSessions],
  );

  const sharesBySession = useMemo(() => {
    /** @type {Record<string, string[]>} */
    const map = {};
    for (const share of receiptShares) {
      if (!share.sessionId) continue;
      if (!map[share.sessionId]) map[share.sessionId] = [];
      map[share.sessionId].push(share.teacherId);
    }
    return map;
  }, [receiptShares]);

  const loadPastSessions = useCallback(async () => {
    if (!firestore || !user?.uid) return;
    try {
      const history = await fetchStudentWritingCenterHistory(firestore, user.uid);
      setPastSessions(history);
    } catch (err) {
    }
  }, [user?.uid]);

  const loadReceiptShares = useCallback(async () => {
    if (!firestore || !user?.uid) return;
    try {
      const shares = await fetchReceiptSharesByStudent(firestore, user.uid);
      setReceiptShares(shares);
    } catch (err) {
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !firestore) return;

    hydrateLiveList(() => WritingCenterCache.getSessionsForUser(user.uid), (cached) => {
      setLiveSessions(
        (cached || []).filter((s) => WC_LIVE_STATUSES.includes(s.status)),
      );
      setPastSessions(
        (cached || []).filter((s) => !WC_LIVE_STATUSES.includes(s.status)),
      );
    });

    loadPastSessions();
    loadReceiptShares();

    return subscribeWhileVisible(
      () => liveStudentWritingCenterSessionsQuery(firestore, user.uid),
      (snapshot) => {
        const data = mapSnapshotDocs(snapshot);
        setLiveSessions(data);
      },
    );
  }, [user?.uid, loadPastSessions, loadReceiptShares]);

  useEffect(() => {
    if (!user?.uid || preview) return;
    WritingCenterCache.setSessionsForUser(user.uid, sessions);
  }, [sessions, user?.uid, preview]);

  const studentDisplayName =
    user?.displayName || user?.email?.split("@")[0] || "Student";

  const openAsyncForm = () => {
    const url = buildAsyncFormUrl({
      email: user?.email || "",
      name: studentDisplayName,
    });
    window.open(url, "_blank", "noopener,noreferrer");
    setShowModal(false);
    setSessionType("IN_PERSON");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !user) return;
    if (sessionType === "ASYNC") {
      openAsyncForm();
      return;
    }

    setLoading(true);
    setIsSubmitting(true);
    setError("");

    try {
      assertClientRateLimit("sessionCreate", user.uid);
      await addDoc(collection(firestore, "sessions"), {
        studentId: user.uid,
        studentName: studentDisplayName,
        studentEmail: user.email || "",
        subject: "In-person tutoring",
        notes: "",
        sessionType: "IN_PERSON",
        status: "PENDING",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowModal(false);
      setSessionType("IN_PERSON");
      invalidateOnDataChange("writing_center_sessions", user.uid);
    } catch (err) {
      setError(err.message || "Failed to submit request");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (sessionId) => {
    try {
      assertClientRateLimit("sessionUpdate", user?.uid);
      await updateDoc(doc(firestore, "sessions", sessionId), {
        status: "CANCELLED",
        updatedAt: serverTimestamp(),
      });
      setPastSessions((prev) => {
        const cancelled = sessions.find((s) => s.id === sessionId);
        if (!cancelled) return prev;
        return mergeWritingCenterSessions(prev, [
          { ...cancelled, status: "CANCELLED" },
        ]);
      });
      invalidateOnDataChange("writing_center_sessions", user?.uid);
      await loadPastSessions();
    } catch (err) {
    }
  };

  return (
    <div className={`w-full ${preview ? "" : "px-3 sm:px-4 lg:px-6 py-4"}`}>
      <header className="w-full mb-6 border-b border-gray-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Writing Center</h1>
          <p className="text-sm text-gray-600 mt-1">
            {sessions.length === 0
              ? "Request help from a writing tutor."
              : `${sessions.length} request${sessions.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {!preview && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            Request Help
          </button>
        )}
      </header>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden w-full">
        <SessionRequestList
          sessions={sessions}
          emptyMessage='No sessions yet. Click "Request Help" to get started.'
          showStudent={false}
          showActions
          renderActions={(session) => {
            if (session.status === "PENDING" && !preview) {
              return (
                <button
                  type="button"
                  onClick={() => handleCancel(session.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Cancel
                </button>
              );
            }
            if (session.status === "COMPLETED" && getSessionReportUrl(session)) {
              return (
                <div className="flex flex-col items-end gap-1">
                  <SessionReportLink session={session} />
                  {!preview && (
                    <SendReceiptToTeacherButton
                      session={session}
                      alreadySentTeacherIds={sharesBySession[session.id] || []}
                      onSent={() => loadReceiptShares()}
                    />
                  )}
                </div>
              );
            }
            return null;
          }}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Request writing help</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Session Type</label>
                <div className="mt-2 flex space-x-4">
                  <label className="flex items-center text-sm text-gray-700">
                    <input
                      type="radio"
                      value="IN_PERSON"
                      checked={sessionType === "IN_PERSON"}
                      onChange={(e) => setSessionType(e.target.value)}
                      className="mr-2"
                    />
                    In-Person
                  </label>
                  <label className="flex items-center text-sm text-gray-700">
                    <input
                      type="radio"
                      value="ASYNC"
                      checked={sessionType === "ASYNC"}
                      onChange={(e) => setSessionType(e.target.value)}
                      className="mr-2"
                    />
                    Async (Google Form)
                  </label>
                </div>
              </div>
              {sessionType === "IN_PERSON" ? (
                <p className="text-sm text-gray-600">
                  Submit to join the in-person queue. A tutor will accept your request when
                  available.
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  You&apos;ll open a Google Form to submit an async writing request. After you
                  submit, your request will appear below for tutors—usually within a minute.
                </p>
              )}
              {error && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm"
                >
                  {loading
                    ? "Please wait…"
                    : sessionType === "ASYNC"
                      ? "Open Google Form"
                      : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
