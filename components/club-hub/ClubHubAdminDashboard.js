"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import ClubHubLiveMessage from "@/components/club-hub/ClubHubLiveMessage";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import ClubHubAdminStudentsPanel from "@/components/club-hub/ClubHubAdminStudentsPanel";
import ClubHubRostersPanel from "@/components/club-hub/ClubHubRostersPanel";
import ClubHubOpportunityEventsPanel from "@/components/club-hub/ClubHubOpportunityEventsPanel";
import ClubHubSpecialSheetEventsPanel from "@/components/club-hub/ClubHubSpecialSheetEventsPanel";
import ClubHubMeetingDaysAdminPanel from "@/components/club-hub/ClubHubMeetingDaysAdminPanel";
import ClubHubManualRankingsAdminPanel from "@/components/club-hub/ClubHubManualRankingsAdminPanel";
import { getSortedClubOptions } from "@/lib/club-hub/broadRunClubDirectory";
import { useCustomClubs } from "@/lib/club-hub/customClubs";
import {
  fetchAllClubHubAccessRecords,
  setClubHubCoordinator,
} from "@/lib/club-hub/clubHubRoles";
import { fetchAllClubSponsorOverrides } from "@/lib/club-hub/clubSponsors";
import { normalizeEmail, isValidEmail } from "@/lib/email";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";

