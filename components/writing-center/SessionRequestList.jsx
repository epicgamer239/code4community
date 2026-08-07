"use client";

import { Fragment } from "react";
import { formatSessionDate, sortSessionsNewestFirst } from "@/lib/firestoreDates";
import { getGoogleFormResponseUrl } from "@/lib/writing-center/form";

function getStatusColor(status) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "ACCEPTED":
      return "bg-blue-100 text-blue-800";
    case "IN_PROGRESS":
      return "bg-purple-100 text-purple-800";
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getSessionTypeColor(sessionType) {
  switch (sessionType) {
    case "ASYNC":
      return "bg-purple-100 text-purple-800";
    case "IN_PERSON":
      return "bg-teal-100 text-teal-800";
    case "MINI_LESSON":
      return "bg-indigo-100 text-indigo-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function formatSessionTypeLabel(sessionType) {
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

function tutorDisplayName(session) {
  const name = session.tutorName?.trim();
  return name || "Not assigned";
}

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(status)}`}
    >
      {status}
    </span>
  );
}

function TypePill({ sessionType }) {
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${getSessionTypeColor(sessionType)}`}
    >
      {formatSessionTypeLabel(sessionType)}
    </span>
  );
}

export function SessionRequestList({
  sessions,
  emptyMessage = "No sessions found",
  showStudent = true,
  showTutor = true,
  renderActions,
  expandedSessionId,
  onToggleExpand,
  renderExpanded,
  /** When set, only matching rows show the expand chevron / panel. */
  isRowExpandable,
}) {
  const hasActions = Boolean(renderActions);
  const canExpand = Boolean(onToggleExpand && renderExpanded);
  const showActionsCol = hasActions || canExpand;
  const sortedSessions = sortSessionsNewestFirst(sessions);

  if (sortedSessions.length === 0) {
    return <div className="p-8 text-center text-gray-500">{emptyMessage}</div>;
  }

  const colCount =
    (showStudent ? 1 : 0) +
    (showTutor ? 1 : 0) +
    3 +
    (showActionsCol ? 1 : 0);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[36rem] table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {showStudent && (
              <th className="px-3 py-2.5 font-semibold w-[18%]">Student</th>
            )}
            {showTutor && (
              <th className="px-3 py-2.5 font-semibold w-[18%]">Tutor</th>
            )}
            <th className="px-3 py-2.5 font-semibold w-[7.5rem]">Status</th>
            <th className="px-3 py-2.5 font-semibold w-[7rem]">Type</th>
            <th className="px-3 py-2.5 font-semibold w-[11rem]">Date/time</th>
            {showActionsCol && (
              <th className="px-3 py-2.5 font-semibold text-right w-[12rem]">
                {hasActions ? "Actions" : ""}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedSessions.map((session) => {
            const formResponseUrl = getGoogleFormResponseUrl(session);
            const rowExpandable =
              canExpand && (isRowExpandable ? isRowExpandable(session) : true);
            const isExpanded = rowExpandable && expandedSessionId === session.id;

            return (
              <Fragment key={session.id}>
                <tr className="align-middle hover:bg-gray-50/80">
                  {showStudent && (
                    <td className="px-3 py-2.5 text-sm text-gray-900 truncate">
                      {session.studentName || "—"}
                    </td>
                  )}
                  {showTutor && (
                    <td className="px-3 py-2.5 text-sm text-gray-600 truncate">
                      {tutorDisplayName(session)}
                    </td>
                  )}
                  <td className="px-3 py-2.5">
                    <StatusPill status={session.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <TypePill sessionType={session.sessionType} />
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-500 tabular-nums whitespace-nowrap">
                    {formatSessionDate(session.createdAt)}
                  </td>
                  {showActionsCol && (
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center justify-end gap-2 max-w-full">
                        {renderActions?.(session)}
                        {rowExpandable && (
                          <button
                            type="button"
                            onClick={() =>
                              onToggleExpand(isExpanded ? null : session.id)
                            }
                            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? "Collapse row" : "Expand row"}
                          >
                            <svg
                              className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
                {isExpanded && rowExpandable && renderExpanded && (
                  <tr className="bg-gray-50">
                    <td
                      colSpan={colCount}
                      className="px-3 py-3 border-t border-gray-200"
                    >
                      <div className="space-y-2 text-sm text-gray-600">
                        {renderExpanded(session, formResponseUrl)}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
