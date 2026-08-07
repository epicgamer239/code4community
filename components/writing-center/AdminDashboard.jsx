"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/utils/AuthContext";
import { firestore } from "@/firebase";
import {
  collection,
  updateDoc,
  doc,
  addDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  MINI_LESSON_STUDENT_EMAIL,
  MINI_LESSON_STUDENT_ID,
  MINI_LESSON_STUDENT_NAME,
  miniLessonDateToDate,
  isMiniLessonSession,
} from "@/lib/writing-center/miniLesson";
import {
  fetchWritingCenterHistorySessions,
  mergeWritingCenterSessions,
  WC_LIVE_STATUSES,
} from "@/lib/writing-center/sessionQueries";
import { useWritingCenterLiveSessions } from "@/lib/writing-center/useLiveSessions";
import { SessionRequestList } from "./SessionRequestList";
import StudentDashboard from "./StudentDashboard";
import TutorDashboard from "./TutorDashboard";
import TeacherDashboard from "./TeacherDashboard";
import { WritingCenterPreviewBanner } from "./WritingCenterPreviewBanner";
import { AdminSessionExpandedPanel } from "./AdminSessionExpandedPanel";
import { SessionReportLink } from "./SessionReportLink";
import { getSessionReportUrl } from "@/lib/writing-center/sessionReport";
import { sortSessionsNewestFirst } from "@/lib/firestoreDates";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { WritingCenterCache } from "@/utils/cache";
import { hydrateLiveList } from "@/utils/liveFirestoreCache";
import { invalidateOnDataChange } from "@/utils/cacheInvalidation";
import { resolveDisplayName, resolveWritingCenterViewRole } from "@/lib/profile";
import { hasWritingCenterTutorAccess } from "@/lib/tutorServices";

