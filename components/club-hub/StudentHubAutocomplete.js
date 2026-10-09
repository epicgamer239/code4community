"use client";

import { useEffect, useId, useRef, useState } from "react";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import { searchStudentsForAdminClient } from "@/lib/club-hub/adminStudentsClient";

/**
 * @param {{
 *   user: import("firebase/auth").User | null,
 *   onSelect: (student: { userId: string | null, email: string, displayName: string }) => void,
 *   id?: string,
 *   className?: string,
 * }} props
 */
export default function StudentHubAutocomplete({ user, onSelect, id: idProp, className = "" }) {
  const autoId = useId();
  const inputId = idProp || `student-ac-${autoId}`;
  const listboxId = `${inputId}-listbox`;
  const wrapRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  /** @type {{ userId: string | null, email: string, displayName: string }[]} */
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchEnabled = Boolean(user?.getIdToken) && query.trim().length >= 2;

  useEffect(() => {
    if (!searchEnabled) return undefined;
    const q = query.trim();
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await searchStudentsForAdminClient(user, q);
        if (!cancelled) {
          setMatches(rows);
          setActiveIndex(0);
        }
      } catch {
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, user, searchEnabled]);

  const visibleMatches = searchEnabled ? matches : [];

  const activeOptionIndex =
    visibleMatches.length === 0 ? 0 : Math.min(activeIndex, visibleMatches.length - 1);

  const selectStudent = (student) => {
    onSelect(student);
    setQuery(`${student.displayName} (${student.email})`);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || visibleMatches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % visibleMatches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + visibleMatches.length) % visibleMatches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectStudent(visibleMatches[activeOptionIndex]);
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
        Student
      </label>
      <input
        id={inputId}
        type="search"
        role="combobox"
        aria-expanded={open && visibleMatches.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-busy={loading}
        value={query}
        placeholder="Type name or email…"
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={`mt-1.5 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 ${clubHubButtonFocusClass}`}
      />
      {open && query.trim().length >= 2 ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Student search results"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-neutral-600">Searching…</li>
          ) : visibleMatches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-neutral-600">No matches.</li>
          ) : (
            visibleMatches.map((student, index) => (
              <li
                key={`${student.email}-${student.userId || "none"}`}
                id={`${inputId}-opt-${index}`}
                role="option"
                aria-selected={index === activeOptionIndex}
              >
                <button
                  type="button"
                  disabled={!student.userId}
                  className={`block w-full px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60 hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none ${index === activeOptionIndex ? "bg-neutral-50" : ""} ${clubHubButtonFocusClass}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (student.userId) selectStudent(student);
                  }}
                >
                  <span className="font-medium text-neutral-900">{student.displayName}</span>
                  <span className="block text-xs text-neutral-600">{student.email}</span>
                  {!student.userId ? (
                    <span className="block text-xs text-amber-800">No site account yet</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
