"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import {
  blocksForDayType,
  capacityForBlock,
  countActivePassesForBlock,
  formatDisplayDate,
  getBlockMeta,
  isLibraryPassDay,
  LIBRARY_PASS_FIRST_YMD,
  LIBRARY_PASS_LAST_YMD,
  resolveDayType,
  studentCanUseLibraryBlock,
  toYmd,
} from "@/lib/library-pass/libraryPass";
import {
  claimLibraryPass,
  cancelLibraryPass,
  subscribeLibraryPassSettings,
  subscribePassesForDate,
} from "@/lib/library-pass/firestore";

export default function StudentDashboard() {
  const { user, userData } = useAuth();
  const today = useMemo(() => toYmd(), []);
  const [settings, setSettings] = useState(null);
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyBlock, setBusyBlock] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsubs = [
      subscribeLibraryPassSettings(
        (data) => {
          setSettings(data);
          setLoading(false);
        },
        (err) => {
          setError(err.message || "Could not load settings.");
          setLoading(false);
        },
      ),
      subscribePassesForDate(today, setPasses, (err) => {
        setError(err.message || "Could not load passes.");
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [today, user]);

  const dayType = settings ? resolveDayType(new Date(), settings) : null;
  const visibleBlocks = blocksForDayType(dayType);
  const myPass = useMemo(
    () => passes.find((p) => p.studentId === user?.uid) ?? null,
    [passes, user?.uid],
  );
  const hasAnyPass = Boolean(myPass);
  const passesOpen = settings?.passesEnabled !== false && isLibraryPassDay(today);
  const schoolDay = isLibraryPassDay(today);

  const handleGetPass = async (blockId) => {
    setError("");
    setMessage("");
    setBusyBlock(blockId);
    try {
      await claimLibraryPass({ user, userData, date: today, blockId });
      setMessage(`Pass secured for Block ${blockId}.`);
    } catch (err) {
      setError(err.message || "Could not get pass.");
    } finally {
      setBusyBlock(null);
    }
  };

  const handleCancel = async (passId) => {
    setError("");
    setMessage("");
    try {
      await cancelLibraryPass({ passId, uid: user.uid });
      setMessage("Pass cancelled.");
    } catch (err) {
      setError(err.message || "Could not cancel pass.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-600">
        Loading library passes…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Library Pass</h1>
        <p className="mt-1 text-gray-600">{formatDisplayDate(today)}</p>
        <p className="mt-2 text-sm font-medium text-indigo-700">
          {schoolDay && dayType ? (
            <>
              Today is a <span className="font-bold">{dayType} day</span> — Blocks{" "}
              {dayType === "A" ? "1–4" : "5–8"} are open.
            </>
          ) : (
            <>No library passes today — school is not in session on the LCPS June schedule.</>
          )}
        </p>
        {schoolDay && (
          <p className="mt-1 text-xs text-gray-500">
            One pass per day — cancel yours to switch blocks. Passes run through{" "}
            {formatDisplayDate(LIBRARY_PASS_LAST_YMD)} (June 3–12 school days).
          </p>
        )}
        {!passesOpen && schoolDay && (
          <p className="mt-3 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
            Pass sign-ups are stopped for today.
          </p>
        )}
      </div>

      {message && (
        <p className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {myPass && (
        <div className="mb-8 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-4">
          <h2 className="text-sm font-semibold text-indigo-900 mb-2">Your pass today</h2>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-indigo-900">
              {getBlockMeta(myPass.blockId)?.label || `Block ${myPass.blockId}`}
            </span>
            <button
              type="button"
              onClick={() => handleCancel(myPass.id)}
              className="text-red-700 hover:text-red-900 font-medium"
            >
              Cancel pass
            </button>
          </div>
        </div>
      )}

      {!schoolDay ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-10 text-center text-gray-600">
          <p className="font-medium text-gray-900 mb-2">Passes unavailable</p>
          <p className="text-sm">
            Library Pass is active on LCPS A/B days from{" "}
            {formatDisplayDate(LIBRARY_PASS_FIRST_YMD)} through{" "}
            {formatDisplayDate(LIBRARY_PASS_LAST_YMD)}.
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visibleBlocks.map((block) => {
          const used = countActivePassesForBlock(passes, block.id);
          const capacity = capacityForBlock(settings, block.id);
          const full = used >= capacity;
          const isMyBlock =
            hasAnyPass && Number(myPass.blockId) === block.id;
          const allowedForStudyHall = studentCanUseLibraryBlock(userData, block.id);
          const disabled =
            !passesOpen ||
            full ||
            hasAnyPass ||
            busyBlock === block.id ||
            !allowedForStudyHall;

          return (
            <div
              key={block.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{block.label}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {used} / {capacity} passes taken
                  </p>
                  {!allowedForStudyHall && (
                    <p className="text-xs text-amber-700 mt-1">Not your study hall block</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    full
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {full ? "Full" : "Open"}
                </span>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleGetPass(block.id)}
                className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
              >
                {isMyBlock
                  ? "Pass held"
                  : !allowedForStudyHall
                    ? "Study hall only"
                    : hasAnyPass
                    ? "One pass at a time"
                    : busyBlock === block.id
                      ? "Getting pass…"
                      : "Get pass"}
              </button>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
