"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { clubHubCol } from "@/lib/club-hub/activeSchool";
import {
  normalizeClubMeetingDay,
  setMeetingDayOverrides,
} from "@/lib/club-hub/clubDirectorySections";

export const CLUB_HUB_MEETING_DAYS_COLLECTION = "clubHubMeetingDays";

/** @returns {Promise<Record<string, import("@/lib/club-hub/clubDirectorySections").ClubMeetingDay>>} */
export async function fetchAllMeetingDayOverrides() {
  if (!firestore) return {};
  const snap = await getDocs(collection(firestore, clubHubCol("meetingDays")));
  /** @type {Record<string, import("@/lib/club-hub/clubDirectorySections").ClubMeetingDay>} */
  const map = {};
  for (const d of snap.docs) {
    const day = normalizeClubMeetingDay(d.data()?.meetingDay);
    if (day) map[d.id] = day;
  }
  return map;
}

/** @type {Promise<void> | null} */
let loadPromise = null;
const listeners = new Set();

/**
 * Load admin meeting-day overrides into clubDirectorySections (cached per page load).
 * @param {{ force?: boolean }} [options]
 */
export function loadMeetingDayOverrides({ force = false } = {}) {
  if (!loadPromise || force) {
    loadPromise = fetchAllMeetingDayOverrides()
      .then((map) => {
        setMeetingDayOverrides(map);
        for (const listener of listeners) listener();
      })
      .catch((err) => {
        loadPromise = null;
        throw err;
      });
  }
  return loadPromise;
}

/**
 * Re-renders the caller once admin meeting-day overrides are loaded or change.
 * @returns {{ ready: boolean, version: number }}
 */
export function useMeetingDayOverrides() {
  const [state, setState] = useState({ ready: false, version: 0 });

  useEffect(() => {
    let cancelled = false;
    const bump = () => {
      if (!cancelled) setState((s) => ({ ready: true, version: s.version + 1 }));
    };
    listeners.add(bump);
    loadMeetingDayOverrides().then(bump, bump);
    return () => {
      cancelled = true;
      listeners.delete(bump);
    };
  }, []);

  return state;
}

/**
 * @param {import("firebase/auth").User} user
 * @param {Record<string, unknown>} body
 */
async function postMeetingDayChange(user, body) {
  if (!user?.getIdToken) throw new Error("Not signed in.");
  assertClientRateLimit("clubHubPageWrite", user.uid);
  const token = await user.getIdToken();
  const res = await fetch("/api/club-hub/admin/meeting-days", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not update meeting day.");
  await loadMeetingDayOverrides({ force: true });
  return data;
}

/**
 * @param {{
 *   slug: string,
 *   clubName: string,
 *   meetingDay: import("@/lib/club-hub/clubDirectorySections").ClubMeetingDay,
 *   user: import("firebase/auth").User,
 * }} args
 */
export async function saveClubMeetingDay({ slug, clubName, meetingDay, user }) {
  if (!slug) throw new Error("Missing club slug.");
  const day = normalizeClubMeetingDay(meetingDay);
  if (!day) throw new Error("Pick Gold, Maroon, Gold & Maroon, or General.");
  return postMeetingDayChange(user, {
    slug,
    clubName: String(clubName || "").trim().slice(0, 120),
    meetingDay: day,
  });
}

/** @param {{ slug: string, user: import("firebase/auth").User }} args */
export async function resetClubMeetingDay({ slug, user }) {
  if (!slug) throw new Error("Missing club slug.");
  return postMeetingDayChange(user, { slug, reset: true });
}
