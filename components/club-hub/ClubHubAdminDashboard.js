"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import ClubHubLiveMessage from "@/components/club-hub/ClubHubLiveMessage";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import ClubHubAdminStudentsPanel from "@/components/club-hub/ClubHubAdminStudentsPanel";
import ClubHubRostersPanel from "@/components/club-hub/ClubHubRostersPanel";
import ClubHubSpecialSheetEventsPanel from "@/components/club-hub/ClubHubSpecialSheetEventsPanel";
import { getSortedClubOptions } from "@/lib/club-hub/broadRunClubDirectory";
import {
  PROTECTED_CLUB_HUB_COORDINATOR_EMAIL,
  isProtectedClubHubCoordinator,
} from "@/lib/club-hub/access";
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

  const clubOptions = useMemo(() => getSortedClubOptions(), []);
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

  const coordinators = useMemo(() => {
    const fromDb = records.filter((row) => row.isCoordinator);
    const hasProtected = fromDb.some((row) =>
      isProtectedClubHubCoordinator(row.email),
    );
    if (hasProtected) return fromDb;
    return [
      {
        email: PROTECTED_CLUB_HUB_COORDINATOR_EMAIL,
        isCoordinator: true,
        manualClubSlugs: {},
        directoryClubSlugs: {},
        protected: true,
      },
      ...fromDb,
    ];
  }, [records]);

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
          Manage coordinators, per-club rosters, and one-off seminar columns on the roster sheet.
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
            id="club-hub-tab-special-events"
            aria-selected={tab === "special-events"}
            aria-controls="club-hub-panel-special-events"
            onClick={() => setTab("special-events")}
            className={tabBtn(tab === "special-events")}
          >
            Special events
          </button>
        </div>
      </div>

      <ClubHubLiveMessage message={message} />
      <ClubHubLiveMessage message={error} variant="alert" />

      {tab === "special-events" ? (
        <div
          id="club-hub-panel-special-events"
          role="tabpanel"
          aria-labelledby="club-hub-tab-special-events"
          tabIndex={0}
        >
          <ClubHubSpecialSheetEventsPanel />
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
              Can edit every club page. For sponsors, extra editors, rosters, and board members on
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
                    <div>
                      <p className="font-medium text-neutral-900">{row.email}</p>
                      {row.protected && (
                        <p className="text-xs text-neutral-700">Built-in coordinator</p>
                      )}
                    </div>
                    {!row.protected && (
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
                    )}
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
