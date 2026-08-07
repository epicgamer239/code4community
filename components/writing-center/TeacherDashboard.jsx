"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import { firestore } from "@/firebase";
import { fetchReceiptSharesForTeacher } from "@/lib/writing-center/receiptShares";
import { formatSessionDate } from "@/lib/firestoreDates";
import { resolveDisplayName } from "@/lib/profile";

function formatType(sessionType) {
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

function matchesQuery(ticket, q) {
  if (!q) return true;
  const hay = [
    ticket.studentName,
    ticket.studentEmail,
    ticket.tutorName,
    ticket.subject,
    ticket.sessionType,
    ticket.teacherName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export default function TeacherDashboard({ asUser = null }) {
  const { user: authUser, userData } = useAuth();
  const asUserId = asUser?.uid || asUser?.id || null;
  const user = useMemo(() => {
    if (!asUserId) return authUser;
    return {
      uid: asUserId,
      displayName: asUser.displayName || null,
      email: asUser.email || "",
    };
  }, [asUserId, asUser?.displayName, asUser?.email, authUser]);
  const profile = asUser || userData;
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const loadTickets = useCallback(async () => {
    if (!firestore || !user?.uid) return;
    setLoading(true);
    setError("");
    try {
      const rows = await fetchReceiptSharesForTeacher(firestore, user.uid);
      rows.sort((a, b) => {
        const ta = a.sharedAt?.toDate?.() || a.sharedAt || 0;
        const tb = b.sharedAt?.toDate?.() || b.sharedAt || 0;
        return new Date(tb) - new Date(ta);
      });
      setTickets(rows);
    } catch (err) {
      setError(err.message || "Failed to load receipts.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => matchesQuery(t, q));
  }, [tickets, search]);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) || null,
    [tickets, selectedId],
  );

  const teacherName = resolveDisplayName(profile || user) || "Teacher";

  return (
    <div className="w-full px-3 sm:px-4 lg:px-6 py-4">
      <header className="mb-6 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Writing Center — Teacher</h1>
        <p className="mt-1 text-sm text-gray-600">
          Receipts students send to you, {teacherName}. Search and open a ticket to
          view details and the PDF.
        </p>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student, tutor, subject…"
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Search receipts"
        />
        <button
          type="button"
          onClick={loadTickets}
          disabled={loading}
          className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {loading && tickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Loading receipts…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {tickets.length === 0
                ? "No receipts yet. Students can send completed session PDFs to you from Writing Center."
                : "No receipts match your search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] table-fixed text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2.5">Student</th>
                    <th className="px-3 py-2.5 w-[7.5rem]">Type</th>
                    <th className="px-3 py-2.5 w-[12.5rem]">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((ticket) => {
                    const active = ticket.id === selectedId;
                    return (
                      <tr
                        key={ticket.id}
                        className={`cursor-pointer hover:bg-indigo-50/60 ${
                          active ? "bg-indigo-50" : ""
                        }`}
                        onClick={() => setSelectedId(ticket.id)}
                      >
                        <td className="px-3 py-2.5">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {ticket.studentName || "Student"}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-sm text-gray-600">
                          {formatType(ticket.sessionType)}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-gray-500 tabular-nums whitespace-nowrap">
                          {formatSessionDate(ticket.sharedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5 min-h-[16rem]">
          {!selected ? (
            <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-gray-500">
              Select a ticket to view details.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selected.studentName || "Student"}
                </h2>
              </div>

              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-500">Tutor</dt>
                  <dd className="font-medium text-gray-900">
                    {selected.tutorName || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Type</dt>
                  <dd className="font-medium text-gray-900">
                    {formatType(selected.sessionType)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Subject</dt>
                  <dd className="font-medium text-gray-900">
                    {selected.subject || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Session date</dt>
                  <dd className="font-medium text-gray-900">
                    {formatSessionDate(selected.sessionCreatedAt || selected.sessionEndTime)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Sent to you</dt>
                  <dd className="font-medium text-gray-900">
                    {formatSessionDate(selected.sharedAt)}
                  </dd>
                </div>
              </dl>

              {selected.sessionReportUrl ? (
                <a
                  href={selected.sessionReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  View receipt PDF
                </a>
              ) : (
                <p className="text-sm text-amber-700">No PDF linked on this ticket.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