export default function ClubHubAdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("access");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [coordinatorEmail, setCoordinatorEmail] = useState("");
  const [sponsorOverrides, setSponsorOverrides] = useState({});
  const [busy, setBusy] = useState(false);

  const { version: customClubVersion } = useCustomClubs();
  const clubOptions = useMemo(
    () => (customClubVersion >= 0 ? getSortedClubOptions() : []),
    [customClubVersion],
  );
  const allClubSlugs = useMemo(() => clubOptions.map((club) => club.slug), [clubOptions]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rows, overrides] = await Promise.all([
        fetchAllClubHubAccessRecords(),
        fetchAllClubSponsorOverrides(),
      ]);
      setRecords(rows);
      setSponsorOverrides(overrides);
    } catch (err) {
      setError(err.message || "Could not load Club Hub roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await loadRecords();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRecords]);

  const coordinators = useMemo(
    () => records.filter((row) => row.isCoordinator),
    [records],
  );

  const run = async (action) => {
    if (!user?.uid || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await loadRecords();
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddCoordinator = async (e) => {
    e.preventDefault();
    const email = normalizeEmail(coordinatorEmail);
    if (!isValidEmail(email)) {
      setError("Enter a valid coordinator email.");
      return;
    }
    await run(async () => {
      await setClubHubCoordinator({
        email,
        adminUid: user.uid,
        isCoordinator: true,
      });
      setCoordinatorEmail("");
      setMessage(`Added coordinator: ${email}`);
    });
  };

  const tabBtn = (active) =>
    `${active
      ? "rounded-full border border-[#5c1417] bg-[#5c1417] px-5 py-1.5 text-sm font-semibold text-white"
      : "rounded-full border border-[#5c1417]/40 bg-white px-5 py-1.5 text-sm font-semibold text-[#5c1417] hover:bg-rose-50"} ${clubHubButtonFocusClass}`;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Club Hub admin</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700">
          Manage coordinators, per-club rosters, and Gold / Maroon / General meeting days. New clubs can be added from Meeting days. The spreadsheet has a tab for each club that meets during seminar, plus Student meeting clubs.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Club Hub admin sections">
          <button
            type="button"
            role="tab"
            id="club-hub-tab-access"
            aria-selected={tab === "access"}
            aria-controls="club-hub-panel-access"
            onClick={() => setTab("access")}
            className={tabBtn(tab === "access")}
          >
            Access
          </button>
          <button
            type="button"
            role="tab"
            id="club-hub-tab-rosters"
            aria-selected={tab === "rosters"}
            aria-controls="club-hub-panel-rosters"
            onClick={() => setTab("rosters")}
            className={tabBtn(tab === "rosters")}
          >
            Rosters &amp; metrics
          </button>
          <button
            type="button"
            role="tab"
            id="club-hub-tab-meeting-days"
            aria-selected={tab === "meeting-days"}
            aria-controls="club-hub-panel-meeting-days"
            onClick={() => setTab("meeting-days")}
            className={tabBtn(tab === "meeting-days")}
          >
            Meeting days
          </button>
          <button
            type="button"
            role="tab"
            id="club-hub-tab-rankings"
            aria-selected={tab === "rankings"}
            aria-controls="club-hub-panel-rankings"
            onClick={() => setTab("rankings")}
            className={tabBtn(tab === "rankings")}
          >
            Rankings
          </button>
          <button
            type="button"
            role="tab"
            id="club-hub-tab-students"
            aria-selected={tab === "students"}
            aria-controls="club-hub-panel-students"
            onClick={() => setTab("students")}
            className={tabBtn(tab === "students")}
          >
            Students
          </button>
          <button
            type="button"
            role="tab"
            id="club-hub-tab-events"
            aria-selected={tab === "events"}
            aria-controls="club-hub-panel-events"
            onClick={() => setTab("events")}
            className={tabBtn(tab === "events")}
          >
            Events
          </button>
        </div>
      </div>

      <ClubHubLiveMessage message={message} />
      <ClubHubLiveMessage message={error} variant="alert" />

      {tab === "events" ? (
        <div
          id="club-hub-panel-events"
          role="tabpanel"
          aria-labelledby="club-hub-tab-events"
          tabIndex={0}
        >
          <div className="mb-4">
            <h2 className="text-lg font-bold text-neutral-900">Events</h2>
            <p className="mt-1 text-sm text-neutral-700">
              Publish Club resources opportunities, or add one-off seminar columns on the student
              meeting sheet.
            </p>
          </div>
          <div className="overflow-hidden rounded-[14px] bg-white shadow-sm ring-1 ring-black/5">
            <div className="border-b border-neutral-200 p-5 sm:p-6">
              <ClubHubOpportunityEventsPanel embedded />
            </div>
            <div className="p-5 sm:p-6">
              <ClubHubSpecialSheetEventsPanel embedded />
            </div>
          </div>
        </div>
      ) : null}

      {tab === "meeting-days" ? (
        <div
          id="club-hub-panel-meeting-days"
          role="tabpanel"
          aria-labelledby="club-hub-tab-meeting-days"
          tabIndex={0}
        >
          <ClubHubMeetingDaysAdminPanel />
        </div>
      ) : null}

      {tab === "rankings" ? (
        <div
          id="club-hub-panel-rankings"
          role="tabpanel"
          aria-labelledby="club-hub-tab-rankings"
          tabIndex={0}
        >
          <ClubHubManualRankingsAdminPanel />
        </div>
      ) : null}

      {tab === "students" ? (
        <div
          id="club-hub-panel-students"
          role="tabpanel"
          aria-labelledby="club-hub-tab-students"
          tabIndex={0}
        >
          <ClubHubAdminStudentsPanel />
        </div>
      ) : null}

      {tab === "rosters" ? (
        <div
          id="club-hub-panel-rosters"
          role="tabpanel"
          aria-labelledby="club-hub-tab-rosters"
          tabIndex={0}
        >
          <ClubHubRostersPanel
            mode="admin"
            clubOptions={clubOptions}
            allowedSlugs={allClubSlugs}
            adminAccess={{
              records,
              sponsorOverrides,
              busy,
              onBusyChange: setBusy,
              user,
              onAccessMutated: loadRecords,
            }}
          />
        </div>
      ) : null}

      {tab !== "access" ? null : (
        <div
          id="club-hub-panel-access"
          role="tabpanel"
          aria-labelledby="club-hub-tab-access"
          tabIndex={0}
          className="space-y-8"
        >
          <section className="rounded-[14px] bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-bold text-neutral-900">Club coordinators</h2>
            <p className="mt-1 text-sm text-neutral-700">
              Can edit every club page. For sponsors, rosters, board members, and signup limits on
              a specific club, use{" "}
              <button
                type="button"
                onClick={() => setTab("rosters")}
                className={`font-semibold text-[#5c1417] hover:underline ${clubHubButtonFocusClass}`}
              >
                Rosters &amp; metrics
              </button>
              .
            </p>

            <form onSubmit={handleAddCoordinator} className="mt-4 flex flex-wrap gap-2">
              <label htmlFor="club-hub-coordinator-email" className="sr-only">
                Coordinator email
              </label>
              <input
                id="club-hub-coordinator-email"
                type="email"
                value={coordinatorEmail}
                onChange={(e) => setCoordinatorEmail(e.target.value)}
                placeholder="name@lcps.org"
                autoComplete="email"
                className="min-w-[16rem] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: CLUB_HUB_MAROON }}
              >
                Add coordinator
              </button>
            </form>

            {loading ? (
              <p className="mt-4 text-sm text-neutral-700">Loading…</p>
            ) : (
              <ul className="mt-4 divide-y divide-neutral-200">
                {coordinators.map((row) => (
                  <li key={row.email} className="flex items-center justify-between gap-3 py-3">
                    <p className="font-medium text-neutral-900">{row.email}</p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await setClubHubCoordinator({
                            email: row.email,
                            adminUid: user.uid,
                            isCoordinator: false,
                          });
                          setMessage(`Removed coordinator: ${row.email}`);
                        })
                      }
                      className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
