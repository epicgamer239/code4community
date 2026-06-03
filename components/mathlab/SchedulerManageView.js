"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import { spotsLeft } from "@/lib/mathlabScheduler";
import { OFFICE_HOURS_SCHEDULER } from "@/lib/schedulerConfig";
import { officeHoursScheduler } from "@/lib/schedulerFirestore";
import {
  addMinutes,
  availableYmdsFromSlots,
  DEFAULT_SLOT_MINUTES,
  formatTime12h,
  formatTime24As12h,
  hasTimeConflict,
  parseTime24OnYmd,
  slotStartDate,
  slotsForDay,
  TEACHER_TIME_PRESETS,
  toYmd,
} from "@/lib/schedulerCalendar";
import AvailabilityPicker, { TimeSlotButton } from "@/components/mathlab/AvailabilityPicker";
import { resolveDisplayName } from "@/lib/profile";

const defaultSettings = {
  maxCapacity: "4",
  signupCloseMinutes: "60",
};

export default function SchedulerManageView({
  scheduler = officeHoursScheduler,
  config = OFFICE_HOURS_SCHEDULER,
}) {
  const {
    closeSlot,
    createSlot,
    deleteSlot,
    fetchBookingsForSlot,
    subscribeHostSlots,
  } = scheduler;
  const { user, userData } = useAuth();
  const [slots, setSlots] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [selectedYmd, setSelectedYmd] = useState(toYmd(new Date()));
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [newTime, setNewTime] = useState("15:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expandedSlot, setExpandedSlot] = useState(null);
  const [slotBookings, setSlotBookings] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showMassCreate, setShowMassCreate] = useState(false);
  const [mass, setMass] = useState(() => ({
    startYmd: toYmd(new Date()),
    endYmd: toYmd(new Date()),
    timesCsv: "15:00",
  }));
  const [massProgress, setMassProgress] = useState(null);

  const hostName = resolveDisplayName(
    { ...userData, displayName: userData?.displayName || user?.displayName },
    "Teacher",
  );

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeHostSlots(user.uid, setSlots);
  }, [user?.uid]);

  const upcoming = useMemo(
    () =>
      slots.filter((s) => {
        const start = slotStartDate(s);
        return start && start >= new Date(new Date().setHours(0, 0, 0, 0)) && s.status !== "cancelled";
      }),
    [slots]
  );

  const availableYmds = useMemo(() => {
    const fromSlots = availableYmdsFromSlots(
      upcoming.filter((s) => s.status === "open" || s.status === "full")
    );
    fromSlots.add(selectedYmd);
    return fromSlots;
  }, [upcoming, selectedYmd]);

  const daySlots = useMemo(() => slotsForDay(upcoming, selectedYmd), [upcoming, selectedYmd]);

  const loadBookings = async (slotId) => {
    if (expandedSlot === slotId) {
      setExpandedSlot(null);
      return;
    }
    const list = await fetchBookingsForSlot(slotId);
    setSlotBookings(list);
    setExpandedSlot(slotId);
  };

  const handleAddTime = async (time24) => {
    if (!user || !selectedYmd) return;
    setBusy(true);
    setError("");
    try {
      if (hasTimeConflict(daySlots, time24)) {
        throw new Error("That time overlaps an existing slot.");
      }
      const start = parseTime24OnYmd(selectedYmd, time24);
      const end = addMinutes(start, DEFAULT_SLOT_MINUTES);
      if (start < new Date()) throw new Error("Choose a future time.");

      await createSlot({
        hostId: user.uid,
        hostName,
        slotType: config.defaultSlotType,
        startAt: start,
        endAt: end,
        maxCapacity: Number(settings.maxCapacity),
        signupCloseMinutes: Number(settings.signupCloseMinutes),
      });
    } catch (err) {
      setError(err.message || "Could not add time.");
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async (slotId) => {
    if (!user || !confirm("Close this time? No new bookings allowed.")) return;
    setBusy(true);
    try {
      await closeSlot(slotId, user.uid);
    } catch (err) {
      setError(err.message || "Could not close.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (slotId) => {
    if (!user || !confirm("Remove this empty time slot?")) return;
    setBusy(true);
    try {
      await deleteSlot(slotId, user.uid);
    } catch (err) {
      setError(err.message || "Could not delete.");
    } finally {
      setBusy(false);
    }
  };

  const parseTimesCsv = (raw) => {
    const parts = String(raw || "")
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const ok = parts.filter((t) => /^\d{2}:\d{2}$/.test(t));
    return [...new Set(ok)].sort();
  };

  const ymdRange = (startYmd, endYmd) => {
    const start = new Date(`${startYmd}T12:00:00`);
    const end = new Date(`${endYmd}T12:00:00`);
    const out = [];
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out;
    const d = start <= end ? start : end;
    const last = start <= end ? end : start;
    while (d <= last) {
      out.push(toYmd(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  };

  const isWeekendYmd = (ymd) => {
    const d = new Date(`${ymd}T12:00:00`);
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  const handleMassCreate = async () => {
    if (!user) return;
    const times = parseTimesCsv(mass.timesCsv);
    if (times.length === 0) {
      setError("Enter at least one valid time like 15:00.");
      return;
    }
    setBusy(true);
    setError("");
    setMassProgress({ total: 0, done: 0, skipped: 0 });
    try {
      const days = ymdRange(mass.startYmd, mass.endYmd).filter((d) => !isWeekendYmd(d));
      const total = days.length * times.length;
      setMassProgress({ total, done: 0, skipped: 0 });

      // Build a fast lookup for existing host slots (avoid duplicates)
      const existing = new Set();
      for (const s of upcoming) {
        const start = slotStartDate(s);
        if (!start) continue;
        const ymd = toYmd(start);
        const hh = String(start.getHours()).padStart(2, "0");
        const mm = String(start.getMinutes()).padStart(2, "0");
        existing.add(`${ymd}|${hh}:${mm}`);
      }

      let done = 0;
      let skipped = 0;
      for (const ymd of days) {
        for (const t of times) {
          const key = `${ymd}|${t}`;
          if (existing.has(key)) {
            skipped++;
            setMassProgress({ total, done, skipped });
            continue;
          }
          // avoid overlaps within same day if teacher already created a close-by slot
          const dayExisting = upcoming.filter((s) => toYmd(slotStartDate(s)) === ymd);
          if (hasTimeConflict(dayExisting, t)) {
            skipped++;
            setMassProgress({ total, done, skipped });
            continue;
          }

          const start = parseTime24OnYmd(ymd, t);
          const end = addMinutes(start, DEFAULT_SLOT_MINUTES);
          if (start < new Date()) {
            skipped++;
            setMassProgress({ total, done, skipped });
            continue;
          }
          await createSlot({
            hostId: user.uid,
            hostName,
            slotType: config.defaultSlotType,
            startAt: start,
            endAt: end,
            maxCapacity: Number(settings.maxCapacity),
            signupCloseMinutes: Number(settings.signupCloseMinutes),
          });
          existing.add(key);
          done++;
          setMassProgress({ total, done, skipped });
        }
      }
      setShowMassCreate(false);
    } catch (e) {
      setError(e.message || "Mass create failed.");
    } finally {
      setBusy(false);
      setTimeout(() => setMassProgress(null), 1500);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8">
      {error && (
        <p className="text-sm text-center px-4 py-2 rounded-md bg-red-50 text-red-700 border border-red-200">
          {error}
        </p>
      )}

      <AvailabilityPicker
        title="Set availability"
        availableYmds={availableYmds}
        selectedYmd={selectedYmd}
        onSelectDay={setSelectedYmd}
        viewMonth={viewMonth}
        onViewMonthChange={setViewMonth}
        emptyDayMessage="Select a day, then add times students can book."
        requireAvailability={false}
        headerExtra={
          <button
            type="button"
            onClick={() => setShowSettings((s) => !s)}
            className={`p-2 rounded-md border transition-colors ${
              showSettings
                ? "border-[#0078d4] bg-[#ebf3fc] text-[#0078d4]"
                : "border-transparent text-[#616161] hover:bg-[#f5f5f5]"
            }`}
            aria-label="Signup rules"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        }
      >
        {showSettings && (
          <div className="mb-4 p-3 rounded-md border border-[#e1e1e1] bg-[#fafafa] grid grid-cols-2 gap-2 text-sm">
            <label>
              <span className="text-xs text-[#616161]">Max students</span>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.maxCapacity}
                onChange={(e) => setSettings((s) => ({ ...s, maxCapacity: e.target.value }))}
                className="mt-0.5 w-full rounded border border-[#e1e1e1] px-2 py-1"
              />
            </label>
            <label>
              <span className="text-xs text-[#616161]">Latest sign-up</span>
              <select
                value={settings.signupCloseMinutes}
                onChange={(e) => setSettings((s) => ({ ...s, signupCloseMinutes: e.target.value }))}
                className="mt-0.5 w-full rounded border border-[#e1e1e1] px-2 py-1"
              >
                <option value="0">Any time</option>
                <option value="15">15 min before</option>
                <option value="30">30 min before</option>
                <option value="60">1 hour before</option>
                <option value="120">2 hours before</option>
                <option value="720">12 hours before</option>
                <option value="1440">24 hours before</option>
              </select>
            </label>
          </div>
        )}

        <p className="text-xs text-[#616161] mb-3">
          Click a time to add it · {DEFAULT_SLOT_MINUTES} min slots
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setShowMassCreate(true)}
            className="text-xs px-3 py-1.5 rounded-full border border-[#c8c8c8] hover:border-[#0078d4] hover:bg-[#f0f6fc]"
          >
            Mass create
          </button>
          {massProgress && (
            <span className="text-xs text-[#616161]">
              {massProgress.done}/{massProgress.total} created{massProgress.skipped ? ` · ${massProgress.skipped} skipped` : ""}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {TEACHER_TIME_PRESETS.map((t) => {
            const taken = hasTimeConflict(daySlots, t);
            const exists = daySlots.some((s) => {
              const d = slotStartDate(s);
              if (!d) return false;
              const hh = String(d.getHours()).padStart(2, "0");
              const mm = String(d.getMinutes()).padStart(2, "0");
              return `${hh}:${mm}` === t;
            });
            return (
              <button
                key={t}
                type="button"
                disabled={busy || taken || exists}
                onClick={() => handleAddTime(t)}
                className="text-xs px-2.5 py-1 rounded-full border border-[#c8c8c8] hover:border-[#0078d4] hover:bg-[#f0f6fc] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + {formatTime24As12h(t)}
              </button>
            );
          })}
        </div>

        {showMassCreate && (
          <div className="mb-4 p-3 rounded-md border border-[#e1e1e1] bg-white space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#242424]">Mass create (weekdays only)</p>
              <button
                type="button"
                onClick={() => setShowMassCreate(false)}
                className="text-sm text-[#616161] hover:text-[#242424]"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-[#616161]">
                Start date
                <input
                  type="date"
                  value={mass.startYmd}
                  onChange={(e) => setMass((m) => ({ ...m, startYmd: e.target.value }))}
                  className="mt-1 w-full rounded border border-[#e1e1e1] px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-[#616161]">
                End date
                <input
                  type="date"
                  value={mass.endYmd}
                  onChange={(e) => setMass((m) => ({ ...m, endYmd: e.target.value }))}
                  className="mt-1 w-full rounded border border-[#e1e1e1] px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-[#616161] col-span-2">
                Times (24h, comma-separated)
                <input
                  type="text"
                  value={mass.timesCsv}
                  onChange={(e) => setMass((m) => ({ ...m, timesCsv: e.target.value }))}
                  placeholder="08:00, 15:30"
                  className="mt-1 w-full rounded border border-[#e1e1e1] px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleMassCreate}
                className="px-4 py-2 text-sm font-medium rounded bg-[#0078d4] text-white disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create for every weekday"}
              </button>
              <button
                type="button"
                onClick={() => setShowMassCreate(false)}
                className="px-4 py-2 text-sm rounded border border-[#e1e1e1]"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-[#616161]">
              Skips Saturdays/Sundays and skips times you already created.
            </p>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="flex-1 text-sm rounded border border-[#e1e1e1] px-2 py-2"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => handleAddTime(newTime)}
            className="px-4 py-2 text-sm font-medium rounded bg-[#0078d4] text-white disabled:opacity-50"
          >
            Add time
          </button>
        </div>

        <div className="space-y-2 max-h-[220px] overflow-y-auto">
          {daySlots.length === 0 ? (
            <p className="text-sm text-[#616161]">No times on this day yet.</p>
          ) : (
            daySlots.map((slot) => {
              const start = slotStartDate(slot);
              const left = spotsLeft(slot.bookedCount ?? 0, slot.maxCapacity ?? 1);
              const isOpen = slot.status === "open" || slot.status === "full";

              return (
                <div key={slot.id} className="space-y-1">
                  <div className="flex gap-2 items-stretch">
                    <TimeSlotButton
                      active
                      disabled
                      className="flex-1 cursor-default"
                    >
                      {start ? formatTime12h(start) : "—"}
                      <span className="font-normal text-[#616161]">
                        {" "}
                        · {slot.bookedCount ?? 0}/{slot.maxCapacity} booked
                        {slot.status === "full" ? " · Full" : left > 0 ? ` · ${left} open` : ""}
                      </span>
                    </TimeSlotButton>
                    <button
                      type="button"
                      onClick={() => loadBookings(slot.id)}
                      className="px-2 text-xs rounded border border-[#e1e1e1] hover:bg-[#fafafa] shrink-0"
                    >
                      Roster
                    </button>
                    {isOpen && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleClose(slot.id)}
                        className="px-2 text-xs rounded border border-[#e1e1e1] hover:bg-[#fafafa] shrink-0"
                      >
                        Close
                      </button>
                    )}
                    {(slot.bookedCount ?? 0) === 0 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDelete(slot.id)}
                        className="px-2 text-xs rounded text-red-600 border border-red-200 hover:bg-red-50 shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {expandedSlot === slot.id && (
                    <ul className="pl-2 text-xs text-[#616161] space-y-0.5">
                      {slotBookings.length === 0 ? (
                        <li>No bookings yet.</li>
                      ) : (
                        slotBookings.map((b) => (
                          <li key={b.id}>
                            {b.studentName}
                            {b.note ? ` — ${b.note}` : ""}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </div>
      </AvailabilityPicker>
    </div>
  );
}
