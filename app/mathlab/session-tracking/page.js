"use client";
import { useAuth } from "@/utils/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import DashboardTopBar from "@/components/layout/DashboardTopBar";
import MathLabSidebar from "@/components/mathlab/MathLabSidebar";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { firestore } from "@/firebase";
import { MathLabCache } from "@/utils/cache";
import { hydrateCompletedSession, formatClockDuration } from "@/lib/firestoreDates";
import { isAdminUser } from "@/utils/authorization";
import MathLabLoginPrompt from "@/components/mathlab/MathLabLoginPrompt";

function SessionTrackingPageContent() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = userData && user && isAdminUser(userData.role, user.email);

  useEffect(() => {
    if (!loading && userData && !isAdmin) {
      router.push("/mathlab");
    }
  }, [loading, userData, isAdmin, router]);

  const fetchSessions = useCallback(
    async (forceRefresh = false) => {
      if (!isAdmin) return;
      setIsLoading(true);
      setError(null);

      try {
        if (!forceRefresh) {
          const cachedSessions = MathLabCache.getSessionTracking();
          if (cachedSessions?.length) {
            setSessions(cachedSessions.map(hydrateCompletedSession));
            setIsLoading(false);
            return;
          }
        }

        const sessionsQuery = query(
          collection(firestore, "completedSessions"),
          orderBy("completedAt", "desc"),
        );

        const snapshot = await getDocs(sessionsQuery);
        const allSessions = snapshot.docs.map((docSnap) =>
          hydrateCompletedSession({ id: docSnap.id, ...docSnap.data() }),
        );

        allSessions.sort((a, b) => b.completedAt - a.completedAt);
        const deduped = allSessions.filter((session, index, list) => {
          const t = session.completedAt?.getTime?.() ?? 0;
          return !list.slice(0, index).some((earlier) => {
            const et = earlier.completedAt?.getTime?.() ?? 0;
            return (
              earlier.tutorId === session.tutorId &&
              earlier.studentId === session.studentId &&
              earlier.course === session.course &&
              earlier.duration === session.duration &&
              Math.abs(et - t) < 120_000
            );
          });
        });
        MathLabCache.setSessionTracking(deduped);
        setSessions(deduped);
      } catch (err) {
        if (err.code === "failed-precondition" || err.message?.includes("index")) {
          setSessions([]);
          setError(null);
        } else {
          setError("Failed to load sessions. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isAdmin],
  );

  useEffect(() => {
    if (isAdmin) fetchSessions();
  }, [fetchSessions, isAdmin]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase().trim();
    return sessions.filter((session) => {
      const tutorName = (session.tutorName || "").toLowerCase();
      const studentName = (session.studentName || "").toLowerCase();
      const course = (session.course || "").toLowerCase();
      return tutorName.includes(q) || studentName.includes(q) || course.includes(q);
    });
  }, [sessions, searchQuery]);

  if (!loading && !user) {
    return (
      <MathLabLoginPrompt
        redirectTo="/mathlab/session-tracking"
        title="Sign in to view session tracking"
        description="Session tracking is available to admins after you log in."
      />
    );
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardTopBar title="Session Tracking" />
        <MathLabSidebar />
        <div className="flex-1 flex items-center justify-center ml-0 md:ml-16">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar title="Session Tracking" />
      <Suspense fallback={null}>
        <MathLabSidebar />
      </Suspense>

      <div className="flex-1 px-6 py-4 ml-0 md:ml-16 pb-16 md:pb-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-6">Session Tracking</h1>

          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by tutor name, student name, or course..."
                className="w-full py-3 pl-11 pr-4 text-sm text-foreground bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing {filteredSessions.length} of {sessions.length} sessions
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          {filteredSessions.length === 0 ? (
            <div className="card-elevated p-8 rounded-xl text-center">
              <p className="text-muted-foreground">
                {searchQuery ? "No sessions found matching your search." : "No sessions found."}
              </p>
            </div>
          ) : (
            <div className="card-elevated rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                        Date & Time
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Tutor</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Course</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((session) => (
                      <tr
                        key={session.id}
                        className="border-t border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div>
                            <div className="font-medium">
                              {session.completedAt.toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {session.completedAt.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div>
                            <div className="font-medium">{session.tutorName || "Unknown"}</div>
                            {session.tutorEmail && (
                              <div className="text-muted-foreground text-xs">{session.tutorEmail}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div>
                            <div className="font-medium">{session.studentName || "Unknown"}</div>
                            {session.studentEmail && (
                              <div className="text-muted-foreground text-xs">{session.studentEmail}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {session.course || "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {formatClockDuration(session.duration || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SessionTrackingPage() {
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
      <SessionTrackingPageContent />
    </Suspense>
  );
}
