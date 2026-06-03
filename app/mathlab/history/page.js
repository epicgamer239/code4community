"use client";
import { useAuth } from "@/utils/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import DashboardTopBar from "@/components/DashboardTopBar";
import MathLabSidebar from "@/components/MathLabSidebar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { firestore } from "@/firebase";
import { MathLabCache } from "@/utils/cache";
import {
  hydrateCompletedSession,
  formatIntervalDuration,
} from "@/lib/firestoreDates";
import { isAdminUser } from "@/utils/authorization";
import MathLabLoginPrompt from "@/components/MathLabLoginPrompt";

function MathLabHistoryPageContent() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  const displayUser = userData;
  const userId = user?.uid;
  const userRole = userData?.mathLabRole || "student";

  const fetchSessionHistory = useCallback(async (forceRefresh = false) => {
    if (!userId || !userData) return;

    setIsLoading(true);
    setError(null);

    if (forceRefresh) {
      MathLabCache.setSessions([]);
    }

    try {
      if (!forceRefresh) {
        const cachedHistory = MathLabCache.getSessions();
        if (cachedHistory?.length > 0) {
          setSessionHistory(cachedHistory.map(hydrateCompletedSession));
          setIsLoading(false);
          return;
        }
      }

      const sessionsQuery = query(
        collection(firestore, "completedSessions"),
        where(userRole === "student" ? "studentId" : "tutorId", "==", userId),
        limit(50),
      );

      const snapshot = await getDocs(sessionsQuery);
      const sessions = snapshot.docs.map((docSnap) =>
        hydrateCompletedSession({ id: docSnap.id, ...docSnap.data() }),
      );

      sessions.sort((a, b) => b.completedAt - a.completedAt);
      MathLabCache.setSessions(sessions);
      setSessionHistory(sessions);
    } catch (err) {
      if (err.code === "failed-precondition" || err.message?.includes("index")) {
        setSessionHistory([]);
        setError(null);
      } else {
        setError("Failed to load session history. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, userData, userRole]);

  useEffect(() => {
    if (userData) fetchSessionHistory();
  }, [fetchSessionHistory, userData]);

  useEffect(() => {
    const isTutor = displayUser?.mathLabRole === "tutor";
    const isAdmin = userData && user && isAdminUser(userData.role, user.email);
    if (!isTutor && !isAdmin && filter === "tutor") {
      setFilter("all");
    }
  }, [userData, displayUser?.mathLabRole, filter, user]);

  const filteredSessions = useMemo(() => {
    if (filter === "all") return sessionHistory;
    return sessionHistory.filter((session) => {
      if (filter === "student") return session.studentId === userId;
      if (filter === "tutor") return session.tutorId === userId;
      return true;
    });
  }, [sessionHistory, filter, userId]);

  if (!user) {
    return (
      <MathLabLoginPrompt
        redirectTo="/mathlab/history"
        title="Sign in to view session history"
        description="Your past tutoring sessions appear here after you log in with your school account."
      />
    );
  }

  if (!displayUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const isTutor = displayUser.mathLabRole === "tutor";
  const isAdmin = userData && user && isAdminUser(userData.role, user.email);
  const filterOptions = [
    { id: "all", label: "All Sessions" },
    { id: "student", label: "As Student" },
  ];
  if (isTutor || isAdmin) {
    filterOptions.push({ id: "tutor", label: "As Tutor" });
  }

  return (
    <div className="min-h-screen bg-background " style={{ overscrollBehavior: "none" }}>
      <DashboardTopBar title="Math Lab History" />
      <Suspense fallback={null}>
        <MathLabSidebar />
      </Suspense>

      <div className="ml-0 md:ml-16 pb-16 md:pb-0">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Session History</h1>
              <p className="text-muted-foreground">
                View your past tutoring sessions and activity
              </p>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <div className="flex space-x-1 bg-muted/30 p-1 rounded-lg w-fit">
                {filterOptions.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      filter === tab.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-destructive text-lg mb-2">{error}</div>
                <button onClick={() => fetchSessionHistory(true)} className="btn-primary">
                  Try Again
                </button>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold text-foreground mb-2">No Session History</h4>
                  <p className="text-muted-foreground mb-4">
                    {filter === "all"
                      ? "You haven't completed any tutoring sessions yet."
                      : `You haven't completed any sessions ${filter === "student" ? "as a student" : "as a tutor"} yet.`}
                  </p>
                  <button
                    onClick={() => router.push("/mathlab")}
                    className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Start your first session
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSessions.map((session) => (
                  <div key={session.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{session.course}</h3>
                          <p className="text-sm text-muted-foreground">
                            {session.studentName} {session.tutorName && `• ${session.tutorName}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">
                          {formatIntervalDuration(session.startTime, session.endTime)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {session.completedAt.toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {session.completedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Completed
                        </span>
                      </div>
                      <div className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Success
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MathLabHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <MathLabHistoryPageContent />
    </Suspense>
  );
}
