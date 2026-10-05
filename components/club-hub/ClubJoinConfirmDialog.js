"use client";

import { useEffect, useId, useState } from "react";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";

/**
 * @param {{
 *   open: boolean,
 *   clubName: string,
 *   busy: boolean,
 *   onClose: () => void,
 *   onConfirm: () => void,
 * }} props
 */
export default function ClubJoinConfirmDialog({ open, clubName, busy, onClose, onConfirm }) {
  const titleId = useId();
  const descId = useId();
  const checkboxId = useId();
  const [affirmed, setAffirmed] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl sm:p-6"
      >
        <h2 id={titleId} className="text-lg font-bold text-neutral-900">
          Join {clubName}?
        </h2>
        <p id={descId} className="mt-2 text-sm leading-relaxed text-neutral-700">
          Club membership is a commitment. If you join, we expect you to participate regularly and
          represent the club responsibly at meetings and activities.
        </p>

        <label
          htmlFor={checkboxId}
          className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800"
        >
          <input
            id={checkboxId}
            type="checkbox"
            checked={affirmed}
            disabled={busy}
            onChange={(e) => setAffirmed(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-neutral-300 text-[#5c1417] focus:ring-[#5c1417]"
          />
          <span>
            By checking this box, I affirm that I understand these expectations and agree to be an
            active, dedicated member of this club.
          </span>
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 ${clubHubButtonFocusClass}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !affirmed}
            aria-busy={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${clubHubButtonFocusClass}`}
            style={{ backgroundColor: CLUB_HUB_MAROON }}
          >
            {busy ? "Joining…" : "Confirm join"}
          </button>
        </div>
      </div>
    </div>
  );
}
