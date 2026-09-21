"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { runEffectWork } from "@/hooks/runEffectWork";
import { useAuth } from "@/utils/AuthContext";
import ClubAutocomplete from "@/components/club-hub/ClubAutocomplete";
import ClubHubRostersPanel from "@/components/club-hub/ClubHubRostersPanel";
import {
  BROAD_RUN_CLUBS,
  clubNameToSlug,
  getSortedClubOptions,
} from "@/lib/club-hub/broadRunClubDirectory";
import {
  PROTECTED_CLUB_HUB_COORDINATOR_EMAIL,
  clubSlugsToMap,
  isProtectedClubHubCoordinator,
} from "@/lib/club-hub/access";
import {
  fetchAllClubHubAccessRecords,
  setClubHubCoordinator,
  setClubHubManualClubAccess,
} from "@/lib/club-hub/clubHubRoles";
import {
  fetchAllClubSponsorOverrides,
  getEffectiveSponsorsForSlug,
  getSponsorClubSlugsForEmail,
  resetClubSponsorsToDirectory,
  saveClubSponsors,
} from "@/lib/club-hub/clubSponsors";
import { normalizeEmail, isValidEmail } from "@/lib/email";
import { invalidateClubHubAccessCache } from "@/lib/club-hub/useClubHubAccess";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";
import { logClientError } from "@/lib/auth/logClientError";

function slugLabels(slugMap) {
  if (!slugMap) return "—";
  const slugs = Object.keys(slugMap).filter((slug) => slugMap[slug]);
  if (slugs.length === 0) return "—";
  return slugs
    .map((slug) => BROAD_RUN_CLUBS.find((c) => clubNameToSlug(c.name) === slug)?.name || slug)
    .join(", ");
}

