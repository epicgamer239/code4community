"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { runEffectWork } from "@/hooks/runEffectWork";
import {
  createClubEvent,
  deleteClubEvent,
  fetchClubEventsForClub,
  formatEventDateLabel,
  updateClubEvent,
} from "@/lib/club-hub/clubEvents";

const MAROON = "#5c1417";

const EMPTY_FORM = {
  title: "",
  description: "",
  date: "",
  time: "3:15 PM",
  location: "",
};

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   clubSlug: string,
 *   clubName: string,
 *   adminUid: string,
 *   onChanged?: () => void,
 * }} props
 */
export default function ClubEventsEditor({
  open,
  onClose,
  clubSlug,
  clubName,
  adminUid,
  onChanged,
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const loadEvents = useCallback(async () => {
    if (!clubSlug) return;
    setLoading(true);
    setError("");
    try {
      const list = await fetchClubEventsForClub(clubSlug);
      setEvents(list);
    } catch (err) {
      setError(err.message || "Could not load events.");
    } finally {
      setLoading(false);
    }
  }, [clubSlug]);

  useEffect(() => {
    if (!open) return undefined;
    return runEffectWork(() => {
      void loadEvents();
      setEditingId("");
      setForm(EMPTY_FORM);
      setMessage("");
      setError("");
    });
  }, [open, loadEvents]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [events],
  );

  const startCreate = () => {
    setEditingId("");
    setForm(EMPTY_FORM);
    setMessage("");
    setError("");
  };

  const startEdit = (ev) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      description: ev.description || "",
      date: ev.date,
      time: ev.time || "3:15 PM",
      location: ev.location || "",
    });
    setMessage("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adminUid) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        clubSlug,
        clubName,
        title: form.title,
        description: form.description,
        date: form.date,
        time: form.time,
        location: form.location,
        adminUid,
      };
      if (editingId) {
        await updateClubEvent({ ...payload, eventId: editingId });
        setMessage("Event updated.");
      } else {
        await createClubEvent(payload);
        setMessage("Event added.");
      }
      await loadEvents();
      onChanged?.();
      setEditingId("");
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message || "Could not save event.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!adminUid || !window.confirm("Delete this event?")) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await deleteClubEvent({ eventId, adminUid });
      setMessage("Event deleted.");
      if (editingId === eventId) {
        setEditingId("");
        setForm(EMPTY_FORM);
      }
      await loadEvents();
      onChanged?.();
    } catch (err) {
      setError(err.message || "Could not delete event.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="club-events-editor-title"
        className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 id="club-events-editor-title" className="text-lg font-bold text-neutral-900">
              Edit meetings &amp; activities
            </h2>
            <p className="mt-0.5 text-sm text-neutral-600">{clubName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {editingId ? "Edit event" : "Add event"}
            </p>
            <div>
              <label htmlFor="ev-title" className="block text-xs font-semibold text-neutral-600">
                Title
              </label>
              <input
                id="ev-title"
                required
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Weekly meeting"
              />
            </div>
            <div>
              <label htmlFor="ev-desc" className="block text-xs font-semibold text-neutral-600">
                Description (optional)
              </label>
              <textarea
                id="ev-desc"
                rows={2}
                maxLength={500}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                placeholder="What happens at this meeting?"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="ev-date" className="block text-xs font-semibold text-neutral-600">
                  Date
                </label>
                <input
                  id="ev-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="ev-time" className="block text-xs font-semibold text-neutral-600">
                  Time
                </label>
                <input
                  id="ev-time"
                  required
                  maxLength={40}
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="3:15 PM"
                />
              </div>
              <div>
                <label htmlFor="ev-loc" className="block text-xs font-semibold text-neutral-600">
                  Location
                </label>
                <input
                  id="ev-loc"
                  maxLength={120}
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="Room 204"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: MAROON }}
              >
                {saving ? "Saving…" : editingId ? "Update event" : "Add event"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={startCreate}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Scheduled events
            </p>
            {loading ? (
              <p className="mt-3 text-sm text-neutral-500">Loading…</p>
            ) : sortedEvents.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No events yet. Add one above.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {sortedEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-900">{ev.title}</p>
                      <p className="text-sm text-neutral-600">
                        {formatEventDateLabel(ev.date)} · {ev.time}
                        {ev.location ? ` · ${ev.location}` : ""}
                      </p>
                      {ev.description ? (
                        <p className="mt-1 text-sm text-neutral-700">{ev.description}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => startEdit(ev)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-[#5c1417] hover:bg-rose-50 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleDelete(ev.id)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
