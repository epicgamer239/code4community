"use client";

import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold uppercase tracking-wider text-neutral-500"
      >
        {label}
      </label>
      <div className="mt-1.5 [&_input]:mt-0 [&_textarea]:mt-0 [&_input]:block [&_textarea]:block [&_input]:w-full [&_textarea]:w-full [&_input]:rounded-md [&_textarea]:rounded-md [&_input]:border [&_textarea]:border [&_input]:border-neutral-300 [&_textarea]:border-neutral-300 [&_input]:px-3 [&_textarea]:px-3 [&_input]:py-2 [&_textarea]:py-2 [&_input]:text-[15px] [&_textarea]:text-[15px]">
        {children}
      </div>
    </div>
  );
}

/**
 * @param {{
 *   draft: Record<string, string>,
 *   setField: (key: string, value: string) => void,
 *   headerPreview: string,
 *   headerFile: File | null,
 *   clearHeader: boolean,
 *   fileInputRef: import("react").RefObject<HTMLInputElement | null>,
 *   onHeaderFileSelected: (file: File | null) => void,
 *   onClearHeader: () => void,
 *   onCancel: () => void,
 *   onSubmit: (e: import("react").FormEvent) => void,
 *   saving: boolean,
 *   headingColor: string,
 *   cardClass: string,
 * }} props
 */
export default function ClubPageEditor({
  draft,
  setField,
  headerPreview,
  headerFile,
  clearHeader,
  fileInputRef,
  onHeaderFileSelected,
  onClearHeader,
  onCancel,
  onSubmit,
  saving,
  headingColor,
  cardClass,
}) {
  return (
    <form onSubmit={onSubmit} className={`${cardClass} space-y-5`}>
      <h2 className="text-lg font-bold" style={{ color: headingColor }}>
        Edit club page
      </h2>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Header image
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          Full-width banner behind the club name (JPG/PNG/WebP, max 5&nbsp;MB).
        </p>
        {headerPreview ? (
          <div className="mt-3 overflow-hidden rounded-xl bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={headerPreview}
              alt="New header preview"
              className="h-40 w-full object-cover"
            />
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="block w-full max-w-md text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#5c1417] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              onHeaderFileSelected(f);
            }}
          />
          {(draft.headerImageUrl || headerFile) && !clearHeader && (
            <button
              type="button"
              onClick={onClearHeader}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-800"
            >
              Use default banner
            </button>
          )}
        </div>
      </div>

      <Field label="About Us" htmlFor="club-about">
        <textarea
          id="club-about"
          rows={5}
          value={draft.about}
          onChange={(e) => setField("about", e.target.value)}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Resources button label" htmlFor="club-res-label">
          <input
            id="club-res-label"
            type="text"
            value={draft.resourcesLabel}
            onChange={(e) => setField("resourcesLabel", e.target.value)}
          />
        </Field>
        <Field label="Resources URL" htmlFor="club-res-url">
          <input
            id="club-res-url"
            type="url"
            value={draft.resourcesUrl}
            onChange={(e) => setField("resourcesUrl", e.target.value)}
            placeholder="https://…"
          />
        </Field>
      </div>
      <Field label="Club Leaders" htmlFor="club-leaders">
        <input
          id="club-leaders"
          type="text"
          value={draft.clubLeaders}
          onChange={(e) => setField("clubLeaders", e.target.value)}
          placeholder="Name, Name, Name"
        />
      </Field>
      <Field label="Faculty advisor" htmlFor="club-advisor">
        <input
          id="club-advisor"
          type="text"
          value={draft.facultyAdvisor}
          onChange={(e) => setField("facultyAdvisor", e.target.value)}
        />
      </Field>
      <Field label="Contact emails (one per line)" htmlFor="club-emails">
        <textarea
          id="club-emails"
          rows={4}
          value={draft.contactEmails}
          onChange={(e) => setField("contactEmails", e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Meeting frequency" htmlFor="club-freq">
          <input
            id="club-freq"
            type="text"
            value={draft.meetingFrequency}
            onChange={(e) => setField("meetingFrequency", e.target.value)}
            placeholder="weekly"
          />
        </Field>
        <Field label="Number of members" htmlFor="club-members">
          <input
            id="club-members"
            type="text"
            value={draft.memberCount}
            onChange={(e) => setField("memberCount", e.target.value)}
            placeholder="23"
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: CLUB_HUB_MAROON }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
