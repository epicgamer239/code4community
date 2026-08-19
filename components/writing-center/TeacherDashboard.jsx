"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import { firestore } from "@/firebase";
import { fetchReceiptSharesForTeacher } from "@/lib/writing-center/receiptShares";
import { fetchTeacherMiniLessons } from "@/lib/writing-center/sessionQueries";
import { formatSessionDate, formatSessionDateOnly } from "@/lib/firestoreDates";
import { resolveDisplayName } from "@/lib/profile";
import { SessionReportLink } from "./SessionReportLink";
import {
  getSessionReportUrl,
  uploadSessionReport,
  validateSessionReportFile,
} from "@/lib/writing-center/sessionReport";
import { miniLessonNeedsTeacherReport, formatMiniLessonTutors } from "@/lib/writing-center/miniLesson";

function formatType(sessionType) {
  switch (sessionType) {
    case "MINI_LESSON":
      return "Mini lesson";
    case "IN_PERSON":
      return "In-person";
    case "ASYNC":
      return "Async";
    default:
      return sessionType || "—";
  }
}

function matchesQuery(ticket, q) {
  if (!q) return true;
  const hay = [
    ticket.studentName,
    ticket.studentEmail,
    ticket.tutorName,
    ticket.subject,
    ticket.sessionType,
    ticket.teacherName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function matchesMiniLessonQuery(lesson, q) {
  if (!q) return true;
  const hay = [
    lesson.subject,
    formatMiniLessonTutors(lesson),
    lesson.tutorEmail,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export default function TeacherDashboard({ asUser = null }) {
  const { user: authUser, userData } = useAuth();
  const asUserId = asUser?.uid || asUser?.id || null;
  const user = useMemo(() => {
    if (!asUserId) return authUser;
    return {
      uid: asUserId,
      displayName: asUser.displayName || null,
      email: asUser.email || "",
    };
  }, [asUserId, asUser?.displayName, asUser?.email, authUser]);
  const profile = asUser || userData;
  const preview = Boolean(asUser);

  const [activeTab, setActiveTab] = useState("mini-lessons");
  const [tickets, setTickets] = useState([]);
  const [miniLessons, setMiniLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [reportFile, setReportFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!firestore || !user?.uid) return [];
    const rows = await fetchReceiptSharesForTeacher(firestore, user.uid);
    rows.sort((a, b) => {
      const ta = a.sharedAt?.toDate?.() || a.sharedAt || 0;
      const tb = b.sharedAt?.toDate?.() || b.sharedAt || 0;
      return new Date(tb) - new Date(ta);
    });
    return rows;
  }, [user?.uid]);

  const loadMiniLessons = useCallback(async () => {
    if (!firestore || !user?.uid) return [];
    return fetchTeacherMiniLessons(firestore, user.uid);
  }, [user?.uid]);

  const refreshAll = useCallback(async () => {
    if (!firestore || !user?.uid) return;
    setLoading(true);
    setError("");
    try {
      const [receiptRows, lessonRows] = await Promise.all([
        loadTickets(),
        loadMiniLessons(),
      ]);
      setTickets(receiptRows);
      setMiniLessons(lessonRows);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [loadTickets, loadMiniLessons, user?.uid]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const pendingMiniLessons = useMemo(
    () => miniLessons.filter((lesson) => miniLessonNeedsTeacherReport(lesson)),
    [miniLessons],
  );

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => matchesQuery(t, q));
  }, [tickets, search]);

  const filteredMiniLessons = useMemo(() => {
    const q = search.trim().toLowerCase();
    return miniLessons.filter((lesson) => matchesMiniLessonQuery(lesson, q));
  }, [miniLessons, search]);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) || null,
    [tickets, selectedId],
  );

  const teacherName = resolveDisplayName(profile || user) || "Teacher";

  const closeUploadModal = () => {
    setUploadTarget(null);
    setReportFile(null);
    setUploadError("");
  };

  const openUploadModal = (lesson) => {
    if (preview) return;
    setUploadTarget(lesson);
    setReportFile(null);
    setUploadError("");
  };

  const handleUploadMiniLessonReport = async () => {
    if (preview || uploading || !uploadTarget || !user?.uid) return;

    const validation = validateSessionReportFile(reportFile);
    if (validation) {
      setUploadError(validation);
      return;
    }

    setUploading(true);
    setUploadError("");
    try {
      await uploadSessionReport(uploadTarget.id, reportFile, user.uid);
      await refreshAll();
      closeUploadModal();
    } catch (err) {
      setUploadError(err.message || "Failed to upload rating PDF.");
    } finally {
      setUploading(false);
    }
  };

  const tabClass = (tab) =>
    `whitespace-nowrap py-2 px-3 rounded-md text-sm font-medium transition-colors ${
      activeTab === tab
        ? "bg-indigo-100 text-indigo-700"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <div className="w-full px-3 sm:px-4 lg:px-6 py-4">
      <header className="mb-6 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Writing Center — Teacher</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload tutor rating PDFs for mini lessons assigned to you, {teacherName}. Student
          session receipts appear on the Receipts tab.
        </p>
        <nav className="mt-3 flex flex-wrap gap-1" aria-label="Teacher sections">
          <button
            type="button"
            onClick={() => {
              setActiveTab("mini-lessons");
              setSelectedId(null);
            }}
            className={tabClass("mini-lessons")}
          >
            Mini lessons
            {pendingMiniLessons.length > 0 ? ` (${pendingMiniLessons.length} to upload)` : ""}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("receipts");
              setSelectedId(null);
            }}
            className={tabClass("receipts")}
          >
            Student receipts ({tickets.length})
          </button>
        </nav>
      </header>

      {!preview && pendingMiniLessons.length > 0 && activeTab === "mini-lessons" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You have {pendingMiniLessons.length} mini lesson
          {pendingMiniLessons.length === 1 ? "" : "s"} waiting for a tutor rating PDF upload.
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            activeTab === "mini-lessons"
              ? "Search by title or tutor…"
              : "Search by student, tutor, subject…"
          }
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label={activeTab === "mini-lessons" ? "Search mini lessons" : "Search receipts"}
        />
        <button
          type="button"
          onClick={refreshAll}
          disabled={loading}
          className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {activeTab === "mini-lessons" ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {loading && miniLessons.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Loading mini lessons…</div>
          ) : filteredMiniLessons.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {miniLessons.length === 0
                ? "No mini lessons assigned to you yet."
                : "No mini lessons match your search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] table-fixed text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2.5">Title</th>
                    <th className="px-3 py-2.5 w-[18%]">Tutors</th>
                    <th className="px-3 py-2.5 w-[11rem]">Date</th>
                    <th className="px-3 py-2.5 text-right w-[12rem]">Rating PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMiniLessons.map((lesson) => {
                    const needsUpload = miniLessonNeedsTeacherReport(lesson);
                    return (
                      <tr key={lesson.id} className="align-middle hover:bg-gray-50/80">
                        <td className="px-3 py-2.5 text-sm font-medium text-gray-900 truncate">
                          {lesson.subject || "Mini lesson"}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-gray-600 truncate">
                          {formatMiniLessonTutors(lesson)}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-gray-500 tabular-nums whitespace-nowrap">
                          {formatSessionDateOnly(lesson.createdAt)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {getSessionReportUrl(lesson) ? (
                            <SessionReportLink session={lesson} label="View PDF" />
                          ) : preview ? (
                            <span className="text-sm text-gray-400">Upload required</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openUploadModal(lesson)}
                              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                              {needsUpload ? "Upload rating" : "Upload PDF"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            {loading && tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Loading receipts…</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {tickets.length === 0
                  ? "No receipts yet. Students can send completed session PDFs to you from Writing Center."
                  : "No receipts match your search."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] table-fixed text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2.5">Student</th>
                      <th className="px-3 py-2.5 w-[7.5rem]">Type</th>
                      <th className="px-3 py-2.5 w-[12.5rem]">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTickets.map((ticket) => {
                      const active = ticket.id === selectedId;
                      return (
                        <tr
                          key={ticket.id}
                          className={`cursor-pointer hover:bg-indigo-50/60 ${
                            active ? "bg-indigo-50" : ""
                          }`}
                          onClick={() => setSelectedId(ticket.id)}
                        >
                          <td className="px-3 py-2.5">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {ticket.studentName || "Student"}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-sm text-gray-600">
                            {formatType(ticket.sessionType)}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-gray-500 tabular-nums whitespace-nowrap">
                            {formatSessionDate(ticket.sharedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5 min-h-[16rem]">
            {!selected ? (
              <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-gray-500">
                Select a ticket to view details.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selected.studentName || "Student"}
                  </h2>
                </div>

                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-gray-500">Tutor</dt>
                    <dd className="font-medium text-gray-900">
                      {selected.tutorName || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Type</dt>
                    <dd className="font-medium text-gray-900">
                      {formatType(selected.sessionType)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Subject</dt>
                    <dd className="font-medium text-gray-900">
                      {selected.subject || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Session date</dt>
                    <dd className="font-medium text-gray-900">
                      {formatSessionDate(selected.sessionCreatedAt || selected.sessionEndTime)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Sent to you</dt>
                    <dd className="font-medium text-gray-900">
                      {formatSessionDate(selected.sharedAt)}
                    </dd>
                  </div>
                </dl>

                {selected.sessionReportUrl ? (
                  <a
                    href={selected.sessionReportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    View receipt PDF
                  </a>
                ) : (
                  <p className="text-sm text-amber-700">No PDF linked on this ticket.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {uploadTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">Upload tutor rating</h3>
            <p className="mt-2 text-sm text-gray-600">
              Mini lesson: <span className="font-medium">{uploadTarget.subject || "Mini lesson"}</span>
              {" · "}
              Tutor: <span className="font-medium">{formatMiniLessonTutors(uploadTarget)}</span>
            </p>
            <label className="mt-4 block text-sm font-medium text-gray-700">
              Rating PDF (max 10 MB)
            </label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setReportFile(e.target.files?.[0] || null)}
              className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {uploadError && (
              <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {uploadError}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeUploadModal}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadMiniLessonReport}
                disabled={uploading || !reportFile}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
