"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { runEffectWork } from "@/hooks/runEffectWork";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";

/**
 * @param {{
 *   clubs: { slug: string, name: string }[],
 *   valueSlug: string,
 *   onChangeSlug: (slug: string) => void,
 *   id?: string,
 *   label?: string,
 *   placeholder?: string,
 *   className?: string,
 * }} props
 */
export default function ClubAutocomplete({
  clubs,
  valueSlug,
  onChangeSlug,
  id: idProp,
  label = "Club name",
  placeholder = "Type club name…",
  className = "",
}) {
  const autoId = useId();
  const inputId = idProp || `club-ac-${autoId}`;
  const listboxId = `${inputId}-listbox`;
  const wrapRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedClub = useMemo(
    () => clubs.find((club) => club.slug === valueSlug) || null,
    [clubs, valueSlug],
  );

  useEffect(() => {
    return runEffectWork(() => {
      if (selectedClub) {
        setQuery(selectedClub.name);
        return;
      }
      if (!valueSlug) setQuery("");
    });
  }, [selectedClub, valueSlug]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? clubs.filter((club) => club.name.toLowerCase().includes(q))
      : clubs;
    return filtered.slice(0, 10);
  }, [clubs, query]);

  const activeOptionIndex =
    matches.length === 0 ? 0 : Math.min(activeIndex, matches.length - 1);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectClub = (club) => {
    onChangeSlug(club.slug);
    setQuery(club.name);
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
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectClub(matches[activeOptionIndex]);
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && matches[activeOptionIndex]
            ? `${inputId}-opt-${activeOptionIndex}`
            : undefined
        }
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          onChangeSlug("");
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={`w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 ${clubHubButtonFocusClass}`}
      />
      {open && matches.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {matches.map((club, index) => (
            <li
              key={club.slug}
              id={`${inputId}-opt-${index}`}
              role="option"
              aria-selected={index === activeOptionIndex}
            >
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm text-neutral-900 hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none ${index === activeOptionIndex ? "bg-neutral-50" : ""} ${clubHubButtonFocusClass}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectClub(club)}
              >
                {club.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
