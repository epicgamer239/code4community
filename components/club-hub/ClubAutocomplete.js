"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { runEffectWork } from "@/hooks/runEffectWork";

/**
 * @param {{
 *   clubs: { slug: string, name: string }[],
 *   valueSlug: string,
 *   onChangeSlug: (slug: string) => void,
 *   id?: string,
 *   placeholder?: string,
 *   className?: string,
 * }} props
 */
export default function ClubAutocomplete({
  clubs,
  valueSlug,
  onChangeSlug,
  id,
  placeholder = "Type club name…",
  className = "",
}) {
  const wrapRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

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

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          onChangeSlug("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
          {matches.map((club) => (
            <li key={club.slug}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-neutral-900 hover:bg-neutral-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChangeSlug(club.slug);
                  setQuery(club.name);
                  setOpen(false);
                }}
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
