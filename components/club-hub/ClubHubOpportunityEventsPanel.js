"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import ClubHubLiveMessage from "@/components/club-hub/ClubHubLiveMessage";
import ClubHubOpportunityDescription from "@/components/club-hub/ClubHubOpportunityDescription";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import {
  createClubHubOpportunityEventClient,
  deleteClubHubOpportunityEventClient,
  fetchClubHubOpportunityEventsAdminClient,
} from "@/lib/club-hub/clubHubOpportunityEventsClient";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";

function formatEventDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * @param {{ embedded?: boolean }} [props]
 */
export default function ClubHubOpportunityEventsPanel({ embedded = false }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const rows = await fetchClubHubOpportunityEventsAdminClient(user);
      setEvents(rows);
    } catch (err) {
      setError(err.message || "Could not load events.");
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
      await createClubHubOpportunityEventClient(user, {
        title,
        description,
        eventDate,
      });
      setTitle("");
      setDescription("");
      setEventDate("");
      setMessage("Event published on Club resources.");
      await load();
    } catch (err) {
      setError(err.message || "Could not create event.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (eventId, eventTitle) => {
    if (!user || busy) return;
    if (!window.confirm(`Remove “${eventTitle}” from resources?`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await deleteClubHubOpportunityEventClient(user, eventId);
      setMessage("Event removed.");
      await load();
    } catch (err) {
      setError(err.message || "Could not delete event.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={embedded ? "space-y-5" : "space-y-8"}>
      {!embedded ? (
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Events</h2>
          <p className="mt-1 text-sm text-neutral-700">
            Workshops, Freshman orientation, and other sign-ups appear under{" "}
            <strong className="font-semibold">Upcoming opportunities</strong> on the Club resources
            page.
          </p>
        </div>
      ) : (
        <div>
          <h3 className="text-base font-bold text-neutral-900">Club resources opportunities</h3>
          <p className="mt-1 text-sm text-neutral-700">
            Workshops and sign-ups on the Club resources page under{" "}
            <strong className="font-semibold">Upcoming opportunities</strong>.
          </p>
        </div>
      )}

      <ClubHubLiveMessage message={message} />
      <ClubHubLiveMessage message={error} variant="alert" />

      <div className={embedded ? "space-y-6" : "space-y-8"}>
        <div>
          <h4 className="text-sm font-semibold text-neutral-900">Add event</h4>
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="opp-event-title" className="block text-xs font-semibold text-neutral-700">
                  Title
                </label>
                <input
                  id="opp-event-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="opp-event-date"
                  className="block text-xs font-semibold text-neutral-700"
                >
                  Date (optional)
                </label>
                <input
                  id="opp-event-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm sm:max-w-xs"
                />
              </div>
            </div>
            <div>
              <label htmlFor="opp-event-desc" className="block text-xs font-semibold text-neutral-700">
                Description
              </label>
              <textarea
                id="opp-event-desc"
                rows={3}
                required
                placeholder="When, where, and paste a sign-up link (https://…) if you have one."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${clubHubButtonFocusClass}`}
              style={{ backgroundColor: CLUB_HUB_MAROON }}
            >
              {busy ? "Saving…" : "Publish event"}
            </button>
          </form>
        </div>

        <div className="border-t border-neutral-200 pt-5">
          <h4 className="text-sm font-semibold text-neutral-900">Published</h4>
          {loading ? (
            <p className="mt-2 text-sm text-neutral-700">Loading…</p>
          ) : events.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-700">No events yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-neutral-100">
              {events.map((ev) => (
                <li key={ev.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900">{ev.title}</p>
                    {ev.eventDate ? (
                      <p className="text-sm text-neutral-700">{formatEventDate(ev.eventDate)}</p>
                    ) : null}
                    {ev.description ? (
                      <ClubHubOpportunityDescription
                        text={ev.description}
                        className="mt-1 text-sm text-neutral-700"
                      />
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDelete(ev.id, ev.title)}
                    className="text-sm font-semibold text-red-800 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
