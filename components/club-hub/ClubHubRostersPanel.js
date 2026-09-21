"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { runEffectWork } from "@/hooks/runEffectWork";
import Link from "next/link";
import ClubAutocomplete from "@/components/club-hub/ClubAutocomplete";
import { fetchAllUpcomingClubEvents } from "@/lib/club-hub/clubEvents";
import { fetchMembershipCountMap } from "@/lib/club-hub/clubMembershipCounts";
import {
  fetchClubMembershipRoster,
  formatJoinedAt,
} from "@/lib/club-hub/clubMemberships";

const MAROON = "#5c1417";

/**
 * @param {{
 *   mode: "admin" | "sponsor",
 *   clubOptions: { slug: string, name: string }[],
 *   allowedSlugs: string[],
 * }} props
 */
export default function ClubHubRostersPanel({ mode, clubOptions, allowedSlugs }) {
  const [selectedSlug, setSelectedSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [error, setError] = useState("");
  const [memberCountBySlug, setMemberCountBySlug] = useState({});
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [roster, setRoster] = useState([]);

  const visibleClubs = useMemo(() => {
    const allowed = new Set(allowedSlugs);
    return clubOptions.filter((club) => allowed.has(club.slug));
  }, [clubOptions, allowedSlugs]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [countMap, eventRows] = await Promise.all([
        fetchMembershipCountMap(mode === "admin" ? null : allowedSlugs),
        fetchAllUpcomingClubEvents(),
      ]);
      setMemberCountBySlug(countMap);
      setUpcomingEvents(
        mode === "admin"
          ? eventRows
          : eventRows.filter((ev) => allowedSlugs.includes(ev.clubSlug)),
      );
    } catch (err) {
      setError(err.message || "Could not load club metrics.");
    } finally {
      setLoading(false);
    }
  }, [mode, allowedSlugs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await loadSummary();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSummary]);

  useEffect(() => {
    if (!selectedSlug) {
      return runEffectWork(() => setRoster([]));
    }
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setRosterLoading(true);
      try {
        const rows = await fetchClubMembershipRoster(selectedSlug);
        if (!cancelled) setRoster(rows);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load roster.");
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSlug]);

  const metricsBySlug = useMemo(() => {
    /** @type {Record<string, { members: number, upcomingEvents: number }>} */
    const map = {};
    for (const club of visibleClubs) {
      map[club.slug] = { members: 0, upcomingEvents: 0 };
    }
    for (const club of visibleClubs) {
      map[club.slug].members = memberCountBySlug[club.slug] || 0;
    }
    for (const ev of upcomingEvents) {
      if (!map[ev.clubSlug]) map[ev.clubSlug] = { members: 0, upcomingEvents: 0 };
      map[ev.clubSlug].upcomingEvents += 1;
    }
    return map;
  }, [visibleClubs, memberCountBySlug, upcomingEvents]);

  const totals = useMemo(() => {
    let members = 0;
    let upcomingEventsCount = 0;
    let clubsWithMembers = 0;
    for (const club of visibleClubs) {
      const m = metricsBySlug[club.slug] || { members: 0, upcomingEvents: 0 };
      members += m.members;
      upcomingEventsCount += m.upcomingEvents;
      if (m.members > 0) clubsWithMembers += 1;
    }
    return { members, upcomingEventsCount, clubsWithMembers };
  }, [visibleClubs, metricsBySlug]);

  const selectedClub = visibleClubs.find((club) => club.slug === selectedSlug) || null;
  const selectedMetrics = selectedSlug ? metricsBySlug[selectedSlug] : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">Rosters &amp; metrics</h2>
        <p className="mt-1 text-sm text-neutral-600">
          {mode === "admin"
            ? "Member counts and upcoming events across all clubs."
            : "View rosters and activity for clubs you manage."}
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Total members" value={loading ? "…" : String(totals.members)} />
        <MetricCard
          label="Upcoming events"
          value={loading ? "…" : String(totals.upcomingEventsCount)}
        />
        <MetricCard
          label="Clubs with members"
          value={loading ? "…" : String(totals.clubsWithMembers)}
        />
      </div>

      <section className="rounded-[14px] bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h3 className="font-bold text-neutral-900">All clubs</h3>
        {loading ? (
          <p className="mt-4 text-sm text-neutral-500">Loading…</p>
        ) : visibleClubs.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No clubs available.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
                  <th className="py-2 pr-4 font-semibold">Club</th>
                  <th className="py-2 pr-4 font-semibold">Members</th>
                  <th className="py-2 pr-4 font-semibold">Upcoming events</th>
                  <th className="py-2 font-semibold">Roster</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {visibleClubs.map((club) => {
                  const m = metricsBySlug[club.slug] || { members: 0, upcomingEvents: 0 };
                  return (
                    <tr key={club.slug}>
                      <td className="py-2.5 pr-4 font-medium text-neutral-900">
                        <Link
                          href={`/club-hub/directory/${club.slug}`}
                          className="text-[#5c1417] hover:underline"
                        >
                          {club.name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-neutral-700">{m.members}</td>
                      <td className="py-2.5 pr-4 text-neutral-700">{m.upcomingEvents}</td>
                      <td className="py-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedSlug(club.slug)}
                          className="text-sm font-semibold text-[#5c1417] hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-[14px] bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h3 className="font-bold text-neutral-900">Club roster</h3>
        <div className="mt-4 sm:max-w-md">
          <label
            htmlFor="roster-club"
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-500"
          >
            Club
          </label>
          <ClubAutocomplete
            id="roster-club"
            clubs={visibleClubs}
            valueSlug={selectedSlug}
            onChangeSlug={setSelectedSlug}
            placeholder="Type club name…"
            className="mt-1.5"
          />
        </div>

        {selectedClub && selectedMetrics ? (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-700">
            <span>
              <strong className="text-neutral-900">{selectedMetrics.members}</strong> members
            </span>
            <span>
              <strong className="text-neutral-900">{selectedMetrics.upcomingEvents}</strong>{" "}
              upcoming events
            </span>
          </div>
        ) : null}

        {selectedSlug ? (
          rosterLoading ? (
            <p className="mt-4 text-sm text-neutral-500">Loading roster…</p>
          ) : roster.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">No members have joined yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
                    <th className="py-2 pr-4 font-semibold">Name</th>
                    <th className="py-2 pr-4 font-semibold">Email</th>
                    <th className="py-2 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {roster.map((member) => (
                    <tr key={member.id}>
                      <td className="py-2.5 pr-4 font-medium text-neutral-900">
                        {member.displayName || "—"}
                      </td>
                      <td className="py-2.5 pr-4 break-all text-neutral-700">
                        {member.userEmail || "—"}
                      </td>
                      <td className="py-2.5 text-neutral-700">
                        {formatJoinedAt(member.joinedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <p className="mt-4 text-sm text-neutral-500">Choose a club to view its member roster.</p>
        )}
      </section>
    </div>
  );
}

/** @param {{ label: string, value: string }} props */
function MetricCard({ label, value }) {
  return (
    <div className="rounded-[14px] bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: MAROON }}>
        {value}
      </p>
    </div>
  );
}
