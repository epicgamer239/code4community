import { BRHS_CLUB_HUB_CONFIG } from "@/lib/club-hub/schoolConfig";

/** @typedef {import("@/lib/club-hub/schoolConfig").ClubHubSchoolConfig} ClubHubSchoolConfig */

/** @type {ClubHubSchoolConfig[]} */
let clientSchoolStack = [BRHS_CLUB_HUB_CONFIG];

/** @type {import("async_hooks").AsyncLocalStorage | null} */
let serverStorage = null;

function getServerStorage() {
  if (typeof window !== "undefined") return null;
  if (!serverStorage) {
    // Lazy require so client bundles never pull in async_hooks.
    const { AsyncLocalStorage } = require("node:async_hooks");
    serverStorage = new AsyncLocalStorage();
  }
  return serverStorage;
}

/** @returns {ClubHubSchoolConfig} */
export function getClubHubSchool() {
  if (typeof window === "undefined") {
    const store = getServerStorage()?.getStore();
    return store || BRHS_CLUB_HUB_CONFIG;
  }
  return clientSchoolStack[clientSchoolStack.length - 1] || BRHS_CLUB_HUB_CONFIG;
}

/**
 * Client-only: push active school for Firestore collection names.
 * Pair with {@link popClientClubHubSchool} in the same effect cleanup.
 * @param {ClubHubSchoolConfig} config
 */
export function setClientClubHubSchool(config) {
  clientSchoolStack.push(config || BRHS_CLUB_HUB_CONFIG);
}

/** Client-only: undo the latest {@link setClientClubHubSchool}. */
export function popClientClubHubSchool() {
  if (clientSchoolStack.length > 1) {
    clientSchoolStack.pop();
  }
}

/**
 * Server-only: run work with a school config (safe under concurrent requests).
 * @template T
 * @param {ClubHubSchoolConfig} config
 * @param {() => T | Promise<T>} fn
 * @returns {T | Promise<T>}
 */
export function runWithClubHubSchool(config, fn) {
  const als = getServerStorage();
  if (!als) return fn();
  return als.run(config || BRHS_CLUB_HUB_CONFIG, fn);
}

/**
 * @param {keyof ClubHubSchoolConfig["collections"]} key
 * @param {ClubHubSchoolConfig | null | undefined} [school]
 * @returns {string}
 */
export function clubHubCol(key, school = null) {
  const cols = (school || getClubHubSchool()).collections;
  const name = cols[key];
  if (!name) throw new Error(`Unknown Club Hub collection key: ${key}`);
  return name;
}
