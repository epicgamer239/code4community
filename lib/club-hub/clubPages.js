import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";

export const CLUB_HUB_PAGES = "clubHubPages";

export const DEFAULT_CLUB_PAGE_INFO = {
  about:
    "Club details coming soon. Check back for a description, meeting times, and how to join.",
  resourcesUrl: "",
  resourcesLabel: "Club resources / public drive",
  clubLeaders: "",
  facultyAdvisor: "",
  contactEmails: "",
  meetingFrequency: "",
  memberCount: "",
  activities: "",
};

function trimStr(value, max, fallback = "") {
  if (typeof value !== "string") return fallback;
  const t = value.trim();
  if (!t) return fallback;
  return t.slice(0, max);
}

/**
 * @param {Record<string, unknown> | null | undefined} raw
 * @param {{ sponsors?: { name: string, email: string }[] } | null} [club]
 */
export function normalizeClubPageInfo(raw, club = null) {
  const sponsorNames =
    club?.sponsors?.map((s) => s.name).filter(Boolean).join(", ") || "";
  const sponsorEmails =
    club?.sponsors?.map((s) => s.email).filter(Boolean).join("\n") || "";

  return {
    about: trimStr(raw?.about, 4000, DEFAULT_CLUB_PAGE_INFO.about),
    resourcesUrl: trimStr(raw?.resourcesUrl, 500, ""),
    resourcesLabel: trimStr(
      raw?.resourcesLabel,
      80,
      DEFAULT_CLUB_PAGE_INFO.resourcesLabel,
    ),
    clubLeaders: trimStr(raw?.clubLeaders, 500, ""),
    facultyAdvisor: trimStr(raw?.facultyAdvisor, 500, sponsorNames),
    contactEmails: trimStr(raw?.contactEmails, 1000, sponsorEmails),
    meetingFrequency: trimStr(
      raw?.meetingFrequency ?? raw?.meetingWhen,
      200,
      "",
    ),
    memberCount: trimStr(raw?.memberCount, 40, ""),
    activities: trimStr(raw?.activities, 4000, ""),
  };
}

/**
 * @param {string} slug
 * @param {{ sponsors?: { name: string, email: string }[] } | null} [club]
 */
export async function fetchClubPageInfo(slug, club = null) {
  if (!firestore || !slug) return normalizeClubPageInfo(null, club);
  const snap = await getDoc(doc(firestore, CLUB_HUB_PAGES, slug));
  if (!snap.exists()) return normalizeClubPageInfo(null, club);
  return normalizeClubPageInfo(snap.data(), club);
}

/**
 * @param {{
 *   slug: string,
 *   info: Record<string, string>,
 *   adminUid: string,
 *   club?: { sponsors?: { name: string, email: string }[] } | null,
 * }} args
 */
export async function saveClubPageInfo({ slug, info, adminUid, club = null }) {
  if (!firestore) throw new Error("Firebase is not configured.");
  if (!slug) throw new Error("Missing club slug.");
  if (!adminUid) throw new Error("Not signed in.");

  assertClientRateLimit("clubHubPageWrite", adminUid);

  const normalized = normalizeClubPageInfo(info, club);

  await setDoc(
    doc(firestore, CLUB_HUB_PAGES, slug),
    {
      slug,
      ...normalized,
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    },
    { merge: true },
  );

  return normalized;
}
