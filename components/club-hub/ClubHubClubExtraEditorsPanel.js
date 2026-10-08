"use client";

import { useMemo, useState } from "react";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";
import { setClubHubManualClubAccess } from "@/lib/club-hub/clubHubRoles";
import { normalizeEmail, isValidEmail } from "@/lib/email";

/**
 * @param {{
 *   clubSlug: string,
 *   clubName: string,
 *   records: NonNullable<ReturnType<import("@/lib/club-hub/clubHubRoles").normalizeAccessRecord>>[],
 *   user: { uid: string } | null,
 *   busy: boolean,
 *   onBusyChange: (busy: boolean) => void,
 *   onMessage: (text: string) => void,
 *   onError: (text: string) => void,
 *   onSaved?: () => void | Promise<void>,
 * }} props
 */
export default function ClubHubClubExtraEditorsPanel({
  clubSlug,
  clubName,
  records,
  user,
  busy,
  onBusyChange,
  onMessage,
  onError,
  onSaved,
}) {
  const [editorEmail, setEditorEmail] = useState("");

  const editorsForClub = useMemo(
    () =>
      records.filter(
        (row) =>
          !row.isCoordinator &&
          row.manualClubSlugs &&
          row.manualClubSlugs[clubSlug],
      ),
    [records, clubSlug],
  );

  const grantAccess = async (email) => {
    if (!user?.uid || busy) return;
    onBusyChange(true);
    onError("");
    try {
      const existing = records.find((row) => row.email === email);
      const currentSlugs = Object.keys(existing?.manualClubSlugs || {}).filter(
        (slug) => existing.manualClubSlugs[slug],
      );
      const nextSlugs = Array.from(new Set([...currentSlugs, clubSlug]));
      await setClubHubManualClubAccess({
        email,
        clubSlugs: nextSlugs,
        adminUid: user.uid,
      });
      setEditorEmail("");
      onMessage(`Granted edit access to ${email} for ${clubName}.`);
      await onSaved?.();
    } catch (err) {
      onError(err.message || "Could not grant access.");
    } finally {
      onBusyChange(false);
    }
  };

  const revokeAccess = async (email) => {
    if (!user?.uid || busy) return;
    onBusyChange(true);
    onError("");
    try {
      const existing = records.find((row) => row.email === email);
      const currentSlugs = Object.keys(existing?.manualClubSlugs || {}).filter(
        (slug) => existing.manualClubSlugs[slug],
      );
      const nextSlugs = currentSlugs.filter((slug) => slug !== clubSlug);
      await setClubHubManualClubAccess({
        email,
        clubSlugs: nextSlugs,
        adminUid: user.uid,
      });
      onMessage(`Removed manual edit access for ${email} on ${clubName}.`);
      await onSaved?.();
    } catch (err) {
      onError(err.message || "Could not remove access.");
    } finally {
      onBusyChange(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = normalizeEmail(editorEmail);
    if (!isValidEmail(email)) {
      onError("Enter a valid editor email.");
      return;
    }
    await grantAccess(email);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-700">
        Grant edit access to {clubName} by email (in addition to sponsors and board members).
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <label htmlFor={`extra-editor-email-${clubSlug}`} className="sr-only">
          Editor email
        </label>
        <input
          id={`extra-editor-email-${clubSlug}`}
          type="email"
          value={editorEmail}
          onChange={(e) => setEditorEmail(e.target.value)}
          placeholder="name@lcps.org"
          autoComplete="email"
          className="min-w-[12rem] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
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

      {editorsForClub.length === 0 ? (
        <p className="text-sm text-neutral-700">No extra editors for this club yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
          {editorsForClub.map((row) => (
            <li key={row.email} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <p className="text-sm font-medium text-neutral-900">{row.email}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => revokeAccess(row.email)}
                className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
