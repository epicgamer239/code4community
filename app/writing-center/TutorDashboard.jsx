"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/utils/AuthContext";
import { firestore } from "@/firebase";
import { collection, query, onSnapshot, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { SessionRequestList } from "./SessionRequestList";
import { SessionReportLink } from "./SessionReportLink";
import {
  getSessionReportUrl,
  uploadSessionReport,
  validateSessionReportFile,
} from "@/lib/writingCenterSessionReport";
import { isMiniLessonSession } from "@/lib/writingCenterMiniLesson";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { WritingCenterCache } from "@/utils/cache";
import {
  commitLiveSnapshot,
  hydrateLiveList,
} from "@/utils/liveFirestoreCache";
import { invalidateOnDataChange } from "@/utils/cacheInvalidation";

export default function TutorDashboard({ preview = false }) {
  const [sessions, setSessions] = useState([]);
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
  const { user } = useAuth();

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
    if (user && firestore) {
      hydrateLiveList(() => WritingCenterCache.getSessionsAll(), setSessions);

      const q = query(collection(firestore, "sessions"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const sessionsData = commitLiveSnapshot(
          snapshot,
          setSessions,
          (data) => WritingCenterCache.setSessionsAll(data)
        );

        const activeInProgress = sessionsData.find(
          (s) =>
            s.status === "IN_PROGRESS" &&
            s.tutorId === user.uid &&
            s.sessionType !== "ASYNC",
        );
        if (activeInProgress && !activeSession) {
          setActiveSession(activeInProgress);
          if (activeInProgress.sessionStartTime) {
            setSessionStartTime(new Date(activeInProgress.sessionStartTime).getTime());
          }
        }
      }, (err) => {
      });
      return () => unsubscribe();
    }
  }, [user, activeSession]);

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

      setActiveSession(null);
      setSessionStartTime(null);
      setElapsedTime(0);
      setCompleteStep("upload");
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
      s.tutorId === user?.uid &&
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
    if (isMiniLessonSession(session)) {
      return (
        <span className="text-xs font-medium text-gray-500">Tracked</span>
      );
    }
    const isMine = session.tutorId === user?.uid;
    const asyncSession = isAsyncSession(session);

    if (activeTab === "available") {
      if (session.status === "PENDING") {
        return (
          <button
            type="button"
            onClick={() => handleAccept(session.id)}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            {asyncSession ? "Claim" : "Accept"}
          </button>
        );
      }
      if (session.status === "ACCEPTED" && isMine) {
        if (asyncSession) {
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
            Start Session
          </button>
        );
      }
      return null;
    }
    if (session.status === "ACCEPTED") {
      if (asyncSession) {
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
          onClick={() => openCompleteModal(session, "confirm")}
          className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-green-700"
        >
          Mark Complete
        </button>
      );
    }
    if (session.status === "COMPLETED") {
      if (getSessionReportUrl(session)) {
        return (
          <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
            <SessionReportLink session={session} label="View PDF" />
            <button
              type="button"
              onClick={() => openCompleteModal(session, "upload")}
              className="text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              Replace
            </button>
          </div>
        );
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
                  <p className="text-sm text-purple-700">
                    {activeSession.studentName}
                  </p>
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
                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium hover:file:bg-indigo-100"
                    onChange={(e) => {
                      setReportFile(e.target.files?.[0] || null);
                      setError("");
                    }}
                  />
                  {getSessionReportUrl(selectedSession) && (
                    <p className="mt-2 text-xs text-gray-500">
                      Uploading replaces the existing report.
                    </p>
                  )}
                </>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mt-4 text-sm">
                  {error}
                </div>
              )}

              <div className="mt-5 flex justify-end flex-wrap gap-2">
                <button
                  type="button"
                  onClick={closeCompleteModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                >
                  {completeStep === "upload" ? "Done" : "Cancel"}
                </button>
                {completeStep === "confirm" ? (
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={loading}
                    className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {loading ? "Saving…" : "End & continue"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUploadReport}
                    disabled={loading || !reportFile}
                    className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {loading
                      ? "Uploading…"
                      : isAsyncSession(selectedSession)
                        ? "Upload & complete"
                        : "Upload PDF"}
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
