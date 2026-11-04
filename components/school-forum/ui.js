"use client";

import { useEffect, useRef } from "react";
import {
  CONCERN_CATEGORY_LABELS,
  PUBLIC_STATUS_LABELS,
} from "@/lib/school-forum/constants";

export const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export const btnPrimary = `inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 ${focusRing}`;
export const btnSecondary = `inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
export const btnDanger = `inline-flex items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
export const inputClass = `block w-full rounded-lg border border-slate-400 bg-background px-3 py-2 text-sm text-foreground placeholder:text-slate-500 aria-[invalid=true]:border-red-700 ${focusRing}`;
export const labelClass = "block text-sm font-semibold text-foreground";
export const cardClass = "rounded-2xl border border-border bg-background p-5 shadow-sm";

const STATUS_STYLES = {
  open: "bg-slate-100 text-slate-800 border-slate-300",
  presented: "bg-blue-50 text-blue-800 border-blue-200",
  in_progress: "bg-amber-50 text-amber-900 border-amber-300",
  resolved: "bg-green-50 text-green-800 border-green-300",
  not_possible: "bg-zinc-100 text-zinc-800 border-zinc-300",
};

export function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? STATUS_STYLES.open}`}
    >
      <span className="sr-only">Status: </span>
      {PUBLIC_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function CategoryBadge({ category }) {
  if (!category) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-900">
      <span className="sr-only">Category: </span>
      {CONCERN_CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

/** Field-level error, linked from the input with aria-describedby. */
export function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm font-medium text-red-700">
      <span aria-hidden="true">⚠ </span>
      {message}
    </p>
  );
}

/** Screen-reader announcement for the result of an action (vote saved, post approved, …). */
export function LiveMessage({ message }) {
  if (!message) return null;
  return (
    <p role="status" aria-live="polite" className="text-sm text-foreground">
      {message}
    </p>
  );
}

/**
 * Error or success message. Errors take focus so keyboard and screen reader users land on them.
 * @param {{ kind?: "error" | "success" | "info", children: React.ReactNode, focus?: boolean }} props
 */
export function Notice({ kind = "info", children, focus = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (focus && children) ref.current?.focus();
  }, [focus, children]);
  if (!children) return null;
  const styles = {
    error: "border-red-300 bg-red-50 text-red-900",
    success: "border-green-300 bg-green-50 text-green-900",
    info: "border-blue-200 bg-blue-50 text-blue-900",
  };
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm outline-none ${styles[kind]}`}
    >
      {children}
    </div>
  );
}

export function formatDate(iso, { withTime = false } = {}) {
  if (!iso) return "";
  // Public views send YYYY-MM-DD; parse it as a local calendar day, not UTC midnight.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

/**
 * Keyboard-accessible tabs (WAI-ARIA tabs pattern: arrow keys / Home / End move between tabs).
 * @param {{ label: string, tabs: { id: string, label: string, count?: number }[], active: string, onChange: (id: string) => void, idPrefix: string }} props
 */
export function Tabs({ label, tabs, active, onChange, idPrefix }) {
  const refs = useRef({});
  const onKeyDown = (event, index) => {
    let next = null;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next == null) return;
    event.preventDefault();
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
      {tabs.map((tab, i) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${focusRing} ${
              selected ? "bg-background text-foreground shadow-sm" : "text-slate-700 hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count ? <span className="ml-1">({tab.count})</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idPrefix, id, active, children }) {
  if (id !== active) return null;
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${id}`}
      aria-labelledby={`${idPrefix}-tab-${id}`}
      tabIndex={0}
      className="mt-6 outline-none"
    >
      {children}
    </div>
  );
}
