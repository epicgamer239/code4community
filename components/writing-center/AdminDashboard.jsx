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
  formatMiniLessonTutors,
  miniLessonIncludesTutor,
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
import { sortSessionsNewestFirst, formatSessionDateOnly } from "@/lib/firestoreDates";
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
  const [miniLessonTutorFilter, setMiniLessonTutorFilter] = useState('ALL');
  const [tutorReportFilter, setTutorReportFilter] = useState('ALL');
  const [showMiniLessonModal, setShowMiniLessonModal] = useState(false);
  const [miniLessonTitle, setMiniLessonTitle] = useState('');
  const [miniLessonDate, setMiniLessonDate] = useState('');
  const [miniLessonTutorIds, setMiniLessonTutorIds] = useState([]);
  const [miniLessonTeacherId, setMiniLessonTeacherId] = useState('');
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
    const regular = allSessions.filter((s) => !isMiniLessonSession(s));
    setStats({
      total: regular.length,
      completed: regular.filter((s) => s.status === "COMPLETED").length,
      pending: regular.filter((s) => s.status === "PENDING").length,
      asyncPending: regular.filter(
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
    setMiniLessonTutorIds([]);
    setMiniLessonTeacherId('');
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
    if (miniLessonTutorIds.length === 0) {
      setMiniLessonError('Select at least one tutor.');
      return;
    }
    if (!miniLessonTeacherId) {
      setMiniLessonError('Select an overseeing teacher.');
      return;
    }

    const selectedTutors = tutors.filter((t) => miniLessonTutorIds.includes(t.id));
    if (selectedTutors.length !== miniLessonTutorIds.length) {
      setMiniLessonError('One or more tutors could not be found.');
      return;
    }
    const teacherUser = users.find((u) => u.id === miniLessonTeacherId);
    if (!teacherUser) {
      setMiniLessonError('Teacher not found.');
      return;
    }

    setMiniLessonSaving(true);
    setMiniLessonError('');

    try {
      assertClientRateLimit("miniLessonCreate", user?.uid);
      const lessonDate = miniLessonDateToDate(miniLessonDate);
      const assignedTutors = selectedTutors.map((tutor) => ({
        id: tutor.id,
        name: resolveDisplayName(tutor) || tutor.email,
        email: tutor.email || "",
      }));
      const tutorIds = assignedTutors.map((t) => t.id);
      const primaryTutor = assignedTutors[0];

      await addDoc(collection(firestore, 'sessions'), {
        studentId: MINI_LESSON_STUDENT_ID,
        studentName: MINI_LESSON_STUDENT_NAME,
        studentEmail: MINI_LESSON_STUDENT_EMAIL,
        subject: title.slice(0, 200),
        notes: '',
        sessionType: 'MINI_LESSON',
        status: 'COMPLETED',
        source: 'admin_mini_lesson',
        tutorId: primaryTutor.id,
        tutorName: assignedTutors.map((t) => t.name).join(", "),
        tutorEmail: primaryTutor.email,
        tutorIds,
        assignedTutors,
        teacherId: miniLessonTeacherId,
        teacherName: resolveDisplayName(teacherUser) || teacherUser.email,
        teacherEmail: teacherUser.email || '',
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

  const filteredSessions = sortSessionsNewestFirst(
    sessions.filter((session) => {
      if (isMiniLessonSession(session)) return false;
      if (statusFilter !== "ALL" && session.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && session.sessionType !== typeFilter) return false;
      return true;
    })
  );

  const tutors = users.filter(
    (u) => hasWritingCenterTutorAccess(u) && resolveWritingCenterViewRole(u) === "TUTOR",
  );
  const teachers = users.filter(
    (u) => resolveWritingCenterViewRole(u) === "TEACHER",
  );
  const simulateCandidateGroups = useMemo(() => {
    const q = simulateSearch.trim().toLowerCase();
    const byRole = {
      TUTOR: [],
      TEACHER: [],
      STUDENT: [],
    };

    for (const user of users) {
      const view = resolveWritingCenterViewRole(user);
      if (view === "ADMIN") continue;
      if (q) {
        const name = resolveDisplayName(user).toLowerCase();
        const email = (user.email || "").toLowerCase();
        if (!name.includes(q) && !email.includes(q)) continue;
      }
      byRole[view]?.push(user);
    }

    const sortPeople = (list) =>
      list.sort((a, b) =>
        resolveDisplayName(a).localeCompare(resolveDisplayName(b), undefined, {
          sensitivity: "base",
        }),
      );

    return [
      { role: "TUTOR", label: "Tutors", people: sortPeople(byRole.TUTOR) },
      { role: "TEACHER", label: "Teachers", people: sortPeople(byRole.TEACHER) },
      { role: "STUDENT", label: "Students", people: sortPeople(byRole.STUDENT) },
    ].filter((group) => group.people.length > 0);
  }, [users, simulateSearch]);

  const tutorSessions = useMemo(() => {
    let list =
      selectedTutorFilter === "ALL"
        ? sessions
        : sessions.filter((s) => s.tutorId === selectedTutorFilter);
    list = list.filter((s) => s.status !== "CANCELLED" && !isMiniLessonSession(s));
    if (tutorReportFilter === "NO_REPORT") {
      list = list.filter(
        (s) => s.status === "COMPLETED" && !getSessionReportUrl(s),
      );
    }
    return sortSessionsNewestFirst(list);
  }, [sessions, selectedTutorFilter, tutorReportFilter]);

  const miniLessonSessions = useMemo(() => {
    let list = sessions.filter((s) => isMiniLessonSession(s));
    if (miniLessonTutorFilter !== "ALL") {
      list = list.filter((s) => miniLessonIncludesTutor(s, miniLessonTutorFilter));
    }
    return sortSessionsNewestFirst(list);
  }, [sessions, miniLessonTutorFilter]);

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
            <button
              type="button"
              onClick={() => setActiveTab("mini-lessons")}
              className={tabClass("mini-lessons")}
            >
              Mini Lessons
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
            </select>
          </div>
        )}
        {activeTab === "tutor-assignments" && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
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
        )}
        {activeTab === "mini-lessons" && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
            <select
              value={miniLessonTutorFilter}
              onChange={(e) => setMiniLessonTutorFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm"
              aria-label="Filter mini lessons by tutor"
            >
              <option value="ALL">All tutors</option>
              {tutors.map((tutor) => (
                <option key={tutor.id} value={tutor.id}>
                  {resolveDisplayName(tutor) || tutor.email}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={openMiniLessonModal}
              className="shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Assign mini lesson
            </button>
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
              <div className="mt-3 max-h-80 overflow-y-auto rounded-md border border-gray-200">
                {simulateCandidateGroups.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-gray-500">
                    {users.length === 0 ? "Loading users…" : "No matches."}
                  </p>
                ) : (
                  simulateCandidateGroups.map((group) => (
                    <section key={group.role}>
                      <h3 className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {group.label}
                        <span className="ml-1.5 font-normal normal-case tracking-normal text-gray-400">
                          ({group.people.length})
                        </span>
                      </h3>
                      <ul className="divide-y divide-gray-100">
                        {group.people.map((person) => (
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
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))
                )}
              </div>
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
      ) : activeTab === "mini-lessons" ? (
        <div className="w-full">
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden w-full">
            <SessionRequestList
              sessions={miniLessonSessions}
              emptyMessage="No mini lessons yet. Assign one to track tutor work."
              studentHeader="Title"
              formatStudent={(session) => session.subject || "Mini lesson"}
              tutorHeader="Tutors"
              formatTutor={(session) => formatMiniLessonTutors(session)}
              showOverseeingTeacher
              overseeingTeacherHeader="Overseeing teacher"
              showStatus={false}
              showType={false}
              dateHeader="Date"
              formatDate={(session) => formatSessionDateOnly(session.createdAt)}
              actionsHeader="Report"
              renderActions={(session) =>
                getSessionReportUrl(session) ? (
                  <SessionReportLink session={session} label="View summary (PDF)" />
                ) : (
                  <span className="text-gray-400 text-sm">No report yet</span>
                )
              }
            />
          </div>
        </div>
      ) : activeTab === "tutor-assignments" ? (
        <div className="w-full">
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden w-full">
            <SessionRequestList
              sessions={tutorSessions}
              emptyMessage={
                tutorReportFilter === "NO_REPORT"
                  ? "No completed sessions missing a tutor report for this filter."
                  : "No sessions for this filter."
              }
              renderActions={(session) => (
                <>
                  {session.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => openAssignModal(session)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                    >
                      Assign Tutor
                    </button>
                  )}
                  {session.status === "COMPLETED" &&
                    (getSessionReportUrl(session) ? (
                      <SessionReportLink session={session} label="View summary (PDF)" />
                    ) : (
                      <span className="text-gray-400 text-sm">No report yet</span>
                    ))}
                </>
              )}
            />
          </div>
        </div>
      ) : null}

      {showMiniLessonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assign mini lesson</h3>
            <p className="text-sm text-gray-600 mb-4">
              Creates a completed mini lesson for the tutor&apos;s record. The overseeing
              teacher uploads the tutor rating PDF — not the tutor.
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
                <fieldset>
                  <legend className="block text-sm font-medium text-gray-700 mb-2">
                    Tutors
                  </legend>
                  <div className="max-h-44 overflow-y-auto rounded-md border border-gray-300 p-2 space-y-1">
                    {tutors.length === 0 ? (
                      <p className="px-2 py-3 text-sm text-gray-500">No tutors available.</p>
                    ) : (
                      tutors.map((tutor) => {
                        const checked = miniLessonTutorIds.includes(tutor.id);
                        return (
                          <label
                            key={tutor.id}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setMiniLessonTutorIds((prev) =>
                                  e.target.checked
                                    ? [...prev, tutor.id]
                                    : prev.filter((id) => id !== tutor.id),
                                );
                              }}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-900">
                              {resolveDisplayName(tutor) || tutor.email}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Select one or more tutors.</p>
                </fieldset>
              </div>
              <div>
                <label htmlFor="mini-lesson-teacher" className="block text-sm font-medium text-gray-700">
                  Overseeing teacher
                </label>
                <select
                  id="mini-lesson-teacher"
                  required
                  value={miniLessonTeacherId}
                  onChange={(e) => setMiniLessonTeacherId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  <option value="">Select a teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {resolveDisplayName(teacher) || teacher.email}
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
