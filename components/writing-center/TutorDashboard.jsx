"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/utils/AuthContext";
import { firestore } from "@/firebase";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { SessionRequestList } from "./SessionRequestList";
import { SessionReportLink } from "./SessionReportLink";
import {
  getSessionReportUrl,
  uploadSessionReport,
  validateSessionReportFile,
} from "@/lib/writing-center/sessionReport";
import {
  fetchTutorWritingCenterHistory,
  mergeWritingCenterSessions,
  WC_LIVE_STATUSES,
} from "@/lib/writing-center/sessionQueries";
import { useWritingCenterLiveSessions } from "@/lib/writing-center/useLiveSessions";
import { isMiniLessonSession, miniLessonIncludesTutor } from "@/lib/writing-center/miniLesson";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { WritingCenterCache } from "@/utils/cache";
import { hydrateLiveList } from "@/utils/liveFirestoreCache";
import { invalidateOnDataChange } from "@/utils/cacheInvalidation";

export default function TutorDashboard({ preview = false, asUser = null }) {
  const liveSessions = useWritingCenterLiveSessions(!!firestore);
  const [pastSessions, setPastSessions] = useState([]);
  const [activeTab, setActiveTab] = useState("available");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeStep, setCompleteStep] = useState("confirm");
  const [selectedSession, setSelectedSession] = useState(null);
  const [reportFile, setReportFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
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

  const loadPastSessions = useCallback(async () => {
    if (!firestore || !user?.uid) return;
    try {
      const history = await fetchTutorWritingCenterHistory(firestore, user.uid);
      setPastSessions(history);
    } catch (err) {
    }
  }, [user?.uid]);

  useEffect(() => {
    let interval;
    if (sessionStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  useEffect(() => {
    if (!user?.uid || !firestore) return;

    hydrateLiveList(() => WritingCenterCache.getSessionsAll(), (cached) => {
      const past = (cached || []).filter((s) => !WC_LIVE_STATUSES.includes(s.status));
      if (past.length) setPastSessions(past);
    });

    loadPastSessions();
  }, [user?.uid, loadPastSessions]);

  useEffect(() => {
    const activeInProgress = liveSessions.find(
      (s) =>
        s.status === "IN_PROGRESS" &&
        s.tutorId === user?.uid &&
        s.sessionType !== "ASYNC",
    );
    if (activeInProgress) {
      setActiveSession((current) => current || activeInProgress);
      if (activeInProgress.sessionStartTime) {
        setSessionStartTime(
          (current) => current || new Date(activeInProgress.sessionStartTime).getTime(),
        );
      }
    }
  }, [liveSessions, user?.uid]);

  useEffect(() => {
    if (preview) return;
    WritingCenterCache.setSessionsAll(sessions);
  }, [sessions, preview]);

  const closeCompleteModal = () => {
    setShowCompleteModal(false);
    setCompleteStep("confirm");
    setSelectedSession(null);
    setReportFile(null);
    setError("");
  };

  const openCompleteModal = (session, step = "confirm") => {
    setSelectedSession(session);
    setCompleteStep(step);
    setReportFile(null);
    setError("");
    setShowCompleteModal(true);
  };

  const handleAccept = async (sessionId) => {
    try {
      assertClientRateLimit("sessionUpdate", user?.uid);
      await updateDoc(doc(firestore, "sessions", sessionId), {
        tutorId: user.uid,
        tutorName: user.displayName || user.email,
        tutorEmail: user.email,
        status: "ACCEPTED",
        updatedAt: serverTimestamp(),
      });
      invalidateOnDataChange("writing_center_sessions", user.uid);
    } catch (err) {
      setError(err.message || "Failed to accept session");
    }
  };

  const handleStartSession = async (session) => {
    setActiveSession(session);
    setSessionStartTime(Date.now());
    setElapsedTime(0);
    try {
      assertClientRateLimit("sessionUpdate", user?.uid);
      await updateDoc(doc(firestore, "sessions", session.id), {
        status: "IN_PROGRESS",
        sessionStartTime: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
      invalidateOnDataChange("writing_center_sessions", user?.uid);
    } catch (err) {
    }
  };

  const handleEndSession = () => {
    if (!activeSession) return;
    openCompleteModal(activeSession, "confirm");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleComplete = async () => {
    if (isSubmitting || !selectedSession) return;

    setLoading(true);
    setIsSubmitting(true);
    setError("");

    try {
      assertClientRateLimit("sessionUpdate", user?.uid);
      const duration =
        selectedSession.id === activeSession?.id ? elapsedTime : selectedSession.duration;

      await updateDoc(doc(firestore, "sessions", selectedSession.id), {
        status: "COMPLETED",
        sessionEndTime: new Date().toISOString(),
        duration: duration ?? null,
        updatedAt: serverTimestamp(),
      });

      const completed = {
        ...selectedSession,
        status: "COMPLETED",
        sessionEndTime: new Date().toISOString(),
        duration: duration ?? null,
      };
      setPastSessions((prev) => mergeWritingCenterSessions([], [completed, ...prev]));
      setActiveSession(null);
      setSessionStartTime(null);
      setElapsedTime(0);
      setCompleteStep("upload");
      setSelectedSession(completed);
      invalidateOnDataChange("writing_center_sessions", user?.uid);
    } catch (err) {
      setError(err.message || "Failed to complete session");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleUploadReport = async () => {
    if (isSubmitting || !selectedSession || !user) return;

    const validation = validateSessionReportFile(reportFile);
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    setIsSubmitting(true);
    setError("");

    try {
      await uploadSessionReport(selectedSession.id, reportFile, user.uid);
      if (selectedSession.status !== "COMPLETED") {
        await updateDoc(doc(firestore, "sessions", selectedSession.id), {
          status: "COMPLETED",
          sessionEndTime: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
      }
      await loadPastSessions();
      closeCompleteModal();
      invalidateOnDataChange("writing_center_sessions", user.uid);
    } catch (err) {
      setError(err.message || "Failed to upload report");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const availableSessions = sessions.filter(
    (s) => s.status === "PENDING" || s.status === "ACCEPTED",
  );
  const mySessions = sessions.filter(
    (s) =>
      (s.tutorId === user?.uid || miniLessonIncludesTutor(s, user?.uid)) &&
      (s.status === "ACCEPTED" || s.status === "COMPLETED" || s.status === "IN_PROGRESS"),
  );

  const tabClass = (tab) =>
    `whitespace-nowrap py-2 px-3 rounded-md text-sm font-medium transition-colors ${
      activeTab === tab
        ? "bg-indigo-100 text-indigo-700"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  const isAsyncSession = (session) => session.sessionType === "ASYNC";

  const renderActions = (session) => {
    if (preview) return null;
    const isMine =
      session.tutorId === user?.uid ||
      miniLessonIncludesTutor(session, user?.uid);

    if (isMiniLessonSession(session)) {
      return null;
    }

    if (session.status === "PENDING") {
      return (
        <button
          type="button"
          onClick={() => handleAccept(session.id)}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          Accept
        </button>
      );
    }

    if (session.status === "ACCEPTED" && isMine) {
      if (isAsyncSession(session)) {
        return (
          <button
            type="button"
            onClick={() => openCompleteModal(session, "upload")}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            Upload report
          </button>
        );
      }
      return (
        <button
          type="button"
          onClick={() => handleStartSession(session)}
          className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-green-700"
        >
          Start
        </button>
      );
    }

    if (session.status === "IN_PROGRESS" && isMine) {
      return (
        <button
          type="button"
          onClick={() => openCompleteModal(session, "confirm")}
          className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-red-700"
        >
          End
        </button>
      );
    }

    if (session.status === "COMPLETED") {
      if (getSessionReportUrl(session)) {
        return <SessionReportLink session={session} />;
      }
      return (
        <button
          type="button"
          onClick={() => openCompleteModal(session, "upload")}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          Upload report
        </button>
      );
    }
    return null;
  };

  return (
    <div className={`w-full ${preview ? "" : "px-3 sm:px-4 lg:px-6 py-4"}`}>
      <header className="w-full mb-6 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Writing Center - Tutor Dashboard</h1>
        <nav className="mt-3 flex flex-wrap gap-1" aria-label="Tutor sections">
          <button type="button" onClick={() => setActiveTab("available")} className={tabClass("available")}>
            Available Requests ({availableSessions.length})
          </button>
          <button type="button" onClick={() => setActiveTab("my-sessions")} className={tabClass("my-sessions")}>
            My Sessions ({mySessions.length})
          </button>
        </nav>
      </header>

      {activeTab === "available" ? (
        <div className="w-full">
          {activeSession && !preview && activeSession.sessionType !== "ASYNC" && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6 w-full">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-purple-900">Active Session</h3>
                  <p className="text-sm text-purple-700">{activeSession.studentName}</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-purple-900">{formatTime(elapsedTime)}</div>
                  <button
                    type="button"
                    onClick={handleEndSession}
                    className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                  >
                    End Session
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden w-full">
            <SessionRequestList
              sessions={availableSessions}
              emptyMessage="No available requests at the moment."
              showTutor
              showActions
              renderActions={renderActions}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden w-full">
          <SessionRequestList
            sessions={mySessions}
            emptyMessage="No sessions yet."
            showTutor
            showActions
            renderActions={renderActions}
          />
        </div>
      )}

      {showCompleteModal && selectedSession && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-4 py-5 sm:p-6">
              {completeStep === "confirm" ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">End in-person session</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Mark this session complete for {selectedSession.studentName}? On the next step
                    you can upload the session summary PDF (save from Google Forms print).
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {isAsyncSession(selectedSession) ? "Upload async report" : "Upload session report"}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {isAsyncSession(selectedSession)
                      ? `Upload the session summary PDF for ${selectedSession.studentName}. This marks the async request complete.`
                      : "Download the PDF from your Session Summary form (Print on the individual response), then upload it here. Students and staff can open it in a new tab."}
                  </p>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PDF file (max 10 MB)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </>
              )}
              {error && (
                <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCompleteModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {completeStep === "upload" ? "Skip for now" : "Cancel"}
                </button>
                {completeStep === "confirm" ? (
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={loading || isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? "Saving…" : "Mark complete"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUploadReport}
                    disabled={loading || isSubmitting || !reportFile}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? "Uploading…" : "Upload PDF"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
