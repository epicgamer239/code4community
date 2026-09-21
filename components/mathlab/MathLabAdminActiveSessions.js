"use client";

import ActiveSessionTimer from "@/components/mathlab/ActiveSessionTimer";
import { isScheduledRequest, formatScheduleLabel } from "@/lib/mathlab/scheduledRequests";

export default function MathLabAdminActiveSessions({
  activeSessions,
  isLoadingActiveSessions,
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-foreground">Active Tutoring Sessions</h3>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Live updates</span>
        </div>
      </div>

      {isLoadingActiveSessions ? (
        <div className="card-elevated p-8 rounded-xl">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
          </div>
        </div>
      ) : activeSessions.length === 0 ? (
        <div className="card-elevated p-8 rounded-xl text-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-foreground mb-2">No Active Sessions</h4>
          <p className="text-muted-foreground">There are currently no active tutoring sessions</p>
        </div>
      ) : (
        <div className="card-elevated rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Tutor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Course</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Duration</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Started</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((session) => (
                  <tr key={session.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground">
                      <div className="font-medium">{session.tutorName}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      <div className="font-medium">{session.studentName}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      <div>{session.course}</div>
                      {isScheduledRequest(session) && (
                        <div className="text-xs font-normal text-muted-foreground mt-0.5">
                          {formatScheduleLabel(session)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {session.isStarted ? (
                        <ActiveSessionTimer startTime={session.sessionStartedAt} />
                      ) : (
                        <span className="text-muted-foreground">Not started</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {session.isStarted
                        ? session.sessionStartedAt.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : session.acceptedAt.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