function simulateRoleLabel(viewRole) {
  if (viewRole === "TUTOR") return "tutor";
  if (viewRole === "TEACHER") return "teacher";
  return "student";
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('sessions');
  const liveSessions = useWritingCenterLiveSessions(!!firestore);
  const [pastSessions, setPastSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, asyncPending: 0 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [expandedSession, setExpandedSession] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTutorFilter, setSelectedTutorFilter] = useState('ALL');
  const [tutorReportFilter, setTutorReportFilter] = useState('ALL');
  const [showMiniLessonModal, setShowMiniLessonModal] = useState(false);
  const [miniLessonTitle, setMiniLessonTitle] = useState('');
  const [miniLessonDate, setMiniLessonDate] = useState('');
  const [miniLessonTutorId, setMiniLessonTutorId] = useState('');
  const [miniLessonError, setMiniLessonError] = useState('');
  const [miniLessonSaving, setMiniLessonSaving] = useState(false);
  const [simulateUser, setSimulateUser] = useState(null);
  const [simulateSearch, setSimulateSearch] = useState("");
  const { user } = useAuth();

  const sessions = useMemo(
    () => mergeWritingCenterSessions(liveSessions, pastSessions),
    [liveSessions, pastSessions],
  );

  const recomputeStats = useCallback((allSessions) => {
    setStats({
      total: allSessions.length,
      completed: allSessions.filter((s) => s.status === "COMPLETED").length,
      pending: allSessions.filter((s) => s.status === "PENDING").length,
      asyncPending: allSessions.filter(
        (s) => s.status === "PENDING" && s.sessionType === "ASYNC",
      ).length,
    });
  }, []);

  const loadPastSessions = useCallback(async () => {
    if (!firestore) return;
    try {
      const history = await fetchWritingCenterHistorySessions(firestore);
      setPastSessions(history);
    } catch (err) {
    }
  }, []);

  const loadUsers = useCallback(async () => {
    if (!firestore) return;
    try {
      const snap = await getDocs(collection(firestore, "users"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(list);
      WritingCenterCache.setUsers(list);
    } catch (err) {
    }
  }, []);

  useEffect(() => {
    if (!firestore) return;

    hydrateLiveList(() => WritingCenterCache.getSessionsAll(), (cached) => {
      const past = cached.filter((s) => !WC_LIVE_STATUSES.includes(s.status));
      if (past.length) setPastSessions(past);
      recomputeStats(cached);
    });

    hydrateLiveList(() => WritingCenterCache.getUsers(), setUsers);
    loadPastSessions();
    loadUsers();
  }, [loadPastSessions, loadUsers, recomputeStats]);

  useEffect(() => {
    recomputeStats(sessions);
    WritingCenterCache.setSessionsAll(sessions);
  }, [sessions, recomputeStats]);

  const handleAssignSession = async () => {
    if (!selectedSession || !selectedTutor) return;
    
    try {
      assertClientRateLimit("sessionUpdate", user?.uid);
      const tutorUser = users.find(u => u.id === selectedTutor);
      await updateDoc(doc(firestore, 'sessions', selectedSession.id), {
        tutorId: selectedTutor,
        tutorName: tutorUser?.displayName || tutorUser?.email,
        tutorEmail: tutorUser?.email,
        status: 'ACCEPTED',
        updatedAt: serverTimestamp()
      });
      setShowAssignModal(false);
      setSelectedSession(null);
      setSelectedTutor("");
      invalidateOnDataChange("writing_center_sessions", "assign");
    } catch (err) {
    }
  };

  const openAssignModal = (session) => {
    setSelectedSession(session);
    setShowAssignModal(true);
  };

  const openMiniLessonModal = () => {
    setMiniLessonTitle('');
    setMiniLessonDate(new Date().toISOString().slice(0, 10));
    setMiniLessonTutorId('');
    setMiniLessonError('');
    setShowMiniLessonModal(true);
  };

  const handleAssignMiniLesson = async (e) => {
    e.preventDefault();
    if (!firestore || miniLessonSaving) return;

    const title = miniLessonTitle.trim();
    if (!title) {
      setMiniLessonError('Enter a mini lesson title.');
      return;
    }
    if (!miniLessonDate) {
      setMiniLessonError('Select a date.');
      return;
    }
    if (!miniLessonTutorId) {
      setMiniLessonError('Select a tutor.');
      return;
    }

    const tutorUser = users.find((u) => u.id === miniLessonTutorId);
    if (!tutorUser) {
      setMiniLessonError('Tutor not found.');
      return;
    }

    setMiniLessonSaving(true);
    setMiniLessonError('');

    try {
      assertClientRateLimit("miniLessonCreate", user?.uid);
      const lessonDate = miniLessonDateToDate(miniLessonDate);
      await addDoc(collection(firestore, 'sessions'), {
        studentId: MINI_LESSON_STUDENT_ID,
        studentName: MINI_LESSON_STUDENT_NAME,
        studentEmail: MINI_LESSON_STUDENT_EMAIL,
        subject: title.slice(0, 200),
        notes: '',
        sessionType: 'MINI_LESSON',
        status: 'COMPLETED',
        source: 'admin_mini_lesson',
        tutorId: miniLessonTutorId,
        tutorName: resolveDisplayName(tutorUser) || tutorUser.email,
        tutorEmail: tutorUser.email || '',
        createdAt: Timestamp.fromDate(lessonDate),
        updatedAt: serverTimestamp(),
        sessionEndTime: lessonDate.toISOString(),
      });
      setShowMiniLessonModal(false);
      await loadPastSessions();
      invalidateOnDataChange("writing_center_sessions", "mini_lesson");
    } catch (err) {
      setMiniLessonError(err.message || 'Failed to save mini lesson.');
    } finally {
      setMiniLessonSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredSessions = sortSessionsNewestFirst(
    sessions.filter((session) => {
      if (statusFilter !== "ALL" && session.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && session.sessionType !== typeFilter) return false;
      return true;
    })
  );

  const tutors = users.filter(
    (u) => hasWritingCenterTutorAccess(u) && resolveWritingCenterViewRole(u) === "TUTOR",
  );
  const simulateCandidates = useMemo(() => {
    const q = simulateSearch.trim().toLowerCase();
    const list = users.filter((u) => {
      const view = resolveWritingCenterViewRole(u);
      if (view === "ADMIN") return false;
      if (!q) return true;
      const name = resolveDisplayName(u).toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
    return list
      .sort((a, b) =>
        resolveDisplayName(a).localeCompare(resolveDisplayName(b), undefined, {
          sensitivity: "base",
        }),
      )
      .slice(0, 40);
  }, [users, simulateSearch]);

  const tutorSessions = useMemo(() => {
    let list =
      selectedTutorFilter === "ALL"
        ? sessions
        : sessions.filter((s) => s.tutorId === selectedTutorFilter);
    if (tutorReportFilter === "NO_REPORT") {
      list = list.filter(
        (s) => s.status === "COMPLETED" && !getSessionReportUrl(s),
      );
    }
    return sortSessionsNewestFirst(list);
  }, [sessions, selectedTutorFilter, tutorReportFilter]);

  const tabClass = (tab) =>
    `whitespace-nowrap py-2 px-3 rounded-md text-sm font-medium transition-colors ${
      activeTab === tab
        ? "bg-indigo-100 text-indigo-700"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <div className="w-full px-3 sm:px-4 lg:px-6 py-4">
      <header className="w-full flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8 mb-6 border-b border-gray-200 pb-4">
        <div className="min-w-0 shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">Writing Center - Admin Dashboard</h1>
          <nav className="mt-3 flex flex-wrap gap-1" aria-label="Admin sections">
            <button type="button" onClick={() => setActiveTab("sessions")} className={tabClass("sessions")}>
              Sessions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tutor-assignments")}
              className={tabClass("tutor-assignments")}
            >
              Tutor Assignments
            </button>
          </nav>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Simulate view
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveTab("simulate");
                if (!simulateUser) setSimulateSearch("");
              }}
              className={tabClass("simulate")}
            >
              {simulateUser
                ? resolveDisplayName(simulateUser)
                : "Choose person…"}
            </button>
          </div>
        </div>

        {activeTab === "sessions" && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm"
              aria-label="Filter by status"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm"
              aria-label="Filter by type"
            >
              <option value="ALL">All Types</option>
              <option value="IN_PERSON">In-Person</option>
              <option value="ASYNC">Async</option>
              <option value="MINI_LESSON">Mini lesson</option>
            </select>
          </div>
        )}
      </header>

      {activeTab === "sessions" ? (
        <div className="w-full">
          <div className="bg-white shadow rounded-lg mb-6 overflow-hidden w-full">
            <div className="flex flex-col sm:flex-row sm:divide-x divide-gray-200">
              <div className="flex-1 flex items-center justify-between gap-4 px-5 py-4 border-b sm:border-b-0 border-gray-200">
                <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.total}</p>
              </div>
              <div className="flex-1 flex items-center justify-between gap-4 px-5 py-4 border-b sm:border-b-0 border-gray-200">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600 tabular-nums">{stats.completed}</p>
              </div>
              <div className="flex-1 flex items-center justify-between gap-4 px-5 py-4 border-b sm:border-b-0 border-gray-200">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 tabular-nums">{stats.pending}</p>
              </div>
              <div className="flex-1 flex items-center justify-between gap-4 px-5 py-4">
                <p className="text-sm font-medium text-gray-500">Async Pending</p>
                <p className="text-2xl font-bold text-purple-600 tabular-nums">{stats.asyncPending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden w-full">
            <SessionRequestList
              sessions={filteredSessions}
              emptyMessage="No sessions found"
              showActions
              expandedSessionId={expandedSession}
              onToggleExpand={(id) => setExpandedSession(id)}
              isRowExpandable={(session) => !isMiniLessonSession(session)}
              renderExpanded={(session, formResponseUrl) => (
                <AdminSessionExpandedPanel session={session} formResponseUrl={formResponseUrl} />
              )}
            />
          </div>
        </div>
      ) : activeTab === "simulate" ? (
        <div className="w-full">
          {!simulateUser ? (
            <div className="max-w-xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Simulate a person’s view</h2>
              <p className="mt-1 text-sm text-gray-600">
                Search for a student, tutor, or teacher to see Writing Center exactly as they do.
              </p>
              <label htmlFor="simulate-search" className="sr-only">
                Search people
              </label>
              <input
                id="simulate-search"
                type="search"
                value={simulateSearch}
                onChange={(e) => setSimulateSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <ul className="mt-3 max-h-80 overflow-y-auto divide-y divide-gray-100 rounded-md border border-gray-200">
                {simulateCandidates.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-gray-500">
                    {users.length === 0 ? "Loading users…" : "No matches."}
                  </li>
                ) : (
                  simulateCandidates.map((person) => {
                    const view = resolveWritingCenterViewRole(person);
                    return (
                      <li key={person.id}>
                        <button
                          type="button"
                          onClick={() => setSimulateUser(person)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-indigo-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-gray-900">
                              {resolveDisplayName(person)}
                            </span>
                            <span className="block truncate text-xs text-gray-500">
                              {person.email || "—"}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {view === "TUTOR"
                              ? "Tutor"
                              : view === "TEACHER"
                                ? "Teacher"
                                : "Student"}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
              <button
                type="button"
                onClick={() => setActiveTab("sessions")}
                className="mt-4 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          ) : (
            (() => {
              const viewRole = resolveWritingCenterViewRole(simulateUser);
              return (
                <>
                  <WritingCenterPreviewBanner
                    role={simulateRoleLabel(viewRole)}
                    person={simulateUser}
                    onBack={() => {
                      setSimulateUser(null);
                      setActiveTab("sessions");
                    }}
                    onChangePerson={() => setSimulateUser(null)}
                  />
                  {viewRole === "TUTOR" ? (
                    <TutorDashboard preview asUser={simulateUser} />
                  ) : viewRole === "TEACHER" ? (
                    <TeacherDashboard asUser={simulateUser} />
                  ) : (
                    <StudentDashboard preview asUser={simulateUser} />
                  )}
                </>
              );
            })()
          )}
        </div>
      ) : activeTab === 'tutor-assignments' ? (
        <div className="w-full">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Filter by Tutor:</label>
              <select
                value={selectedTutorFilter}
                onChange={(e) => setSelectedTutorFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm"
                aria-label="Filter by tutor"
              >
                <option value="ALL">All Tutors</option>
                {tutors.map((tutor) => (
                  <option key={tutor.id} value={tutor.id}>
                    {resolveDisplayName(tutor) || tutor.email}
                  </option>
                ))}
              </select>
              <select
                value={tutorReportFilter}
                onChange={(e) => setTutorReportFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm"
                aria-label="Filter by report status"
              >
                <option value="ALL">All sessions</option>
                <option value="NO_REPORT">No report yet</option>
              </select>
            </div>
            <button
              type="button"
              onClick={openMiniLessonModal}
              className="shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Assign mini lesson
            </button>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md w-full">
            <table className="w-full min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Tutor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tutorSessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                      {tutorReportFilter === "NO_REPORT"
                        ? "No completed sessions missing a tutor report for this filter."
                        : "No sessions for this filter."}
                    </td>
                  </tr>
                ) : (
                tutorSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isMiniLessonSession(session) ? "—" : session.studentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {isMiniLessonSession(session) ? "Mini lesson" : session.sessionType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.tutorName || 'Unassigned'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {session.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => openAssignModal(session)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Assign Tutor
                        </button>
                      )}
                      {session.status === "COMPLETED" &&
                        (getSessionReportUrl(session) ? (
                          <SessionReportLink
                            session={session}
                            label="View summary (PDF)"
                          />
                        ) : (
                          <span className="text-gray-400">No report yet</span>
                        ))}
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {showMiniLessonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assign mini lesson</h3>
            <p className="text-sm text-gray-600 mb-4">
              Creates a completed session on the tutor&apos;s list for tracking (not tied to a
              student account).
            </p>
            {miniLessonError && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {miniLessonError}
              </div>
            )}
            <form onSubmit={handleAssignMiniLesson} className="space-y-4">
              <div>
                <label htmlFor="mini-lesson-title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  id="mini-lesson-title"
                  type="text"
                  required
                  value={miniLessonTitle}
                  onChange={(e) => setMiniLessonTitle(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="e.g. Narrative writing workshop"
                />
              </div>
              <div>
                <label htmlFor="mini-lesson-date" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  id="mini-lesson-date"
                  type="date"
                  required
                  value={miniLessonDate}
                  onChange={(e) => setMiniLessonDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label htmlFor="mini-lesson-tutor" className="block text-sm font-medium text-gray-700">
                  Tutor
                </label>
                <select
                  id="mini-lesson-tutor"
                  required
                  value={miniLessonTutorId}
                  onChange={(e) => setMiniLessonTutorId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  <option value="">Select a tutor</option>
                  {tutors.map((tutor) => (
                    <option key={tutor.id} value={tutor.id}>
                      {resolveDisplayName(tutor) || tutor.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMiniLessonModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={miniLessonSaving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {miniLessonSaving ? "Saving…" : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Tutor to Session</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Session: {selectedSession.subject} - {selectedSession.studentName}
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Tutor:</label>
              <select
                value={selectedTutor}
                onChange={(e) => setSelectedTutor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">-- Select a tutor --</option>
                {tutors.map(tutor => (
                  <option key={tutor.id} value={tutor.id}>
                    {tutor.displayName || tutor.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedSession(null);
                  setSelectedTutor('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSession}
                disabled={!selectedTutor}
                className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
