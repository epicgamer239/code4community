"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import ClubHubLiveMessage from "@/components/club-hub/ClubHubLiveMessage";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import { getSortedClubOptions } from "@/lib/club-hub/broadRunClubDirectory";
import { useCustomClubs } from "@/lib/club-hub/customClubs";
import {
  MANUAL_RANKING_KINDS,
  MANUAL_RANKING_TITLES,
  normalizeManualRankingSlugs,
  saveManualRankingClient,
} from "@/lib/club-hub/manualRankings";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";

export default function ClubHubManualRankingsAdminPanel() {
  const { user } = useAuth();
  const { version: customClubVersion } = useCustomClubs();
  const clubOptions = useMemo(
    () => (customClubVersion >= 0 ? getSortedClubOptions() : []),
    [customClubVersion],
  );

  /** @type {[{ engagement: string[], volunteer: string[] }, Function]} */
  const [boards, setBoards] = useState({
    engagement: ["", "", ""],
    volunteer: ["", "", ""],
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!user?.getIdToken) return;
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/club-hub/admin/manual-rankings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load rankings.");
      setBoards({
        engagement: normalizeManualRankingSlugs(data.rankings?.engagement),
        volunteer: normalizeManualRankingSlugs(data.rankings?.volunteer),
      });
    } catch (err) {
      setError(err.message || "Could not load rankings.");
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

  /** @param {import("@/lib/club-hub/manualRankings").ManualRankingKind} kind @param {number} index @param {string} slug */
  const setSlot = (kind, index, slug) => {
    setBoards((prev) => {
      const next = [...prev[kind]];
      next[index] = slug;
      return { ...prev, [kind]: next };
    });
  };

  const handleSaveAll = async () => {
    if (!user || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = {};
      for (const kind of MANUAL_RANKING_KINDS) {
        saved[kind] = await saveManualRankingClient(user, {
          kind,
          slugs: boards[kind],
        });
      }
      setBoards({
        engagement: saved.engagement,
        volunteer: saved.volunteer,
      });
      setMessage("Rankings saved.");
    } catch (err) {
      setError(err.message || "Could not save rankings.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-neutral-700">Loading rankings…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">Home page rankings</h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-700">
          Set 1st–3rd for Engagement and Volunteer on the Club Hub home page. Leave a slot blank for a
          dash. Club Size updates automatically from memberships.
        </p>
      </div>

      <ClubHubLiveMessage message={message} />
      <ClubHubLiveMessage message={error} variant="alert" />

      <section className="overflow-hidden rounded-[14px] bg-white shadow-sm ring-1 ring-black/5">
        <div className="grid md:grid-cols-2 md:divide-x md:divide-neutral-200">
          {MANUAL_RANKING_KINDS.map((kind) => (
            <div key={kind} className="p-5 sm:p-6">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#5c1417]">
                {MANUAL_RANKING_TITLES[kind].replace(/ Rankings$/i, "")}
              </h3>
              <div className="mt-4 space-y-2.5">
                {[0, 1, 2].map((index) => {
                  const selectId = `${kind}-rank-${index + 1}`;
                  const selected = boards[kind][index] || "";
                  const taken = new Set(
                    boards[kind].filter((slug, i) => slug && i !== index),
                  );
                  return (
                    <div key={selectId} className="flex items-center gap-3">
                      <label
                        htmlFor={selectId}
                        className="w-14 shrink-0 text-xs font-semibold text-neutral-600"
                      >
                        #{index + 1}
                      </label>
                      <select
                        id={selectId}
                        value={selected}
                        onChange={(e) => setSlot(kind, index, e.target.value)}
                        disabled={busy}
                        className={`min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 ${clubHubButtonFocusClass}`}
                      >
                        <option value="">— Not set —</option>
                        {clubOptions.map((club) => (
                          <option
                            key={club.slug}
                            value={club.slug}
                            disabled={taken.has(club.slug)}
                          >
                            {club.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end border-t border-neutral-200 bg-neutral-50/80 px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${clubHubButtonFocusClass}`}
            style={{ backgroundColor: CLUB_HUB_MAROON }}
          >
            {busy ? "Saving…" : "Save rankings"}
          </button>
        </div>
      </section>
    </div>
  );
}
