"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/utils/AuthContext";
import { firestore } from "@/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { buildAsyncFormUrl } from "@/lib/writingCenterForm";
import { SessionRequestList } from "./SessionRequestList";
import { SessionReportLink } from "./SessionReportLink";
import { getSessionReportUrl } from "@/lib/writingCenterSessionReport";

export default function StudentDashboard({ preview = false }) {
  const [sessions, setSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [sessionType, setSessionType] = useState("IN_PERSON");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user && firestore) {
      const q = query(collection(firestore, "sessions"), where("studentId", "==", user.uid));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const sessionsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setSessions(sessionsData);
        },
        (err) => {
          console.error("Failed to fetch sessions:", err);
        }
      );
      return () => unsubscribe();
    }
  }, [user]);

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
    if (isSubmitting) return;

    if (sessionType === "ASYNC") {
      openAsyncForm();
      return;
    }

    setError("");
    setLoading(true);
    setIsSubmitting(true);

    try {
      await addDoc(collection(firestore, "sessions"), {
        studentId: user.uid,
        studentName: studentDisplayName,
        studentEmail: user.email,
        subject: "In-person tutoring",
        notes: "",
        sessionType: "IN_PERSON",
        status: "PENDING",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setShowModal(false);
      setSessionType("IN_PERSON");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to create session");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (sessionId) => {
    try {
      await updateDoc(doc(firestore, "sessions", sessionId), {
        status: "CANCELLED",
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to cancel session:", err);
    }
  };

  return (
    <div className={`w-full ${preview ? "" : "px-3 sm:px-4 lg:px-6 py-4"}`}>
      <header className="w-full flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 mb-6 border-b border-gray-200 pb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Writing Center - Student Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            {sessions.length === 0
              ? "No requests yet"
              : `${sessions.length} request${sessions.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {!preview && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="shrink-0 bg-indigo-600 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm sm:ml-auto"
          >
            Request Help
          </button>
        )}
      </header>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden w-full">
        <SessionRequestList
          sessions={sessions}
          showStudent={false}
          showTutor
          showActions
          emptyMessage='No sessions yet. Click "Request Help" to get started.'
          renderActions={(session) => {
            if (session.status === "PENDING" && !preview) {
              return (
                <button
                  type="button"
                  onClick={() => handleCancel(session.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Cancel
                </button>
              );
            }
            if (session.status === "COMPLETED" && getSessionReportUrl(session)) {
              return <SessionReportLink session={session} label="View report" />;
            }
            return null;
          }}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Request Writing Help
              </h3>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Session Type</label>
                    <div className="mt-2 flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="IN_PERSON"
                          checked={sessionType === "IN_PERSON"}
                          onChange={(e) => setSessionType(e.target.value)}
                          className="mr-2"
                        />
                        In-Person
                      </label>
                      <label className="flex items-center">
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
                    <div className="rounded-md border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                      <p className="font-medium mb-1">Submit on Google Forms</p>
                      <p>
                        Use the same email you use here ({user?.email}). After you submit the form,
                        your request will appear below for tutors—usually within a minute.
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSessionType("IN_PERSON");
                      setError("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      )}
    </div>
  );
}
