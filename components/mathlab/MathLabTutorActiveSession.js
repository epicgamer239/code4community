"use client";

import MathLabPageShell from "@/components/mathlab/MathLabPageShell";
import { formatSessionTime } from "@/lib/mathlab/formatSessionTime";
import {
  formatScheduleLabel,
  isScheduledRequest,
} from "@/lib/mathlab/scheduledRequests";

export default function MathLabTutorActiveSession({
  activeSession,
  sessionStatus,
  sessionDuration,
  sessionStartTime,
  isEndingSession,
  onStartSession,
  onEndSession,
}) {
  const isSessionStarted = sessionStatus === "started";

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
            {isSessionStarted ? "Tutoring Session Active" : "Session Ready to Start"}
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
            {isSessionStarted
              ? `You are currently tutoring ${activeSession.studentName} in ${activeSession.course}`
              : isScheduledRequest(activeSession)
                ? `Scheduled ${formatScheduleLabel(activeSession)} with ${activeSession.studentName} (${activeSession.course}). Start when you meet.`
                : `You have accepted ${activeSession.studentName}'s request for ${activeSession.course}. Ready to begin?`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Student</h3>
            <p className="text-primary font-medium">{activeSession.studentName}</p>
          </div>

          <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Course</h3>
            <p className="text-primary font-medium">{activeSession.course}</p>
            <p className="text-sm text-gray-500 mt-1">Math Lab Session</p>
          </div>

          <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isSessionStarted ? "Session Duration" : "Status"}
            </h3>
            {isSessionStarted ? (
              <>
                <div className="text-3xl font-mono font-bold text-primary">
                  {formatSessionTime(sessionDuration)}
                </div>
                <p className="text-sm text-gray-500 mt-1">Live Timer</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-yellow-600">Ready</div>
                <p className="text-sm text-gray-500 mt-1">Waiting to start</p>
              </>
            )}
          </div>
        </div>

        <div className="text-center">
          {isSessionStarted ? (
            <>
              <button
                type="button"
                onClick={onEndSession}
                disabled={isEndingSession}
                className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 disabled:opacity-60 disabled:pointer-events-none disabled:transform-none"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {isEndingSession ? "Ending…" : "End Session"}
                </div>
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Session started at{" "}
                {sessionStartTime?.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }) || "Unknown time"}
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onStartSession}
                className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Session
                </div>
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Click &quot;Start Session&quot; when you&apos;re ready to begin tutoring
              </p>
            </>
          )}
        </div>
      </div>
    </MathLabPageShell>
  );
}