export default function ClubHubAdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("access");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [coordinatorEmail, setCoordinatorEmail] = useState("");
  const [editorEmail, setEditorEmail] = useState("");
  const [editorClubSlug, setEditorClubSlug] = useState("");
  const [sponsorClubSlug, setSponsorClubSlug] = useState("");
  const [sponsorDraft, setSponsorDraft] = useState([{ name: "", email: "" }]);
  const [sponsorOverrides, setSponsorOverrides] = useState({});
  const [sponsorsLoading, setSponsorsLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const clubOptions = useMemo(() => getSortedClubOptions(), []);
  const allClubSlugs = useMemo(() => clubOptions.map((club) => club.slug), [clubOptions]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setSponsorsLoading(true);
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
      setSponsorsLoading(false);
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

  const manualEditors = useMemo(
    () =>
      records.filter(
        (row) =>
          Object.keys(row.manualClubSlugs || {}).length > 0 && !row.isCoordinator,
      ),
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

  const selectedSponsorClub = useMemo(
    () => clubOptions.find((club) => club.slug === sponsorClubSlug) || null,
    [clubOptions, sponsorClubSlug],
  );

  const effectiveSponsors = useMemo(() => {
    if (!sponsorClubSlug) return [];
    return getEffectiveSponsorsForSlug(sponsorClubSlug, sponsorOverrides);
  }, [sponsorClubSlug, sponsorOverrides]);

  useEffect(() => {
    return runEffectWork(() => {
      if (!sponsorClubSlug) {
        setSponsorDraft([{ name: "", email: "" }]);
        return;
      }
      const sponsors = getEffectiveSponsorsForSlug(sponsorClubSlug, sponsorOverrides);
      setSponsorDraft(
        sponsors.length > 0
          ? sponsors.map((s) => ({ name: s.name, email: s.email }))
          : [{ name: "", email: "" }],
      );
    });
  }, [sponsorClubSlug, sponsorOverrides]);

  const refreshSponsorAccessForClub = async (slug) => {
    if (!user?.getIdToken || !slug) return;
    try {
      const token = await user.getIdToken();
      await fetch("/api/club-hub/admin/refresh-sponsor-access", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });
    } catch (err) {
      logClientError("ClubHubAdminDashboard.refreshSponsorAccess", err);
    }
  };

  const handleSaveSponsors = async (e) => {
    e.preventDefault();
    if (!user?.uid || !selectedSponsorClub) return;
    await run(async () => {
      await saveClubSponsors({
        slug: selectedSponsorClub.slug,
        clubName: selectedSponsorClub.name,
        sponsors: sponsorDraft,
        adminUid: user.uid,
      });
      await refreshSponsorAccessForClub(selectedSponsorClub.slug);
      invalidateClubHubAccessCache();
      setMessage(`Saved sponsors for ${selectedSponsorClub.name}.`);
    });
  };

  const handleResetSponsors = async () => {
    if (!user?.uid || !selectedSponsorClub) return;
    await run(async () => {
      await resetClubSponsorsToDirectory({
        slug: selectedSponsorClub.slug,
        adminUid: user.uid,
      });
      await refreshSponsorAccessForClub(selectedSponsorClub.slug);
      invalidateClubHubAccessCache();
      setMessage(`Reset ${selectedSponsorClub.name} to directory defaults.`);
    });
  };

  const handleAddManualEditor = async (e) => {
    e.preventDefault();
    const email = normalizeEmail(editorEmail);
    if (!isValidEmail(email)) {
      setError("Enter a valid editor email.");
      return;
    }
    if (!editorClubSlug) {
      setError("Choose a club from the list.");
      return;
    }
    await run(async () => {
      const existing = records.find((row) => row.email === email);
      const currentSlugs = Object.keys(existing?.manualClubSlugs || {}).filter(
        (slug) => existing.manualClubSlugs[slug],
      );
      const nextSlugs = Array.from(new Set([...currentSlugs, editorClubSlug]));
      await setClubHubManualClubAccess({
        email,
        clubSlugs: nextSlugs,
        adminUid: user.uid,
      });
      setEditorEmail("");
      setEditorClubSlug("");
      setMessage(`Granted club edit access to ${email}.`);
    });
  };

  const tabBtn = (active) =>
    active
      ? "rounded-full border border-[#5c1417] bg-[#5c1417] px-5 py-1.5 text-sm font-semibold text-white"
      : "rounded-full border border-[#5c1417]/40 bg-white px-5 py-1.5 text-sm font-semibold text-[#5c1417] hover:bg-rose-50";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Club Hub admin</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Manage access, sponsors, and view club rosters across the directory.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setTab("access")} className={tabBtn(tab === "access")}>
            Access
          </button>
          <button type="button" onClick={() => setTab("rosters")} className={tabBtn(tab === "rosters")}>
            Rosters &amp; metrics
          </button>
        </div>
      </div>

      {tab === "rosters" ? (
        <ClubHubRostersPanel mode="admin" clubOptions={clubOptions} allowedSlugs={allClubSlugs} />
      ) : null}

      {tab !== "access" ? null : (
        <>
      {message && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <section className="rounded-[14px] bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-lg font-bold text-neutral-900">Club coordinators</h2>
        <p className="mt-1 text-sm text-neutral-600">Can edit every club page.</p>

        <form onSubmit={handleAddCoordinator} className="mt-4 flex flex-wrap gap-2">
          <input
            type="email"
            value={coordinatorEmail}
            onChange={(e) => setCoordinatorEmail(e.target.value)}
            placeholder="name@lcps.org"
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
          <p className="mt-4 text-sm text-neutral-500">Loading…</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200">
            {coordinators.map((row) => (
              <li key={row.email} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-neutral-900">{row.email}</p>
                  {row.protected && (
                    <p className="text-xs text-neutral-500">Built-in coordinator</p>
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

      <section className="rounded-[14px] bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-lg font-bold text-neutral-900">Extra club editors</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Grant edit access to a specific club by email.
        </p>

        <form onSubmit={handleAddManualEditor} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            type="email"
            value={editorEmail}
            onChange={(e) => setEditorEmail(e.target.value)}
            placeholder="name@lcps.org"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <ClubAutocomplete
            clubs={clubOptions}
            valueSlug={editorClubSlug}
            onChangeSlug={setEditorClubSlug}
            placeholder="Type club name…"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: CLUB_HUB_MAROON }}
          >
            Grant access
          </button>
        </form>

        {!loading && manualEditors.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No extra club editors yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200">
            {manualEditors.map((row) => (
              <li key={row.email} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-neutral-900">{row.email}</p>
                  <p className="text-sm text-neutral-600">
                    Clubs: {slugLabels(row.manualClubSlugs)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await setClubHubManualClubAccess({
                        email: row.email,
                        clubSlugs: [],
                        adminUid: user.uid,
                      });
                      setMessage(`Removed manual access for ${row.email}.`);
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

      <section className="rounded-[14px] bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-lg font-bold text-neutral-900">Club sponsors</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Assign sponsor names and emails for each club. Changes here override the
          built-in directory defaults.
        </p>

        <div className="mt-4">
          <label htmlFor="sponsor-club" className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Club
          </label>
          <ClubAutocomplete
            id="sponsor-club"
            clubs={clubOptions}
            valueSlug={sponsorClubSlug}
            onChangeSlug={setSponsorClubSlug}
            placeholder="Type club name…"
            className="mt-1.5 sm:max-w-md"
          />
        </div>

        {selectedSponsorClub ? (
          <form onSubmit={handleSaveSponsors} className="mt-5 space-y-3">
            {sponsorDraft.map((sponsor, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  type="text"
                  value={sponsor.name}
                  onChange={(e) =>
                    setSponsorDraft((rows) =>
                      rows.map((row, i) =>
                        i === index ? { ...row, name: e.target.value } : row,
                      ),
                    )
                  }
                  placeholder="Sponsor name"
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  type="email"
                  value={sponsor.email}
                  onChange={(e) =>
                    setSponsorDraft((rows) =>
                      rows.map((row, i) =>
                        i === index ? { ...row, email: e.target.value } : row,
                      ),
                    )
                  }
                  placeholder="name@lcps.org"
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={busy || sponsorDraft.length <= 1}
                  onClick={() =>
                    setSponsorDraft((rows) => rows.filter((_, i) => i !== index))
                  }
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={busy || sponsorDraft.length >= 10}
                onClick={() =>
                  setSponsorDraft((rows) => [...rows, { name: "", email: "" }])
                }
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-800"
              >
                Add sponsor
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: CLUB_HUB_MAROON }}
              >
                Save sponsors
              </button>
              {Object.prototype.hasOwnProperty.call(sponsorOverrides, sponsorClubSlug) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleResetSponsors}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-50"
                >
                  Reset to defaults
                </button>
              )}
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">Type a club name to edit sponsors.</p>
        )}

        {!sponsorsLoading && sponsorClubSlug && effectiveSponsors.length > 0 && (
          <p className="mt-4 text-sm text-neutral-600">
            Current sponsors for this club:{" "}
            {effectiveSponsors.map((s) => `${s.name} (${s.email})`).join(", ")}
          </p>
        )}

        {!sponsorsLoading && (
          <p className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            Example:{" "}
            {slugLabels(
              clubSlugsToMap(
                getSponsorClubSlugsForEmail("Timothy.Cathcart@lcps.org", sponsorOverrides),
              ),
            )}
          </p>
        )}
      </section>
        </>
      )}
    </div>
  );
}
