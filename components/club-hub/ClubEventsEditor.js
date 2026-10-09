"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ClubHubLiveMessage from "@/components/club-hub/ClubHubLiveMessage";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import { runEffectWork } from "@/hooks/runEffectWork";
import {
  createClubEvent,
  createClubEventsBatch,
  deleteClubEvent,
  fetchClubEventsForClub,
  formatEventDateLabel,
  updateClubEvent,
} from "@/lib/club-hub/clubEvents";
import {
  expandRecurringEventDates,
  LCPS_SCHOOL_YEAR_END,
  WEEKDAY_LABELS,
} from "@/lib/club-hub/recurringClubEvents";
import ClubEventDescriptionField from "@/components/club-hub/ClubEventDescriptionField";
import ClubEventDescriptionView from "@/components/club-hub/ClubEventDescriptionView";

const MAROON = "#5c1417";

const EMPTY_FORM = {
  title: "",
  description: "",
  date: "",
  time: "3:15 PM",
  location: "",
  recurrence: "none",
  weeklyDays: /** @type {number[]} */ ([]),
  monthlyMode: "same-weekday",
  repeatUntil: LCPS_SCHOOL_YEAR_END,
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
  const closeButtonRef = useRef(null);

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

  useEffect(() => {
    if (!open) return undefined;
    closeButtonRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

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
      ...EMPTY_FORM,
      title: ev.title,
      description: ev.description || "",
      date: ev.date,
      time: ev.time || "3:15 PM",
      location: ev.location || "",
      recurrence: "none",
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
      } else if (form.recurrence === "none") {
        await createClubEvent(payload);
        setMessage("Event added.");
      } else {
        const dates = expandRecurringEventDates({
          startDate: form.date,
          recurrence: form.recurrence,
          weeklyDays:
            form.recurrence === "weekly"
              ? form.weeklyDays.length
                ? form.weeklyDays
                : [new Date(`${form.date}T12:00:00`).getDay()]
              : [],
          monthlyMode: form.monthlyMode,
          endDate: form.repeatUntil,
        });
        if (dates.length === 0) {
          throw new Error("No meeting dates in that range. Check the start date and repeat options.");
        }
        await createClubEventsBatch({ ...payload, dates });
        setMessage(`Added ${dates.length} meeting${dates.length === 1 ? "" : "s"}.`);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="club-events-editor-title"
        className="flex max-h-[min(90vh,780px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 id="club-events-editor-title" className="text-lg font-bold text-neutral-900">
              Edit meetings &amp; activities
            </h2>
            <p className="mt-0.5 text-sm text-neutral-700">{clubName}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className={`rounded-lg px-2 py-1 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 ${clubHubButtonFocusClass}`}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ClubHubLiveMessage message={error} variant="alert" />
          <ClubHubLiveMessage message={message} />

          <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
              {editingId ? "Edit event" : "Add event"}
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="ev-title" className="block text-xs font-semibold text-neutral-700">
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
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="ev-date" className="block text-xs font-semibold text-neutral-700">
                    {form.recurrence !== "none" && !editingId ? "First date" : "Date"}
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
                  <label htmlFor="ev-time" className="block text-xs font-semibold text-neutral-700">
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
                  <label htmlFor="ev-loc" className="block text-xs font-semibold text-neutral-700">
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
              <ClubEventDescriptionField
                id="ev-desc"
                value={form.description}
                disabled={saving}
                onChange={(description) => setForm((f) => ({ ...f, description }))}
              />
              {!editingId ? (
              <fieldset className="space-y-2 rounded-md border border-neutral-200 bg-white p-3">
                <legend className="px-1 text-xs font-semibold text-neutral-700">Repeat</legend>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "none", label: "One date" },
                    { value: "weekly", label: "Weekly" },
                    { value: "monthly", label: "Monthly" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800"
                    >
                      <input
                        type="radio"
                        name="ev-recurrence"
                        value={opt.value}
                        checked={form.recurrence === opt.value}
                        onChange={() =>
                          setForm((f) => ({
                            ...f,
                            recurrence: opt.value,
                            weeklyDays:
                              opt.value === "weekly" && !f.weeklyDays.length && f.date
                                ? [new Date(`${f.date}T12:00:00`).getDay()]
                                : f.weeklyDays,
                          }))
                        }
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {form.recurrence === "weekly" ? (
                  <div>
                    <p className="text-[11px] font-semibold text-neutral-700">On these weekdays</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {WEEKDAY_LABELS.map(({ value, label }) => {
                        const checked = form.weeklyDays.includes(value);
                        return (
                          <label
                            key={value}
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${
                              checked
                                ? "border-[#5c1417] bg-rose-50 text-[#5c1417]"
                                : "border-neutral-300 text-neutral-800"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() =>
                                setForm((f) => ({
                                  ...f,
                                  weeklyDays: checked
                                    ? f.weeklyDays.filter((d) => d !== value)
                                    : [...f.weeklyDays, value].sort((a, b) => a - b),
                                }))
                              }
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-600">
                      Example: Debate &amp; Speech — select Wed and Thu for every week through the
                      end of the school year.
                    </p>
                  </div>
                ) : null}
                {form.recurrence === "monthly" ? (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-neutral-700">
                      Monthly pattern
                    </label>
                    <select
                      value={form.monthlyMode}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          monthlyMode: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                    >
                      <option value="same-weekday">Same weekday (e.g. first Thursday)</option>
                      <option value="same-date">Same date each month (e.g. the 15th)</option>
                    </select>
                    <p className="text-[11px] text-neutral-600">
                      Uses the first date above as the anchor (weekday or day-of-month).
                    </p>
                  </div>
                ) : null}
                {form.recurrence !== "none" ? (
                  <div>
                    <label htmlFor="ev-repeat-until" className="block text-[11px] font-semibold text-neutral-700">
                      Repeat through
                    </label>
                    <input
                      id="ev-repeat-until"
                      type="date"
                      value={form.repeatUntil}
                      max={LCPS_SCHOOL_YEAR_END}
                      onChange={(e) => setForm((f) => ({ ...f, repeatUntil: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>
                ) : null}
              </fieldset>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-200 pt-4">
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
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Scheduled events
            </p>
            {loading ? (
              <p className="mt-3 text-sm text-neutral-700" role="status">
                Loading…
              </p>
            ) : sortedEvents.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-700">No events yet. Add one above.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {sortedEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-900">{ev.title}</p>
                      <p className="text-sm text-neutral-700">
                        {formatEventDateLabel(ev.date)} · {ev.time}
                        {ev.location ? ` · ${ev.location}` : ""}
                      </p>
                      {ev.description ? (
                        <ClubEventDescriptionView
                          description={ev.description}
                          className="mt-1 text-sm text-neutral-700"
                        />
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
