"use client";

import { formatSessionDate, sortSessionsNewestFirst } from "@/lib/firestoreDates";
import { getGoogleFormResponseUrl } from "@/lib/writingCenterForm";

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

const headerClass =
  "text-xs font-semibold text-gray-500 uppercase tracking-wide";

function buildGridTemplate({ showStudent, showTutor, showActionsCol }) {
  const cols = [];
  if (showStudent) cols.push("minmax(0, 1.15fr)");
  if (showTutor) cols.push("minmax(0, 0.95fr)");
  cols.push("5.75rem", "5.25rem", "minmax(7rem, auto)");
  if (showActionsCol) cols.push("minmax(5.5rem, auto)");
  return cols.join(" ");
}

const EMPTY_NUDGE = {
  student: { cell: "", header: "" },
  tutor: { cell: "", header: "" },
  status: { cell: "", header: "" },
  type: { cell: "", header: "" },
  dateTime: { cell: "", header: "" },
  actions: { cell: "", header: "" },
};

/**
 * Manual horizontal nudge — only used when both Student + Tutor columns show (admin).
 * Student/tutor-only layouts use EMPTY_NUDGE so columns stay aligned.
 */
const COLUMN_NUDGE_ADMIN = {
  student: { cell: "", header: "" },
  tutor: { cell: "-ml-[150px]", header: "-ml-[160px]" },
  status: { cell: "-ml-[300px]", header: "-ml-[330px]" },
  type: { cell: "ml-[-180px]", header: "ml-[-200px]" },
  dateTime: { cell: "", header: "" },
  actions: { cell: "", header: "" },
};

function resolveColumnNudge(showStudent, showTutor) {
  return showStudent && showTutor ? COLUMN_NUDGE_ADMIN : EMPTY_NUDGE;
}

function tutorDisplayName(session) {
  const name = session.tutorName?.trim();
  return name || "not assigned";
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

  const gridStyle = {
    gridTemplateColumns: buildGridTemplate({ showStudent, showTutor, showActionsCol }),
  };
  const nudge = resolveColumnNudge(showStudent, showTutor);
  const cellNudge = (column) => nudge[column]?.cell ?? "";
  const headerNudge = (column) => nudge[column]?.header ?? "";

  return (
    <>
      <div
        className="grid w-full items-center gap-x-4 px-3 py-2 bg-gray-50 border-b border-gray-200"
        style={gridStyle}
      >
        {showStudent && (
          <span className={`${headerClass} ${headerNudge("student")}`}>Student</span>
        )}
        {showTutor && (
          <span className={`${headerClass} ${headerNudge("tutor")}`}>Tutor</span>
        )}
        <span className={`${headerClass} ${headerNudge("status")}`}>Status</span>
        <span className={`${headerClass} ${headerNudge("type")}`}>Type</span>
        <span className={`${headerClass} ${headerNudge("dateTime")}`}>Date/time</span>
        {showActionsCol && (
          <span
            className={`${headerClass} text-right justify-self-end ${headerNudge("actions")}`}
          >
            {hasActions ? "Actions" : ""}
          </span>
        )}
      </div>
      <ul className="divide-y divide-gray-200">
        {sortedSessions.map((session) => {
          const formResponseUrl = getGoogleFormResponseUrl(session);
          const rowExpandable =
            canExpand && (isRowExpandable ? isRowExpandable(session) : true);
          const isExpanded = rowExpandable && expandedSessionId === session.id;

          const rowGrid = (
            <div className="grid w-full items-center gap-x-4" style={gridStyle}>
              {showStudent && (
                <div className={`min-w-0 ${cellNudge("student")}`}>
                  <span className="text-sm text-gray-900 truncate block">
                    {session.studentName || "—"}
                  </span>
                </div>
              )}
              {showTutor && (
                <div className={`min-w-0 ${cellNudge("tutor")}`}>
                  <span className="text-sm text-gray-600 truncate block">
                    {tutorDisplayName(session)}
                  </span>
                </div>
              )}
              <div className={cellNudge("status")}>
                <span
                  className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(session.status)}`}
                >
                  {session.status}
                </span>
              </div>
              <div className={cellNudge("type")}>
                <span
                  className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${getSessionTypeColor(session.sessionType)}`}
                >
                  {formatSessionTypeLabel(session.sessionType)}
                </span>
              </div>
              <div className={`min-w-0 ${cellNudge("dateTime")}`}>
                <span className="text-sm text-gray-500 truncate block tabular-nums">
                  {formatSessionDate(session.createdAt)}
                </span>
              </div>
              {showActionsCol && (
                <div
                  className={`flex items-center justify-end gap-2 ${cellNudge("actions")}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderActions?.(session)}
                  {rowExpandable && (
                    <svg
                      className={`w-5 h-5 shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                  )}
                </div>
              )}
            </div>
          );

          return (
            <li key={session.id} className="w-full">
              {rowExpandable ? (
                <button
                  type="button"
                  onClick={() => onToggleExpand(isExpanded ? null : session.id)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  {rowGrid}
                </button>
              ) : (
                <div className="w-full px-3 py-2 hover:bg-gray-50/50">{rowGrid}</div>
              )}
              {isExpanded && rowExpandable && renderExpanded && (
                <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 w-full">
                  <div className="space-y-2 text-sm text-gray-600">
                    {renderExpanded(session, formResponseUrl)}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
