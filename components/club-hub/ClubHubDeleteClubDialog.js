"use client";

import { useId, useState } from "react";
import { clubDeleteConfirmationPhrase } from "@/lib/club-hub/customClubStore";

/**
 * @param {{
 *   club: { slug: string, name: string },
 *   busy?: boolean,
 *   onCancel: () => void,
 *   onConfirm: (confirmation: string) => void | Promise<void>,
 * }} props
 */
function ClubHubDeleteClubDialogForm({ club, busy = false, onCancel, onConfirm }) {
  const titleId = useId();
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const expected = clubDeleteConfirmationPhrase(club.name);
  const matches = typed.trim() === expected;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-lg ring-1 ring-black/10"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold text-neutral-900">
          Delete {club.name}?
        </h2>
        <p className="mt-2 text-sm text-neutral-700">
          This removes the club from Club Hub, updates seminar rosters / the student meeting sheet, and deletes its roster
          sheet tab when one exists. Type the line below exactly to confirm.
        </p>
        <p className="mt-3 rounded-md bg-neutral-100 px-3 py-2 font-mono text-sm text-neutral-900">
          {expected}
        </p>
        <label htmlFor={inputId} className="mt-4 block text-sm font-medium text-neutral-900">
          Confirmation
        </label>
        <input
          id={inputId}
          type="text"
          value={typed}
          disabled={busy}
          autoComplete="off"
          onChange={(event) => setTyped(event.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
          placeholder={expected}
        />
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !matches}
            onClick={() => onConfirm(typed.trim())}
            className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete club"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   club: { slug: string, name: string } | null,
 *   busy?: boolean,
 *   onCancel: () => void,
 *   onConfirm: (confirmation: string) => void | Promise<void>,
 * }} props
 */
export default function ClubHubDeleteClubDialog({ club, busy = false, onCancel, onConfirm }) {
  if (!club) return null;
  return (
    <ClubHubDeleteClubDialogForm
      key={club.slug}
      club={club}
      busy={busy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
