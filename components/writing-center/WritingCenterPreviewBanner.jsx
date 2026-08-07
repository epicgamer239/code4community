"use client";

import { resolveDisplayName } from "@/lib/profile";

/**
 * @param {{
 *   role: "student" | "tutor" | "teacher",
 *   person?: { displayName?: string, email?: string, firstName?: string, lastName?: string } | null,
 *   onBack?: () => void,
 *   onChangePerson?: () => void,
 * }} props
 */
export function WritingCenterPreviewBanner({ role, person, onBack, onChangePerson }) {
  const roleLabel =
    role === "tutor" ? "Tutor" : role === "teacher" ? "Teacher" : "Student";
  const name = person ? resolveDisplayName(person) : null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-amber-950">
        <span className="font-semibold">
          Simulating {roleLabel}
          {name ? ` — ${name}` : ""}
          {person?.email ? ` (${person.email})` : ""}.
        </span>{" "}
        Read-only view of their Writing Center data. Actions are disabled.
      </p>
      <div className="flex flex-wrap gap-2 shrink-0">
        {onChangePerson && (
          <button
            type="button"
            onClick={onChangePerson}
            className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            Change person
          </button>
        )}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            Back to admin
          </button>
        )}
      </div>
    </div>
  );
}
