"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import {
  DEFAULT_BLOCK_CAPACITIES,
  LIBRARY_PASS_BLOCKS,
  blocksForDayType,
  capacityForBlock,
  countActivePassesForBlock,
  formatDisplayDate,
  isLibraryPassDay,
  resolveDayType,
  toYmd,
} from "@/lib/libraryPass";
import {
  cancelAllPassesForDate,
  cancelLibraryPass,
  ensureDefaultSettings,
  subscribeLibraryPassSettings,
  subscribePassesForDate,
  updateLibraryPassSettings,
} from "@/lib/libraryPassFirestore";

export default function AdminDashboard() {
  const { user } = useAuth();
  const today = useMemo(() => toYmd(), []);
  const [settings, setSettings] = useState(null);
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [capacities, setCapacities] = useState(DEFAULT_BLOCK_CAPACITIES);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    ensureDefaultSettings().catch(() => {});
    const unsubs = [
      subscribeLibraryPassSettings(
        (data) => {
          setSettings(data);
          setCapacities({ ...data.blockCapacities });
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
  const todayIsSchoolDay = isLibraryPassDay(today);
  const passesByBlock = useMemo(() => {
    const map = {};
    for (const block of LIBRARY_PASS_BLOCKS) {
      map[block.id] = passes.filter((p) => Number(p.blockId) === block.id);
    }
    return map;
  }, [passes]);

  const runAdmin = async (fn) => {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setSaving(false);
    }
  };

  const saveCapacities = () =>
    runAdmin(async () => {
      await updateLibraryPassSettings({
        blockCapacities: capacities,
        adminUid: user.uid,
      });
      setMessage("Block capacities saved.");
    });

  const togglePasses = (enabled) =>
    runAdmin(async () => {
      await updateLibraryPassSettings({
        passesEnabled: enabled,
        adminUid: user.uid,
      });
      setMessage(enabled ? "Passes are open." : "All passes stopped.");
    });

  const handleCancelPass = (passId) =>
    runAdmin(async () => {
      await cancelLibraryPass({ passId, uid: user.uid, isAdmin: true });
      setMessage("Pass cancelled.");
    });

  const handleCancelAll = () => {
    if (!window.confirm("Cancel every active pass for today?")) return;
    runAdmin(async () => {
      await cancelAllPassesForDate(today, user.uid);
      setMessage("All passes for today cancelled.");
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-gray-600">
        Loading admin panel…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Library Pass — Admin</h1>
          <p className="mt-1 text-gray-600">{formatDisplayDate(today)}</p>
          <p className="mt-1 text-sm text-indigo-700 font-medium">
            {todayIsSchoolDay && dayType
              ? `Today: ${dayType} day (Blocks ${dayType === "A" ? "1–4" : "5–8"})`
              : "No passes today"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings?.passesEnabled !== false ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => togglePasses(false)}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              Stop all passes
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => togglePasses(true)}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              Open passes
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleCancelAll}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel all today
          </button>
        </div>
      </div>

      {settings?.passesEnabled === false && (
        <p className="mb-6 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
          Pass sign-ups are currently stopped.
        </p>
      )}
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

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pass limits per block</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {LIBRARY_PASS_BLOCKS.map((block) => (
            <label key={block.id} className="text-sm">
              <span className="font-medium text-gray-700">
                {block.label}{" "}
                <span className="text-gray-400">({block.dayType})</span>
              </span>
              <input
                type="number"
                min={0}
                max={500}
                value={capacities[String(block.id)] ?? 15}
                onChange={(e) =>
                  setCapacities((prev) => ({
                    ...prev,
                    [String(block.id)]: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={saveCapacities}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Save capacities
        </button>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Active passes today ({passes.length})
          </h2>
        </div>
        {passes.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No active passes yet.
          </p>
        ) : (
          <div className="divide-y divide-gray-200">
            {LIBRARY_PASS_BLOCKS.map((block) => {
              const blockPasses = passesByBlock[block.id] || [];
              if (blockPasses.length === 0) return null;
              const used = countActivePassesForBlock(passes, block.id);
              const capacity = capacityForBlock(settings, block.id);
              return (
                <div key={block.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-gray-900">
                      {block.label}{" "}
                      <span className="text-sm font-normal text-gray-500">
                        ({used}/{capacity})
                      </span>
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {blockPasses.map((pass) => (
                      <li
                        key={pass.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-gray-900">
                          {pass.studentName || pass.studentEmail || "Student"}
                        </span>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleCancelPass(pass.id)}
                          className="text-red-700 hover:text-red-900 font-medium disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(todayIsSchoolDay && dayType ? blocksForDayType(dayType) : []).map((block) => {
          const used = countActivePassesForBlock(passes, block.id);
          const capacity = capacityForBlock(settings, block.id);
          return (
            <div
              key={block.id}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-center text-sm"
            >
              <p className="font-semibold text-gray-900">{block.label}</p>
              <p className="text-gray-600 tabular-nums mt-1">
                {used} / {capacity}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
