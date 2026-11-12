"use client";

import { useEffect, useState } from "react";
import {
  canSubmitLiveTutoringRequest,
  liveTutoringRequestBlockReason,
} from "@/lib/tutoringLiveWindow";

const OPTIONS = [
  {
    id: "IN_PERSON",
    label: "Writing Center In Person",
    icon: "people",
  },
  {
    id: "ASYNC",
    label: "Writing Center Async",
    icon: "form",
  },
];

function OptionIcon({ type }) {
  if (type === "form") {
    return (
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <rect x="12" y="8" width="24" height="32" rx="3" fill="#7aa2d6" />
        <rect x="17" y="16" width="14" height="2.5" rx="1" fill="white" />
        <rect x="17" y="22" width="14" height="2.5" rx="1" fill="white" />
        <rect x="17" y="28" width="9" height="2.5" rx="1" fill="white" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
      <circle cx="18" cy="16" r="5" fill="#7aa2d6" />
      <circle cx="30" cy="16" r="5" fill="#6d94c8" />
      <path d="M8 36c1.2-6 5-9 10-9s8.8 3 10 9" fill="#7aa2d6" />
      <path d="M24 36c.8-5 3.6-8 8-8 4.2 0 7 2.8 8 8" fill="#6d94c8" />
    </svg>
  );
}

/**
 * @param {{
 *   disabled?: boolean,
 *   busy?: boolean,
 *   error?: string,
 *   onSubmit: (sessionType: "IN_PERSON" | "ASYNC") => void,
 * }} props
 */
export function WritingCenterRequestChooser({ disabled = false, busy = false, error = "", onSubmit }) {
  const [selected, setSelected] = useState("IN_PERSON");
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const now = new Date(nowTick);
  const liveAllowed = canSubmitLiveTutoringRequest(now);
  const liveBlockReason = liveTutoringRequestBlockReason(now, {
    serviceLabel: "In-person requests",
  });

  useEffect(() => {
    if (!liveAllowed && selected === "IN_PERSON") {
      setSelected("ASYNC");
    }
  }, [liveAllowed, selected]);

  const submitBlocked =
    disabled || busy || (selected === "IN_PERSON" && !liveAllowed);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (submitBlocked) return;
        onSubmit(selected);
      }}
      className="mx-auto w-full max-w-md rounded-xl border border-neutral-300 bg-white px-4 py-5 shadow-sm"
    >
      <fieldset disabled={disabled || busy}>
        <legend className="sr-only">Choose Writing Center in person or async</legend>
        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map((option) => {
            const isSelected = selected === option.id;
            const optionDisabled = option.id === "IN_PERSON" && !liveAllowed;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                disabled={optionDisabled}
                title={optionDisabled ? liveBlockReason || undefined : undefined}
                onClick={() => {
                  if (optionDisabled) return;
                  setSelected(option.id);
                }}
                className={`flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3 text-center text-xs font-medium text-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? "bg-[#d5e6fb] ring-2 ring-[#3b82f6]"
                    : "bg-[#e7f0fb] hover:bg-[#dce8f8]"
                }`}
              >
                <OptionIcon type={option.icon} />
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      {liveBlockReason ? (
        <p className="mt-3 text-xs text-neutral-600">{liveBlockReason} Async is still available.</p>
      ) : (
        <p className="mt-3 text-xs text-neutral-600">
          In-person requests: weekdays 9:30 AM–4:18 PM
        </p>
      )}
      {error ? (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex justify-center">
        <button
          type="submit"
          disabled={submitBlocked}
          className="rounded-full bg-[#3b82f6] px-8 py-2 text-sm font-semibold text-white hover:bg-[#2563eb] disabled:opacity-50"
        >
          {busy ? "Please wait…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
