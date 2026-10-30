"use client";

import { useEffect, useId, useState } from "react";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";

/**
 * @param {{
 *   open: boolean,
 *   clubName: string,
 *   busy: boolean,
 *   requestMode?: boolean,
 *   meetingDay?: "gold" | "maroon" | "both" | "general" | "",
 *   onClose: () => void,
 *   onConfirm: (seminarDays: ("gold" | "maroon")[]) => void | Promise<void>,
 * }} props
 */
export default function ClubJoinConfirmDialog({
  open,
  clubName,
  busy,
  requestMode = false,
  meetingDay = "",
  onClose,
  onConfirm,
}) {
  const titleId = useId();
  const descId = useId();
  const checkboxId = useId();
  const seminarGroupId = useId();
  const [affirmed, setAffirmed] = useState(false);
  /** @type {"gold" | "maroon" | "both"} */
  const [seminarChoice, setSeminarChoice] = useState("both");
  const needsSeminarChoice = meetingDay === "both";

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  /** @returns {("gold" | "maroon")[]} */
  function seminarDaysFromChoice() {
    if (meetingDay === "gold") return ["gold"];
    if (meetingDay === "maroon") return ["maroon"];
    if (meetingDay === "both") {
      if (seminarChoice === "gold") return ["gold"];
      if (seminarChoice === "maroon") return ["maroon"];
      return ["gold", "maroon"];
    }
    return [];
  }

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
          {requestMode ? `Request to join ${clubName}?` : `Join ${clubName}?`}
        </h2>
        <p id={descId} className="mt-2 text-sm leading-relaxed text-neutral-700">
          {requestMode
            ? "A sponsor or board member must approve you before you are a member. Club membership is a commitment to participate regularly."
            : "Club membership is a commitment. If you join, we expect you to participate regularly and represent the club responsibly at meetings and activities."}
        </p>

        {needsSeminarChoice ? (
          <fieldset className="mt-4 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <legend id={seminarGroupId} className="px-1 text-sm font-semibold text-neutral-900">
              Seminar days
            </legend>
            <p className="text-xs text-neutral-700">
              This club meets on Gold and Maroon days. Choose which days you will attend during
              seminar.
            </p>
            {[
              { value: "gold", label: "Gold days only" },
              { value: "maroon", label: "Maroon days only" },
              { value: "both", label: "Both Gold and Maroon days" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800"
              >
                <input
                  type="radio"
                  name={seminarGroupId}
                  value={option.value}
                  checked={seminarChoice === option.value}
                  disabled={busy}
                  onChange={() => setSeminarChoice(/** @type {"gold" | "maroon" | "both"} */ (option.value))}
                  className="size-4 border-neutral-300 text-[#5c1417] focus:ring-[#5c1417]"
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        ) : null}

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
            onClick={() => onConfirm(seminarDaysFromChoice())}
            disabled={busy || !affirmed}
            aria-busy={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${clubHubButtonFocusClass}`}
            style={{ backgroundColor: CLUB_HUB_MAROON }}
          >
            {busy ? "Saving…" : requestMode ? "Send request" : "Confirm join"}
          </button>
        </div>
      </div>
    </div>
  );
}
