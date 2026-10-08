"use client";

import { useEffect, useMemo, useState } from "react";
import { runEffectWork } from "@/hooks/runEffectWork";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";
import {
  getEffectiveSponsorsForSlug,
  resetClubSponsorsToDirectory,
  saveClubSponsors,
} from "@/lib/club-hub/clubSponsors";
import { invalidateClubHubAccessCache } from "@/lib/club-hub/useClubHubAccess";
import { logClientError } from "@/lib/auth/logClientError";

/**
 * @param {{
 *   club: { slug: string, name: string },
 *   user: { uid: string, getIdToken?: () => Promise<string> } | null,
 *   sponsorOverrides: Record<string, unknown>,
 *   busy: boolean,
 *   onBusyChange: (busy: boolean) => void,
 *   onMessage: (text: string) => void,
 *   onError: (text: string) => void,
 *   onSaved?: () => void | Promise<void>,
 * }} props
 */
export default function ClubHubClubSponsorsEditor({
  club,
  user,
  sponsorOverrides,
  busy,
  onBusyChange,
  onMessage,
  onError,
  onSaved,
}) {
  const [sponsorDraft, setSponsorDraft] = useState([{ name: "", email: "" }]);

  const effectiveSponsors = useMemo(
    () => getEffectiveSponsorsForSlug(club.slug, sponsorOverrides),
    [club.slug, sponsorOverrides],
  );

  useEffect(() => {
    return runEffectWork(() => {
      const sponsors = getEffectiveSponsorsForSlug(club.slug, sponsorOverrides);
      setSponsorDraft(
        sponsors.length > 0
          ? sponsors.map((s) => ({ name: s.name, email: s.email }))
          : [{ name: "", email: "" }],
      );
    });
  }, [club.slug, sponsorOverrides]);

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
      logClientError("ClubHubClubSponsorsEditor.refreshSponsorAccess", err);
    }
  };

  const handleSaveSponsors = async (e) => {
    e.preventDefault();
    if (!user?.uid || busy) return;
    onBusyChange(true);
    onError("");
    try {
      await saveClubSponsors({
        slug: club.slug,
        clubName: club.name,
        sponsors: sponsorDraft,
        adminUid: user.uid,
      });
      await refreshSponsorAccessForClub(club.slug);
      invalidateClubHubAccessCache();
      onMessage(`Saved sponsors for ${club.name}.`);
      await onSaved?.();
    } catch (err) {
      onError(err.message || "Could not save sponsors.");
    } finally {
      onBusyChange(false);
    }
  };

  const handleResetSponsors = async () => {
    if (!user?.uid || busy) return;
    onBusyChange(true);
    onError("");
    try {
      await resetClubSponsorsToDirectory({
        slug: club.slug,
        adminUid: user.uid,
      });
      await refreshSponsorAccessForClub(club.slug);
      invalidateClubHubAccessCache();
      onMessage(`Reset ${club.name} to directory defaults.`);
      await onSaved?.();
    } catch (err) {
      onError(err.message || "Could not reset sponsors.");
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-700">
        Assign sponsor names and emails for {club.name}. Changes override directory defaults.
      </p>

      <form onSubmit={handleSaveSponsors} className="space-y-3">
        {sponsorDraft.map((sponsor, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <label htmlFor={`dlg-sponsor-name-${index}`} className="sr-only">
              Sponsor {index + 1} name
            </label>
            <input
              id={`dlg-sponsor-name-${index}`}
              type="text"
              value={sponsor.name}
              onChange={(e) =>
                setSponsorDraft((rows) =>
                  rows.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)),
                )
              }
              placeholder="Sponsor name"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <label htmlFor={`dlg-sponsor-email-${index}`} className="sr-only">
              Sponsor {index + 1} email
            </label>
            <input
              id={`dlg-sponsor-email-${index}`}
              type="email"
              value={sponsor.email}
              onChange={(e) =>
                setSponsorDraft((rows) =>
                  rows.map((row, i) => (i === index ? { ...row, email: e.target.value } : row)),
                )
              }
              placeholder="name@lcps.org"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy || sponsorDraft.length <= 1}
              onClick={() => setSponsorDraft((rows) => rows.filter((_, i) => i !== index))}
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
            onClick={() => setSponsorDraft((rows) => [...rows, { name: "", email: "" }])}
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
          {Object.prototype.hasOwnProperty.call(sponsorOverrides, club.slug) ? (
            <button
              type="button"
              disabled={busy}
              onClick={handleResetSponsors}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-50"
            >
              Reset to defaults
            </button>
          ) : null}
        </div>
      </form>

      {effectiveSponsors.length > 0 ? (
        <p className="text-sm text-neutral-700">
          Current: {effectiveSponsors.map((s) => `${s.name} (${s.email})`).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
