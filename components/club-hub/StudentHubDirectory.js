"use client";

import { useEffect, useMemo, useState } from "react";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import { filterBroadRunRosterEntries } from "@/lib/club-hub/broadRunRosterSearch";
import { fetchRegisteredStudentEmailsClient } from "@/lib/club-hub/adminStudentsClient";

const PAGE_SIZE = 50;

/**
 * @param {{
 *   user: import("firebase/auth").User | null,
 *   selectedEmail?: string,
 *   onSelect: (student: { email: string, displayName: string }) => void,
 *   id?: string,
 * }} props
 */
/** @typedef {"all" | "accounts"} StudentAccountFilter */

export default function StudentHubDirectory({ user, selectedEmail = "", onSelect, id = "admin-student-filter" }) {
  const [query, setQuery] = useState("");
  /** @type {StudentAccountFilter} */
  const [accountFilter, setAccountFilter] = useState("all");
  const [page, setPage] = useState(1);
  /** @type {Set<string> | null} */
  const [accountEmails, setAccountEmails] = useState(null);
  const [accountsError, setAccountsError] = useState("");

  useEffect(() => {
    if (!user?.getIdToken) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const emails = await fetchRegisteredStudentEmailsClient(user);
        if (!cancelled) {
          setAccountEmails(new Set(emails));
          setAccountsError("");
        }
      } catch (err) {
        if (!cancelled) {
          setAccountEmails(new Set());
          setAccountsError(err instanceof Error ? err.message : "Could not load account list.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(() => {
    let rows = filterBroadRunRosterEntries(query);
    if (accountFilter === "accounts" && accountEmails) {
      rows = rows.filter((row) => accountEmails.has(row.email));
    }
    return rows;
  }, [query, accountFilter, accountEmails]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const accountStatusReady = Boolean(user?.getIdToken) && accountEmails !== null;

  const rangeLabel =
    filtered.length === 0
      ? "No students"
      : `Showing ${pageStart + 1}–${pageStart + pageRows.length} of ${filtered.length.toLocaleString()}`;

  const accountFilterId = `${id}-account-filter`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:max-w-md">
          <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
            Filter by name or email
          </label>
          <input
            id={id}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Type to narrow the list…"
            autoComplete="off"
            className={`mt-1.5 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 ${clubHubButtonFocusClass}`}
          />
        </div>
        <div className="sm:w-56">
          <label
            htmlFor={accountFilterId}
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
          >
            Show
          </label>
          <select
            id={accountFilterId}
            value={accountFilter}
            disabled={accountFilter === "accounts" && !accountStatusReady}
            onChange={(e) => {
              setAccountFilter(/** @type {StudentAccountFilter} */ (e.target.value));
              setPage(1);
            }}
            className={`mt-1.5 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 ${clubHubButtonFocusClass}`}
          >
            <option value="all">All roster students</option>
            <option value="accounts">Created site accounts only</option>
          </select>
        </div>
      </div>

      {accountsError ? (
        <p className="text-sm text-amber-800" role="status">
          {accountsError} Account badges may be incomplete.
        </p>
      ) : null}

      <p className="text-sm text-neutral-700" aria-live="polite">
        {rangeLabel}
        {query.trim() ? ` matching “${query.trim()}”` : ""}
        {accountFilter === "accounts" ? " · site accounts only" : query.trim() ? "" : " · full school roster"}
        {!accountStatusReady && user?.getIdToken ? " · Loading account status…" : null}
      </p>

      <div className="overflow-x-auto rounded-[14px] bg-white shadow-sm ring-1 ring-black/5">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-700">
              <th className="py-2.5 pl-4 pr-3 font-semibold">Name</th>
              <th className="py-2.5 pr-3 font-semibold">Email</th>
              <th className="py-2.5 pr-4 font-semibold">Site account</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-neutral-600">
                  No students match this filter.
                </td>
              </tr>
            ) : (
              pageRows.map((student) => {
                const hasAccount = accountStatusReady && accountEmails.has(student.email);
                const isSelected = selectedEmail === student.email;
                return (
                  <tr
                    key={student.email}
                    className={isSelected ? "bg-rose-50/80" : "hover:bg-neutral-50/80"}
                  >
                    <td className="py-2 pl-4 pr-3 font-medium text-neutral-900">
                      <button
                        type="button"
                        onClick={() => onSelect(student)}
                        className={`text-left underline-offset-2 hover:underline ${clubHubButtonFocusClass}`}
                      >
                        {student.displayName}
                      </button>
                    </td>
                    <td className="py-2 pr-3 break-all text-neutral-700">{student.email}</td>
                    <td className="py-2 pr-4 text-neutral-700">
                      {!accountStatusReady ? (
                        "…"
                      ) : hasAccount ? (
                        <span className="font-medium text-green-800">Yes</span>
                      ) : (
                        <span className="text-neutral-500">No</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE ? (
        <nav
          className="flex flex-wrap items-center justify-between gap-3"
          aria-label="Student list pagination"
        >
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900 disabled:opacity-50 ${clubHubButtonFocusClass}`}
          >
            Previous
          </button>
          <span className="text-sm text-neutral-700">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={`rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900 disabled:opacity-50 ${clubHubButtonFocusClass}`}
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}
