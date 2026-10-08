"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { runEffectWork } from "@/hooks/runEffectWork";
import ClubAutocomplete from "@/components/club-hub/ClubAutocomplete";
import SponsorClubManageDialog from "@/components/club-hub/SponsorClubManageDialog";
import { fetchAllUpcomingClubEvents } from "@/lib/club-hub/clubEvents";
import { fetchMembershipCountMap } from "@/lib/club-hub/clubMembershipCounts";
import { fetchClubMembershipRoster } from "@/lib/club-hub/clubMemberships";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";

const MAROON = "#5c1417";

/**
 * @param {{
 *   mode: "admin" | "sponsor",
 *   clubOptions: { slug: string, name: string }[],
 *   allowedSlugs: string[],
 *   adminAccess?: {
 *     records: ReturnType<import("@/lib/club-hub/clubHubRoles").normalizeAccessRecord>[],
 *     sponsorOverrides: Record<string, unknown>,
 *     busy: boolean,
 *     onBusyChange: (busy: boolean) => void,
 *     user: { uid: string, getIdToken?: () => Promise<string> } | null,
 *     onAccessMutated: () => void | Promise<void>,
 *   },
 * }} props
 */
export default function ClubHubRostersPanel({
  mode,
  clubOptions,
  allowedSlugs,
  adminAccess = null,
}) {
  const [selectedSlug, setSelectedSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [error, setError] = useState("");
  const [memberCountBySlug, setMemberCountBySlug] = useState({});
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [roster, setRoster] = useState([]);

  const [sponsorDialogClub, setSponsorDialogClub] = useState(null);
  const [sponsorDialogPanel, setSponsorDialogPanel] = useState("menu");
  const [adminDialogClub, setAdminDialogClub] = useState(null);
  const [adminDialogPanel, setAdminDialogPanel] = useState("menu");
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogError, setDialogError] = useState("");

  const visibleClubs = useMemo(() => {
    const allowed = new Set(allowedSlugs);
    return clubOptions.filter((club) => allowed.has(club.slug));
  }, [clubOptions, allowedSlugs]);

  const dialogSlug =
    mode === "sponsor"
      ? sponsorDialogClub?.slug || ""
      : adminDialogClub?.slug || "";

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
    const slug = dialogSlug;
    if (!slug) {
      return runEffectWork(() => setRoster([]));
    }
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setRosterLoading(true);
      try {
        const rows = await fetchClubMembershipRoster(slug);
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
  }, [dialogSlug]);

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

  const openSponsorDialog = (club) => {
    setSponsorDialogClub(club);
    setSponsorDialogPanel("menu");
  };

  const closeSponsorDialog = () => {
    setSponsorDialogClub(null);
    setSponsorDialogPanel("menu");
    setDialogMessage("");
    setDialogError("");
  };

  const openAdminDialog = (club) => {
    setAdminDialogClub(club);
    setAdminDialogPanel("menu");
    setDialogMessage("");
    setDialogError("");
  };

  const closeAdminDialog = () => {
    setAdminDialogClub(null);
    setAdminDialogPanel("menu");
    setDialogMessage("");
    setDialogError("");
  };

  const handleAdminClubChange = (slug) => {
    setSelectedSlug(slug);
    setAdminDialogClub(null);
    setAdminDialogPanel("menu");
    setDialogMessage("");
    setDialogError("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">Rosters &amp; metrics</h2>
        <p className="mt-1 text-sm text-neutral-700">
          {mode === "admin"
            ? "Member counts across all clubs. Type a club name, open its card, then choose roster, board, editors, or sponsors."
            : "Choose a club to view its roster or manage board members."}
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

      {mode === "sponsor" ? (
        <>
          <section aria-labelledby="sponsor-my-clubs-heading">
            <h3 id="sponsor-my-clubs-heading" className="text-base font-bold text-neutral-900">
              Your clubs
            </h3>
            {loading ? (
              <p className="mt-3 text-sm text-neutral-700">Loading…</p>
            ) : visibleClubs.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-700">No clubs available.</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleClubs.map((club) => (
                  <ClubManageCard
                    key={club.slug}
                    club={club}
                    metrics={metricsBySlug[club.slug] || { members: 0, upcomingEvents: 0 }}
                    onClick={() => openSponsorDialog(club)}
                  />
                ))}
              </div>
            )}
          </section>

          <SponsorClubManageDialog
            club={sponsorDialogClub}
            panel={sponsorDialogPanel}
            metrics={
              sponsorDialogClub ? metricsBySlug[sponsorDialogClub.slug] || null : null
            }
            roster={roster}
            rosterLoading={rosterLoading}
            onPanelChange={setSponsorDialogPanel}
            onClose={closeSponsorDialog}
          />
        </>
      ) : (
        <>
          <section aria-labelledby="admin-choose-club-heading">
            <h3 id="admin-choose-club-heading" className="text-base font-bold text-neutral-900">
              Choose a club
            </h3>
            <div className="mt-4 sm:max-w-md">
              <label
                htmlFor="roster-club"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
              >
                Club
              </label>
              <ClubAutocomplete
                id="roster-club"
                clubs={visibleClubs}
                valueSlug={selectedSlug}
                onChangeSlug={handleAdminClubChange}
                placeholder="Type club name…"
                className="mt-1.5"
              />
            </div>

            {!selectedClub ? (
              <p className="mt-4 text-sm text-neutral-700">
                Type a club name to manage roster, board, editors, and sponsors.
              </p>
            ) : (
              <div className="mt-5 max-w-md">
                <ClubManageCard
                  club={selectedClub}
                  metrics={selectedMetrics || { members: 0, upcomingEvents: 0 }}
                  onClick={() => openAdminDialog(selectedClub)}
                />
              </div>
            )}
          </section>

          <SponsorClubManageDialog
            variant="admin"
            club={adminDialogClub}
            panel={adminDialogPanel}
            metrics={
              adminDialogClub ? metricsBySlug[adminDialogClub.slug] || null : null
            }
            roster={roster}
            rosterLoading={rosterLoading}
            onPanelChange={(next) => {
              setAdminDialogPanel(next);
              setDialogMessage("");
              setDialogError("");
            }}
            onClose={closeAdminDialog}
            dialogMessage={dialogMessage}
            dialogError={dialogError}
            adminAccess={
              adminAccess
                ? {
                    records: adminAccess.records.filter(Boolean),
                    sponsorOverrides: adminAccess.sponsorOverrides,
                    busy: adminAccess.busy,
                    onBusyChange: adminAccess.onBusyChange,
                    user: adminAccess.user,
                    onAccessMutated: adminAccess.onAccessMutated,
                    onDialogMessage: (text) => {
                      setDialogError("");
                      setDialogMessage(text);
                    },
                    onDialogError: (text) => {
                      setDialogMessage("");
                      setDialogError(text);
                    },
                  }
                : null
            }
          />
        </>
      )}
    </div>
  );
}

/**
 * @param {{
 *   club: { slug: string, name: string },
 *   metrics: { members: number, upcomingEvents: number },
 *   onClick: () => void,
 * }} props
 */
function ClubManageCard({ club, metrics, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[14px] bg-white p-5 text-left shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md hover:ring-[#5c1417]/25 ${clubHubButtonFocusClass}`}
    >
      <p className="text-lg font-bold text-[#5c1417]">{club.name}</p>
      <p className="mt-2 text-sm text-neutral-700">
        <span className="font-semibold text-neutral-900">{metrics.members}</span> members
        {" · "}
        <span className="font-semibold text-neutral-900">{metrics.upcomingEvents}</span> upcoming
      </p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-600">
        Tap for options
      </p>
    </button>
  );
}

/** @param {{ label: string, value: string }} props */
function MetricCard({ label, value }) {
  return (
    <div className="rounded-[14px] bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: MAROON }}>
        {value}
      </p>
    </div>
  );
}
