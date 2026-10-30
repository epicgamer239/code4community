"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import ClubHubLiveMessage from "@/components/club-hub/ClubHubLiveMessage";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import {
  createSpecialSheetEventClient,
  fetchSpecialSheetEventsClient,
} from "@/lib/club-hub/specialSheetEventsClient";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";

/**
 * @param {{ embedded?: boolean }} [props]
 */
export default function ClubHubSpecialSheetEventsPanel({ embedded = false }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [studentListPaste, setStudentListPaste] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const rows = await fetchSpecialSheetEventsClient(user);
      setEvents(rows);
    } catch (err) {
      setError(err.message || "Could not load special events.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled || !user) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [user, load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await createSpecialSheetEventClient(user, {
        title,
        studentListPaste,
      });
      const unmatched = result.unmatchedEmails || [];
      setTitle("");
      setStudentListPaste("");
      await load();
      let msg = `Added “${result.event?.title || title}” to the Student meeting clubs sheet.`;
      if (unmatched.length > 0) {
        msg += ` ${unmatched.length} email(s) had no matching account: ${unmatched.slice(0, 5).join(", ")}${unmatched.length > 5 ? "…" : ""}`;
      }
      setMessage(msg);
    } catch (err) {
      setError(err.message || "Could not add special event.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={embedded ? "space-y-5" : "space-y-8"}>
      {!embedded ? (
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Seminar events</h2>
          <p className="mt-1 text-sm text-neutral-700">
            One-off seminars (not a club and not recurring on Club Hub). Each event adds a new column
            on the{" "}
            <strong className="font-semibold text-neutral-900">Student meeting clubs</strong> Google
            Sheet. Listed students get the event name in that column.
          </p>
        </div>
      ) : (
        <div>
          <h3 className="text-base font-bold text-neutral-900">Seminar / sheet events</h3>
          <p className="mt-1 text-sm text-neutral-700">
            One-off seminars add a column on the{" "}
            <strong className="font-semibold text-neutral-900">Student meeting clubs</strong> sheet.
            Listed students get the event name in that column.
          </p>
        </div>
      )}

      <ClubHubLiveMessage message={message} />
      <ClubHubLiveMessage message={error} variant="alert" />

      <div className={embedded ? "space-y-6" : "space-y-8"}>
        <div>
          <h4 className="text-sm font-semibold text-neutral-900">Add special event</h4>
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <div>
              <label
                htmlFor="special-event-title"
                className="block text-xs font-semibold text-neutral-700"
              >
                Event title
              </label>
              <input
                id="special-event-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Financial literacy seminar"
                className="mt-1 w-full max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm"
                disabled={busy}
              />
            </div>

            <div>
              <label
                htmlFor="special-event-students"
                className="block text-xs font-semibold text-neutral-700"
              >
                Student emails
              </label>
              <textarea
                id="special-event-students"
                required
                rows={5}
                value={studentListPaste}
                onChange={(e) => setStudentListPaste(e.target.value)}
                placeholder={
                  "Paste one email per line (or comma-separated)\nstudent1@lcps.org\nstudent2@lcps.org"
                }
                className="mt-1 w-full max-w-lg rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
                disabled={busy}
              />
            </div>

            <button
              type="submit"
              disabled={busy || !user}
              className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${clubHubButtonFocusClass}`}
              style={{ backgroundColor: CLUB_HUB_MAROON }}
            >
              {busy ? "Saving…" : "Add to sheet"}
            </button>
          </form>
        </div>

        <div className="border-t border-neutral-200 pt-5">
          <h4 className="text-sm font-semibold text-neutral-900">On the sheet</h4>
          {loading ? (
            <p className="mt-2 text-sm text-neutral-700">Loading…</p>
          ) : events.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-700">No special events yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-neutral-100">
              {events.map((ev) => (
                <li key={ev.id} className="py-3">
                  <p className="font-medium text-neutral-900">{ev.columnLabel || ev.title}</p>
                  <p className="text-sm text-neutral-700">
                    {(ev.studentUserIds || []).length} student
                    {(ev.studentUserIds || []).length === 1 ? "" : "s"} on the sheet column
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
