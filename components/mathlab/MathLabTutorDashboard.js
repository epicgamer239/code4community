"use client";

import { useEffect, useState } from "react";
import { RequestCardSkeleton } from "@/components/common/SkeletonLoader";
import MathLabAdminActiveSessions from "@/components/mathlab/MathLabAdminActiveSessions";
import ProfileImage from "@/components/mathlab/ProfileImage";
import { formatRequestDateTime } from "@/lib/firestoreDates";
import {
  canStartScheduledSession,
  formatScheduleLabel,
} from "@/lib/mathlab/scheduledRequests";

export default function MathLabTutorDashboard({
  livePendingRequests,
  scheduledPendingRequests,
  myUpcomingScheduled,
  isLoadingRequests,
  activeSessions,
  isLoadingActiveSessions,
  isAdmin,
  activeSession,
  acceptingRequestId,
  onAcceptRequest,
  onOpenUpcomingScheduled,
}) {
  const [tutorQueueTab, setTutorQueueTab] = useState("live");
  const [scheduleClock, setScheduleClock] = useState(() => Date.now());

  useEffect(() => {
    if (myUpcomingScheduled.length === 0) return undefined;
    const id = setInterval(() => setScheduleClock(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [myUpcomingScheduled.length]);

  return (
    <div className="max-w-7xl w-full mx-4">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-foreground mb-4">Tutor Dashboard</h2>
        <div className="inline-flex space-x-1 bg-muted/30 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setTutorQueueTab("live")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              tutorQueueTab === "live"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Live requests
            {livePendingRequests.length > 0 ? ` (${livePendingRequests.length})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setTutorQueueTab("scheduled")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              tutorQueueTab === "scheduled"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Scheduled requests
            {scheduledPendingRequests.length > 0
              ? ` (${scheduledPendingRequests.length})`
              : ""}
          </button>
        </div>
      </div>

      {tutorQueueTab === "scheduled" && myUpcomingScheduled.length > 0 && (
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-foreground mb-4">Your Upcoming Sessions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myUpcomingScheduled.map((session) => {
              const startAllowed = canStartScheduledSession(
                session,
                new Date(scheduleClock),
              );
              const startDisabled = Boolean(activeSession) || !startAllowed;
              return (
                <div
                  key={session.id}
                  className="bg-white border-2 border-primary/40 rounded-2xl p-6 shadow-lg"
                >
                  <h4 className="font-semibold text-gray-900 text-lg truncate mb-1">
                    {session.studentName}
                  </h4>
                  <p className="text-sm text-primary font-medium mb-2">
                    {formatScheduleLabel(session)}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">{session.course}</p>
                  <button
                    type="button"
                    disabled={startDisabled}
                    onClick={() => onOpenUpcomingScheduled(session)}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-xl disabled:bg-gray-300 disabled:text-gray-600 disabled:hover:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {startAllowed ? "Start when ready" : "Available 15 min before"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tutorQueueTab === "live" ? (
        <div className="mb-8">
          {isLoadingRequests ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <RequestCardSkeleton />
              <RequestCardSkeleton />
            </div>
          ) : livePendingRequests.length === 0 ? (
            <div className="text-center py-10 bg-muted/30 rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground">No live requests right now</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {livePendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white border-2 border-gray-400 rounded-2xl p-6 shadow-2xl shadow-gray-400/80 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <ProfileImage
                      src={request.studentPhotoURL}
                      alt={request.studentName}
                      name={request.studentName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-800"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-lg truncate">
                        {request.studentName}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">Student</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                      {request.course}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 mb-6">
                    <span>Requested {formatRequestDateTime(request.createdAt)}</span>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(acceptingRequestId) || Boolean(activeSession)}
                    onClick={() =>
                      onAcceptRequest(request.id, request.studentId, request.course)
                    }
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-xl disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {acceptingRequestId === request.id ? "Accepting…" : "Accept Request"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-8">
          {isLoadingRequests ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <RequestCardSkeleton />
            </div>
          ) : scheduledPendingRequests.length === 0 ? (
            <div className="text-center py-10 bg-muted/30 rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground">No scheduled requests</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scheduledPendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white border-2 border-gray-400 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <ProfileImage
                      src={request.studentPhotoURL}
                      alt={request.studentName}
                      name={request.studentName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-lg truncate">
                        {request.studentName}
                      </h4>
                      <p className="text-sm text-primary font-medium truncate">
                        {formatScheduleLabel(request)}
                      </p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                      {request.course}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 mb-6">
                    <span>Posted {formatRequestDateTime(request.createdAt)}</span>
                  </div>
                  <button
                    type="button"
                    disabled={
                      Boolean(acceptingRequestId) ||
                      Boolean(activeSession) ||
                      myUpcomingScheduled.length > 0
                    }
                    onClick={() =>
                      onAcceptRequest(request.id, request.studentId, request.course)
                    }
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-xl disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {acceptingRequestId === request.id ? "Accepting…" : "Accept Scheduled"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <MathLabAdminActiveSessions
          activeSessions={activeSessions}
          isLoadingActiveSessions={isLoadingActiveSessions}
        />
      )}
    </div>
  );
}
