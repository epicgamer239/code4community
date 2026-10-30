"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/firebase";
import { normalizeCustomClub, setCustomClubs } from "@/lib/club-hub/customClubStore";
import { setRemovedClubSlugs } from "@/lib/club-hub/removedClubsStore";

export const CLUB_HUB_CUSTOM_CLUBS = "clubHubCustomClubs";
export const CLUB_HUB_REMOVED_CLUBS = "clubHubRemovedClubs";

/** @type {Promise<void> | null} */
let loadPromise = null;
const listeners = new Set();

export async function fetchCustomClubs() {
  if (!firestore) return [];
  const snap = await getDocs(collection(firestore, CLUB_HUB_CUSTOM_CLUBS));
  return snap.docs
    .map((docSnap) => normalizeCustomClub({ ...docSnap.data(), slug: docSnap.id }, docSnap.id))
    .filter(Boolean);
}

export async function fetchRemovedClubSlugs() {
  if (!firestore) return [];
  const snap = await getDocs(collection(firestore, CLUB_HUB_REMOVED_CLUBS));
  return snap.docs.map((docSnap) => docSnap.id);
}

/** @param {{ force?: boolean }} [options] */
export function loadCustomClubs({ force = false } = {}) {
  if (!loadPromise || force) {
    loadPromise = Promise.all([
      fetchCustomClubs(),
      fetchRemovedClubSlugs().catch(() => []),
    ])
      .then(([clubs, removed]) => {
        setCustomClubs(clubs);
        setRemovedClubSlugs(removed);
        for (const listener of listeners) listener();
      })
      .catch((err) => {
        loadPromise = null;
        throw err;
      });
  }
  return loadPromise;
}

/** @returns {{ ready: boolean, version: number }} */
export function useCustomClubs() {
  const [state, setState] = useState({ ready: false, version: 0 });

  useEffect(() => {
    let cancelled = false;
    const bump = () => {
      if (!cancelled) setState((current) => ({ ready: true, version: current.version + 1 }));
    };
    listeners.add(bump);
    loadCustomClubs().then(bump, bump);
    return () => {
      cancelled = true;
      listeners.delete(bump);
    };
  }, []);

  return state;
}
