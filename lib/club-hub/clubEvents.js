import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";

export const CLUB_HUB_EVENTS = "clubHubEvents";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function trimStr(value, max, fallback = "") {
  if (typeof value !== "string") return fallback;
  const t = value.trim();
  if (!t) return fallback;
  return t.slice(0, max);
}

/** @param {unknown} raw */
export function normalizeClubEvent(raw, id = "") {
  if (!raw || typeof raw !== "object") return null;
  const date = trimStr(raw.date, 10);
  if (!DATE_RE.test(date)) return null;
  const title = trimStr(raw.title, 120);
  if (!title) return null;

  return {
    id: id || String(raw.id || ""),
    clubSlug: trimStr(raw.clubSlug, 120),
    clubName: trimStr(raw.clubName, 120),
    title,
    description: trimStr(raw.description, 500, ""),
    date,
    time: trimStr(raw.time, 40, "TBD"),
    location: trimStr(raw.location, 120, ""),
    createdBy: trimStr(raw.createdBy, 128, ""),
    updatedBy: trimStr(raw.updatedBy, 128, ""),
  };
}

/** @param {import("./clubEvents.js").NormalizedClubEvent[]} events */
export function groupEventsByDate(events) {
  /** @type {Record<string, import("./clubEvents.js").CalendarEventBlock[]>} */
  const map = {};
  for (const ev of events) {
    if (!map[ev.date]) map[ev.date] = [];
    map[ev.date].push(toCalendarBlock(ev));
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => a.time.localeCompare(b.time));
  }
  return map;
}

/** @param {ReturnType<typeof normalizeClubEvent>} ev */
export function toCalendarBlock(ev) {
  const noteParts = [ev.clubName, ev.description].filter(Boolean);
  return {
    time: ev.time || "TBD",
    title: ev.title,
    location: ev.location || "TBD",
    note: noteParts.join(" · "),
    description: ev.description || "",
    clubName: ev.clubName || "",
    clubSlug: ev.clubSlug || "",
    eventId: ev.id,
  };
}

/**
 * @param {string} startDate YYYY-MM-DD
 * @param {string} endDate YYYY-MM-DD
 */
export async function fetchClubEventsInRange(startDate, endDate) {
  if (!firestore) return [];
  const snap = await getDocs(
    query(
      collection(firestore, CLUB_HUB_EVENTS),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "asc"),
    ),
  );
  return snap.docs
    .map((d) => normalizeClubEvent({ ...d.data(), id: d.id }))
    .filter(Boolean);
}

function todayDateKey() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function fetchAllUpcomingClubEvents() {
  if (!firestore) return [];
  const snap = await getDocs(
    query(
      collection(firestore, CLUB_HUB_EVENTS),
      where("date", ">=", todayDateKey()),
      orderBy("date", "asc"),
    ),
  );
  return snap.docs
    .map((d) => normalizeClubEvent({ ...d.data(), id: d.id }))
    .filter(Boolean);
}

/** @param {string} clubSlug */
export async function fetchClubEventsForClub(clubSlug) {
  if (!firestore || !clubSlug) return [];
  const snap = await getDocs(
    query(
      collection(firestore, CLUB_HUB_EVENTS),
      where("clubSlug", "==", clubSlug),
      orderBy("date", "asc"),
    ),
  );
  return snap.docs
    .map((d) => normalizeClubEvent({ ...d.data(), id: d.id }))
    .filter(Boolean);
}

/**
 * @param {{
 *   clubSlug: string,
 *   clubName: string,
 *   title: string,
 *   description?: string,
 *   date: string,
 *   time?: string,
 *   location?: string,
 *   adminUid: string,
 * }} args
 */
export async function createClubEvent(args) {
  if (!firestore) throw new Error("Firebase is not configured.");
  const payload = normalizeClubEvent({
    ...args,
    createdBy: args.adminUid,
    updatedBy: args.adminUid,
  });
  if (!payload?.clubSlug) throw new Error("Missing club slug.");
  if (!DATE_RE.test(args.date)) throw new Error("Enter a valid date.");

  assertClientRateLimit("clubHubEventWrite", args.adminUid);

  const ref = await addDoc(collection(firestore, CLUB_HUB_EVENTS), {
    clubSlug: payload.clubSlug,
    clubName: payload.clubName,
    title: payload.title,
    description: payload.description,
    date: payload.date,
    time: payload.time,
    location: payload.location,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: args.adminUid,
    updatedBy: args.adminUid,
  });

  return { ...payload, id: ref.id };
}

/**
 * @param {{
 *   eventId: string,
 *   clubSlug: string,
 *   clubName: string,
 *   title: string,
 *   description?: string,
 *   date: string,
 *   time?: string,
 *   location?: string,
 *   adminUid: string,
 * }} args
 */
export async function updateClubEvent(args) {
  if (!firestore) throw new Error("Firebase is not configured.");
  if (!args.eventId) throw new Error("Missing event id.");

  const payload = normalizeClubEvent({
    ...args,
    updatedBy: args.adminUid,
  });
  if (!payload) throw new Error("Invalid event details.");
  if (!DATE_RE.test(args.date)) throw new Error("Enter a valid date.");

  assertClientRateLimit("clubHubEventWrite", args.adminUid);

  await updateDoc(doc(firestore, CLUB_HUB_EVENTS, args.eventId), {
    clubSlug: payload.clubSlug,
    clubName: payload.clubName,
    title: payload.title,
    description: payload.description,
    date: payload.date,
    time: payload.time,
    location: payload.location,
    updatedAt: serverTimestamp(),
    updatedBy: args.adminUid,
  });

  return { ...payload, id: args.eventId };
}

/** @param {{ eventId: string, adminUid: string }} args */
export async function deleteClubEvent({ eventId, adminUid }) {
  if (!firestore) throw new Error("Firebase is not configured.");
  if (!eventId) throw new Error("Missing event id.");
  assertClientRateLimit("clubHubEventWrite", adminUid);
  await deleteDoc(doc(firestore, CLUB_HUB_EVENTS, eventId));
}

/** @param {string} dateKey YYYY-MM-DD */
export function formatEventDateLabel(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** @param {string} dateKey */
export function isPastDateKey(dateKey) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt < today;
}
