"use client";

import MathLabPageShell from "@/components/mathlab/MathLabPageShell";
import { formatRequestTime } from "@/lib/firestoreDates";
import { formatSessionTime } from "@/lib/mathlab/formatSessionTime";
import {
  formatScheduleLabel,
  isScheduledRequest,
} from "@/lib/mathlab/scheduledRequests";

export default function MathLabStudentSessionView({
  studentRequest,
  sessionStatus,
  sessionDuration,
  sessionStartTime,
  onCancelRequest,
}) {
  if (sessionStatus === "started") {
    return (
      <MathLabPageShell
        className="h-dvh max-h-dvh overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col"
        contentClassName="flex-1 min-h-0 flex items-center justify-center px-4 py-6 ml-0 md:ml-16 overflow-hidden"
      >
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
              <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Tutoring Session Active
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
              You are currently being tutored by {studentRequest.tutorName} in{" "}
              {studentRequest.course}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tutor</h3>
              <p className="text-primary font-medium">{studentRequest.tutorName}</p>
            </div>

            <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Course</h3>
              <p className="text-primary font-medium">{studentRequest.course}</p>
              <p className="text-sm text-gray-500 mt-1">Math Lab Session</p>
            </div>

            <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Duration</h3>
              <div className="text-3xl font-mono font-bold text-primary">
                {formatSessionTime(sessionDuration)}
              </div>
              <p className="text-sm text-gray-500 mt-1">Live Timer</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              Session started at{" "}
              {sessionStartTime?.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) || "Unknown time"}
            </p>
          </div>
        </div>
      </MathLabPageShell>
    );
  }

  return (
    <MathLabPageShell
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50"
      contentClassName="flex-1 flex items-center justify-center px-4 py-12 ml-0 md:ml-16 pb-16 md:pb-12"
    >
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="relative w-32 h-32 mb-6 mx-auto">
            <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-primary search-scan-animation"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ animation: "searchScan 3s ease-in-out infinite" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <style jsx>{`
              @keyframes searchScan {
                0% {
                  transform: translate(0, 0) scale(1);
                  opacity: 1;
                }
                25% {
                  transform: translate(8px, -6px) scale(1.05);
                  opacity: 0.9;
                }
                50% {
                  transform: translate(-6px, 8px) scale(1.1);
                  opacity: 0.95;
                }
                75% {
                  transform: translate(6px, 4px) scale(1.05);
                  opacity: 0.9;
                }
                100% {
                  transform: translate(0, 0) scale(1);
                  opacity: 1;
                }
              }
            `}</style>
          </div>

          {studentRequest.status === "pending" ? (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {isScheduledRequest(studentRequest)
                  ? "Looking for a Tutor"
                  : "Finding Your Tutor"}
              </h1>
              <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                {isScheduledRequest(studentRequest)
                  ? `We're matching you with a tutor for ${studentRequest.course} · ${formatScheduleLabel(studentRequest)}`
                  : `We're searching for the perfect tutor for ${studentRequest.course}`}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Tutor Found!</h1>
              <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                {isScheduledRequest(studentRequest)
                  ? `${studentRequest.tutorName} accepted your ${formatScheduleLabel(studentRequest)} request for ${studentRequest.course}`
                  : `${studentRequest.tutorName} will be tutoring you in ${studentRequest.course}`}
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border-2 border-primary/20 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Course</h3>
              <p className="text-primary font-medium">{studentRequest.course}</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                {studentRequest.status === "pending" ? (
                  <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
              <p
                className={`font-medium ${
                  studentRequest.status === "pending"
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}
              >
                {studentRequest.status === "pending" ? "Searching..." : "Matched!"}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              {isScheduledRequest(studentRequest) && (
                <p className="text-sm font-medium text-primary mb-2">
                  {formatScheduleLabel(studentRequest)}
                </p>
              )}
              <p className="text-sm text-gray-500">
                Request submitted at {formatRequestTime(studentRequest.createdAt)}
              </p>
              {studentRequest.status === "accepted" && (
                <p className="text-sm text-gray-500 mt-1">
                  Accepted at {formatRequestTime(studentRequest.acceptedAt)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          {studentRequest.status === "pending" && (
            <button
              type="button"
              onClick={onCancelRequest}
              className="px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-gray-500/25 hover:shadow-xl hover:shadow-gray-500/30"
            >
              <div className="flex items-center justify-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Request
              </div>
            </button>
          )}

          {studentRequest.status === "accepted" && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-lg font-semibold text-green-800">
                  Tutoring Session Ready!
                </span>
              </div>
              <p className="text-green-700 text-center">
                {isScheduledRequest(studentRequest)
                  ? `Your tutor ${studentRequest.tutorName} accepted. Meet them ${formatScheduleLabel(studentRequest)}.`
                  : `Your tutor ${studentRequest.tutorName} is ready to begin. They will start the session shortly.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </MathLabPageShell>
  );
}
