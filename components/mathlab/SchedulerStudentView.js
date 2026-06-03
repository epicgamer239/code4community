"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/utils/AuthContext";
import { MATHLAB_COURSES } from "@/lib/mathlabCourses";
import { resolveDisplayName } from "@/lib/profile";
import {
  formatSlotWhen,
  isSlotBookable,
  slotTypeLabel,
  SLOT_TYPES,
  spotsLeft,
} from "@/lib/mathlabScheduler";
import { OFFICE_HOURS_SCHEDULER } from "@/lib/schedulerConfig";
import { officeHoursScheduler } from "@/lib/schedulerFirestore";
import {
  availableYmdsFromSlots,
  formatTime12h,
  slotStartDate,
  slotsForDay,
  toYmd,
} from "@/lib/schedulerCalendar";
import AvailabilityPicker, {
  FilterMenuButton,
  TimeSlotButton,
} from "@/components/mathlab/AvailabilityPicker";
import { SchedulerCache } from "@/utils/cache";
import { hydrateLiveList } from "@/utils/liveFirestoreCache";

export default function SchedulerStudentView({
  scheduler = officeHoursScheduler,
  config = OFFICE_HOURS_SCHEDULER,
}) {
  const {
    bookSlot,
    cancelBooking,
    subscribeOpenSlots,
    subscribeStudentBookings,
  } = scheduler;
  const { user, userData } = useAuth();
  const [slots, setSlots] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [teacherQuery, setTeacherQuery] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [teacherMenuOpen, setTeacherMenuOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedYmd, setSelectedYmd] = useState("");
  const [viewMonth, setViewMonth] = useState(() => new Date());

  useEffect(() => {
    hydrateLiveList(
      () => SchedulerCache.getOpenSlots(scheduler.slotsCollection),
      setSlots
    );
    return subscribeOpenSlots(setSlots);
  }, [scheduler.slotsCollection, subscribeOpenSlots]);

  useEffect(() => {
    if (!user?.uid) return;
    hydrateLiveList(
      () =>
        SchedulerCache.getStudentBookings(
          scheduler.bookingsCollection,
          user.uid
        ),
      setMyBookings
    );
    return subscribeStudentBookings(user.uid, setMyBookings);
  }, [user?.uid, scheduler.bookingsCollection, subscribeStudentBookings]);

  const displayName = resolveDisplayName(
    { ...userData, displayName: userData?.displayName || user?.displayName },
    "Student",
  );

  const teachers = useMemo(() => {
    const map = new Map();
    for (const s of slots) {
      const id = String(s.hostId || "").trim();
      if (!id) continue;
      const name = String(s.hostName || "Teacher").trim() || "Teacher";
      if (!map.has(id)) map.set(id, { id, name });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [slots]);

  const selectedTeacher = useMemo(() => {
    if (!selectedTeacherId) return null;
    return teachers.find((t) => t.id === selectedTeacherId) || null;
  }, [teachers, selectedTeacherId]);

  const teacherMatches = useMemo(() => {
    const q = teacherQuery.trim().toLowerCase();
    if (!q) return teachers.slice(0, 10);
    return teachers
      .filter((t) => t.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [teachers, teacherQuery]);

  const filteredSlots = useMemo(() => {
    return slots.filter((s) => {
      if (selectedTeacherId && s.hostId !== selectedTeacherId) return false;
      if (filterType !== "all" && s.slotType !== filterType) return false;
      if (filterCourse !== "all" && s.course !== filterCourse) return false;
      return isSlotBookable(s) || s.status === "full";
    });
  }, [slots, selectedTeacherId, filterType, filterCourse]);

  const bookableSlots = useMemo(
    () => filteredSlots.filter((s) => isSlotBookable(s)),
    [filteredSlots]
  );

  const availableYmds = useMemo(() => {
    if (!selectedTeacherId) return new Set();
    return availableYmdsFromSlots(bookableSlots);
  }, [bookableSlots, selectedTeacherId]);

  useEffect(() => {
    if (availableYmds.size === 0) return;
    if (!selectedYmd || !availableYmds.has(selectedYmd)) {
      const sorted = [...availableYmds].sort((a, b) => a.localeCompare(b));
      setSelectedYmd(sorted[0]);
      const [y, m] = sorted[0].split("-").map(Number);
      setViewMonth(new Date(y, m - 1, 1));
    }
  }, [availableYmds, selectedYmd]);

  const daySlots = useMemo(
    () => slotsForDay(bookableSlots, selectedYmd),
    [bookableSlots, selectedYmd]
  );

  const bookedSlotIds = useMemo(
    () => new Set(myBookings.map((b) => b.slotId)),
    [myBookings]
  );

  const handleBook = async (slotId) => {
    if (!user) return;
    setBusy(true);
    setMessage("");
    try {
      await bookSlot({
        slotId,
        studentId: user.uid,
        studentName: displayName,
        studentEmail: user.email || "",
        note: note.trim(),
      });
      setPendingSlot(null);
      setNote("");
      setMessage(config.bookSuccessMessage);
    } catch (e) {
      setMessage(e.message || "Could not book.");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (slotId) => {
    if (!user || !confirm("Cancel this booking?")) return;
    setBusy(true);
    setMessage("");
    try {
      await cancelBooking(slotId, user.uid);
      setMessage("Booking cancelled.");
    } catch (e) {
      setMessage(e.message || "Could not cancel.");
    } finally {
      setBusy(false);
    }
  };

  const canManage =
    user &&
    (userData?.role === "teacher" ||
      userData?.role === "admin" ||
      userData?.mathLabRole === "tutor");

  const teacherPicker = (
    <div className="max-w-[560px] w-full bg-white border border-[#e1e1e1] rounded-md p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <label className="block text-xs font-medium text-[#616161] mb-1">
          Teacher
        </label>
        <div className="relative">
          <input
            type="text"
            value={teacherQuery}
            onChange={(e) => {
              setTeacherQuery(e.target.value);
              setSelectedTeacherId("");
              setPendingSlot(null);
              setTeacherMenuOpen(true);
            }}
            onFocus={() => setTeacherMenuOpen(true)}
            placeholder="Search teachers…"
            className="w-full rounded border border-[#e1e1e1] px-3 py-2 text-sm"
            autoComplete="off"
          />
          {selectedTeacher && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-[#242424]">
                Booking for <span className="font-semibold">{selectedTeacher.name}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setTeacherQuery("");
                  setSelectedTeacherId("");
                  setPendingSlot(null);
                  setTeacherMenuOpen(false);
                }}
                className="text-[#0078d4] hover:underline"
              >
                Clear
              </button>
            </div>
          )}

          {!selectedTeacher && teacherMatches.length > 0 && teacherMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setTeacherMenuOpen(false)}
                aria-hidden
              />
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#e1e1e1] rounded-md shadow-lg overflow-hidden">
                {teacherMatches.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTeacherId(t.id);
                      setTeacherQuery(t.name);
                      setPendingSlot(null);
                      setTeacherMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#f5f5f5]"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-[#616161] mt-2">
          Pick a teacher first, then choose a day and time.
        </p>
      </div>
  );

  if (!selectedTeacherId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        {teacherPicker}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div className="relative">
        {canManage && (
          <div className="absolute right-0 -top-6 sm:-top-8">
            <Link
              href={config.managePath}
              className="text-sm font-medium text-[#0078d4] hover:underline"
            >
              {config.manageLinkLabel}
            </Link>
          </div>
        )}
        <div className="flex justify-center">{teacherPicker}</div>
      </div>

      {message && (
        <p className="text-sm text-center px-4 py-2 rounded-md bg-[#ebf3fc] text-[#0078d4] border border-[#0078d4]/20">
          {message}
        </p>
      )}

      <AvailabilityPicker
        title="Available times"
        availableYmds={availableYmds}
        selectedYmd={selectedYmd}
        onSelectDay={setSelectedYmd}
        viewMonth={viewMonth}
        onViewMonthChange={setViewMonth}
        emptyDayMessage={
          bookableSlots.length === 0
            ? "No open times yet. Check back when your teacher adds availability."
            : "Pick a highlighted day on the calendar."
        }
        headerExtra={
          (config.showTypeFilter || config.showCourseFilter) ? (
            <FilterMenuButton open={filterOpen} onToggle={() => setFilterOpen((o) => !o)}>
              {config.showTypeFilter && (
                <>
                  <label className="block text-xs font-medium text-[#616161]">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full text-sm rounded border border-[#e1e1e1] px-2 py-1.5"
                  >
                    <option value="all">All types</option>
                    {SLOT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {config.showCourseFilter && (
                <>
                  <label className="block text-xs font-medium text-[#616161]">Course</label>
                  <select
                    value={filterCourse}
                    onChange={(e) => setFilterCourse(e.target.value)}
                    className="w-full text-sm rounded border border-[#e1e1e1] px-2 py-1.5"
                  >
                    <option value="all">All courses</option>
                    {MATHLAB_COURSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </FilterMenuButton>
          ) : null
        }
      >
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {daySlots.length === 0 ? (
            <p className="text-sm text-[#616161]">No open times this day.</p>
          ) : (
            daySlots.map((slot) => {
              const start = slotStartDate(slot);
              const mine = bookedSlotIds.has(slot.id);
              const bookable = isSlotBookable(slot);
              const left = spotsLeft(slot.bookedCount ?? 0, slot.maxCapacity ?? 1);
              const isPending = pendingSlot?.id === slot.id;

              return (
                <div key={slot.id}>
                  <TimeSlotButton
                    active={isPending || mine}
                    disabled={!bookable && !mine}
                    onClick={() => {
                      if (mine) return;
                      if (!user) return;
                      if (bookable) setPendingSlot(isPending ? null : slot);
                    }}
                  >
                    {start ? formatTime12h(start) : "—"}
                    {mine && " · Booked"}
                    {!mine && bookable && left <= 3 && left > 0 && (
                      <span className="text-[#616161] font-normal"> · {left} left</span>
                    )}
                  </TimeSlotButton>

                  {isPending && bookable && (
                    <div className="mt-2 p-3 rounded-md border border-[#e1e1e1] bg-[#fafafa] space-y-2">
                      <p className="text-xs text-[#616161]">
                        {slotTypeLabel(slot.slotType)}
                        {slot.course ? ` · ${slot.course}` : ""} · {slot.hostName}
                        {slot.location ? ` · ${slot.location}` : ""}
                      </p>
                      {slot.notes && (
                        <p className="text-xs text-[#616161] italic">{slot.notes}</p>
                      )}
                      <input
                        type="text"
                        placeholder="Optional note (e.g. retake Ch. 5)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full text-sm rounded border border-[#e1e1e1] px-2 py-1.5"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleBook(slot.id)}
                          className="flex-1 text-sm py-2 rounded bg-[#0078d4] text-white font-medium disabled:opacity-50"
                        >
                          {busy ? "Booking…" : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingSlot(null);
                            setNote("");
                          }}
                          className="text-sm px-3 py-2 rounded border border-[#e1e1e1]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {!user && daySlots.length > 0 && (
          <p className="mt-4 text-sm text-center text-[#616161]">
            <Link
              href={`/login?redirectTo=${encodeURIComponent(config.bookPath)}`}
              className="text-[#0078d4] font-medium hover:underline"
            >
              Sign in
            </Link>{" "}
            to book a time.
          </p>
        )}
      </AvailabilityPicker>

      {user && myBookings.length > 0 && (
        <div className="max-w-[720px] mx-auto bg-white border border-[#e1e1e1] rounded-md p-5">
          <h3 className="text-sm font-semibold text-[#242424] mb-3">My bookings</h3>
          <ul className="space-y-2">
            {myBookings.map((b) => (
              <li
                key={b.id}
                className="flex justify-between items-center text-sm py-2 border-b border-[#f0f0f0] last:border-0"
              >
                <span className="text-[#242424]">
                  {formatSlotWhen(b.startAt)} · {slotTypeLabel(b.slotType)}
                  {b.course ? ` · ${b.course}` : ""}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleCancel(b.slotId)}
                  className="text-red-600 hover:underline shrink-0 ml-2"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
