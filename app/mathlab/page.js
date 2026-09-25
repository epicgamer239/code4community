"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/utils/AuthContext";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import MathLabPageShell from "@/components/mathlab/MathLabPageShell";
import MathLabSessionComplete from "@/components/mathlab/MathLabSessionComplete";
import MathLabTutorBlocked from "@/components/mathlab/MathLabTutorBlocked";
import MathLabStudentSessionView from "@/components/mathlab/MathLabStudentSessionView";
import MathLabTutorActiveSession from "@/components/mathlab/MathLabTutorActiveSession";
import MathLabTutorDashboard from "@/components/mathlab/MathLabTutorDashboard";
import MathLabStudentDashboard from "@/components/mathlab/MathLabStudentDashboard";
import { useMathLabDisplayUser } from "@/lib/mathlab/useDisplayUser";
import { useMathLabQueue } from "@/lib/mathlab/useMathLabQueue";
import { useMathLabSession } from "@/lib/mathlab/useMathLabSession";
import { isMathLabAdminUser } from "@/lib/auth/productAdmins";
import { isTutorOrHigher } from "@/utils/authorization";

function MathLabPageContent() {
  const { user, userData, loading } = useAuth();
  const isGuest = !user;
  const searchParams = useSearchParams();
  const displayUser = useMathLabDisplayUser(user, userData);

  const isTutor = useMemo(
    () =>
      isTutorOrHigher(displayUser?.role, displayUser?.mathLabRole) ||
      isMathLabAdminUser(displayUser, user?.email),
    [displayUser, user?.email],
  );

  const isAdmin = useMemo(
    () => Boolean(userData && user && isMathLabAdminUser(userData, user.email)),
    [userData, user],
  );

  const queue = useMathLabQueue(isTutor, displayUser);
  const session = useMathLabSession({
    user,
    userData,
    displayUser,
    isTutor,
    pendingRequests: queue.pendingRequests,
    setPendingRequests: queue.setPendingRequests,
    activeSessions: queue.activeSessions,
  });

  const isStudentViewRoute = searchParams?.get("view") === "student";
  const hasActiveStudentRequest =
    session.studentRequest &&
    (session.studentRequest.status === "pending" ||
      session.studentRequest.status === "accepted");
  const tutorDashboardBlocked =
    !isGuest && isTutor && !isStudentViewRoute && hasActiveStudentRequest;

  if (loading || (!isGuest && !displayUser)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (session.sessionStatus === "ended" && session.sessionEndData) {
    const isStudentView =
      displayUser?.mathLabRole === "student" ||
      (!displayUser?.mathLabRole && !isTutor);
    return (
      <MathLabSessionComplete
        sessionEndData={session.sessionEndData}
        isStudentView={isStudentView}
        onDismiss={session.handleDismissSession}
      />
    );
  }

  if (tutorDashboardBlocked) {
    return (
      <MathLabTutorBlocked
        studentRequest={session.studentRequest}
        onCancelRequest={session.handleCancelRequest}
      />
    );
  }

  if (hasActiveStudentRequest && (!isTutor || isStudentViewRoute)) {
    return (
      <MathLabStudentSessionView
        studentRequest={session.studentRequest}
        sessionStatus={session.sessionStatus}
        sessionDuration={session.sessionDuration}
        sessionStartTime={session.sessionStartTime}
        onCancelRequest={session.handleCancelRequest}
      />
    );
  }

  if (session.activeSession && isTutor) {
    return (
      <MathLabTutorActiveSession
        activeSession={session.activeSession}
        sessionStatus={session.sessionStatus}
        sessionDuration={session.sessionDuration}
        sessionStartTime={session.sessionStartTime}
        isEndingSession={session.isEndingSession}
        onStartSession={session.handleStartSession}
        onEndSession={session.handleEndSession}
      />
    );
  }

  const showTutorDashboard = !isGuest && isTutor && !isStudentViewRoute;

  return (
    <MathLabPageShell
      className="min-h-screen bg-background"
      contentClassName={`flex-1 flex justify-center ml-0 md:ml-16 pb-16 md:pb-8 ${
        showTutorDashboard ? "items-start pt-8 md:pt-10" : "items-center"
      }`}
    >
      {session.roleChangeMessage && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-6 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">{session.roleChangeMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center" style={{ minHeight: "calc(100vh - 80px)" }}>
        {showTutorDashboard ? (
          <MathLabTutorDashboard
            livePendingRequests={queue.livePendingRequests}
            scheduledPendingRequests={queue.scheduledPendingRequests}
            myUpcomingScheduled={queue.myUpcomingScheduled}
            isLoadingRequests={queue.isLoadingRequests}
            activeSessions={queue.activeSessions}
            isLoadingActiveSessions={queue.isLoadingActiveSessions}
            isAdmin={isAdmin}
            activeSession={session.activeSession}
            acceptingRequestId={session.acceptingRequestId}
            onAcceptRequest={session.handleAcceptRequest}
            onOpenUpcomingScheduled={session.handleOpenUpcomingScheduled}
          />
        ) : (
          <MathLabStudentDashboard
            selectedCourse={session.selectedCourse}
            onCourseSelect={session.setSelectedCourse}
            requestMode={session.requestMode}
            onRequestModeChange={session.setRequestMode}
            scheduledDate={session.scheduledDate}
            onScheduledDateChange={session.setScheduledDate}
            scheduledTime={session.scheduledTime}
            onScheduledTimeChange={session.setScheduledTime}
            isMatching={session.isMatching}
            onMatchMe={session.handleMatchMe}
          />
        )}
      </div>
    </MathLabPageShell>
  );
}

export default function MathLabPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <MathLabPageContent />
    </Suspense>
  );
}
