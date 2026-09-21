import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, storage } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { getEffectiveSponsorsForSlug } from "@/lib/club-hub/clubSponsors";

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
  headerImageUrl: "",
};

export const CLUB_HEADER_MAX_BYTES = 5 * 1024 * 1024;
export const DEFAULT_CLUB_HEADER_IMAGE = "/brand/brh.png";

export function validateClubHeaderFile(file) {
  if (!file) return "Select an image file.";
  const name = (file.name || "").toLowerCase();
  const okType =
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    /\.(jpe?g|png|webp)$/.test(name);
  if (!okType) return "Use a JPG, PNG, or WebP image.";
  if (file.size > CLUB_HEADER_MAX_BYTES) return "Image must be under 5 MB.";
  return "";
}

function headerExtFromFile(file) {
  const name = (file.name || "").toLowerCase();
  if (file.type === "image/png" || name.endsWith(".png")) return "png";
  if (file.type === "image/webp" || name.endsWith(".webp")) return "webp";
  return "jpg";
}

/**
 * Upload a club page header banner image.
 * @param {string} slug
 * @param {File} file
 * @param {string} adminUid
 * @returns {Promise<string>}
 */
export async function uploadClubHeaderImage(slug, file, adminUid) {
  if (!storage) throw new Error("Firebase Storage is not configured.");
  if (!slug) throw new Error("Missing club slug.");
  if (!adminUid) throw new Error("Not signed in.");

  const validation = validateClubHeaderFile(file);
  if (validation) throw new Error(validation);

  assertClientRateLimit("clubHubHeaderUpload", adminUid);

  const ext = headerExtFromFile(file);
  const storagePath = `club-hub/headers/${slug}/header.${ext}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
    customMetadata: { slug, slot: "header", uploadedBy: adminUid },
  });

  return getDownloadURL(storageRef);
}

function trimStr(value, max, fallback = "") {
  if (typeof value !== "string") return fallback;
  const t = value.trim();
  if (!t) return fallback;
  return t.slice(0, max);
}

/**
 * Sponsor-derived defaults for a club slug (directory + Firestore overrides).
 * @param {string} slug
 * @param {Record<string, { name: string, email: string }[]> | null | undefined} [overridesBySlug]
 */
export function getSponsorDefaultsForSlug(slug, overridesBySlug = null) {
  const sponsors = getEffectiveSponsorsForSlug(slug, overridesBySlug);
  return {
    facultyAdvisor: sponsors.map((s) => s.name).filter(Boolean).join(", ") || "",
    contactEmails: sponsors.map((s) => s.email).filter(Boolean).join("\n") || "",
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} raw
 * @param {string} slug
 * @param {Record<string, { name: string, email: string }[]> | null | undefined} [overridesBySlug]
 */
export function normalizeClubPageInfo(raw, slug, overridesBySlug = null) {
  const sponsorDefaults = getSponsorDefaultsForSlug(slug, overridesBySlug);

  return {
    about: trimStr(raw?.about, 4000, DEFAULT_CLUB_PAGE_INFO.about),
    resourcesUrl: trimStr(raw?.resourcesUrl, 500, ""),
    resourcesLabel: trimStr(
      raw?.resourcesLabel,
      80,
      DEFAULT_CLUB_PAGE_INFO.resourcesLabel,
    ),
    clubLeaders: trimStr(raw?.clubLeaders, 500, ""),
    facultyAdvisor: trimStr(raw?.facultyAdvisor, 500, sponsorDefaults.facultyAdvisor),
    contactEmails: trimStr(raw?.contactEmails, 1000, sponsorDefaults.contactEmails),
    meetingFrequency: trimStr(
      raw?.meetingFrequency ?? raw?.meetingWhen,
      200,
      "",
    ),
    memberCount: trimStr(raw?.memberCount, 40, ""),
    headerImageUrl: trimStr(raw?.headerImageUrl, 2000, ""),
  };
}

/**
 * @param {string} slug
 * @param {Record<string, { name: string, email: string }[]> | null | undefined} [overridesBySlug]
 */
export async function fetchClubPageInfo(slug, overridesBySlug = null) {
  if (!firestore || !slug) return normalizeClubPageInfo(null, slug, overridesBySlug);
  const snap = await getDoc(doc(firestore, CLUB_HUB_PAGES, slug));
  if (!snap.exists()) return normalizeClubPageInfo(null, slug, overridesBySlug);
  return normalizeClubPageInfo(snap.data(), slug, overridesBySlug);
}

/**
 * @param {{
 *   slug: string,
 *   info: Record<string, string>,
 *   adminUid: string,
 *   overridesBySlug?: Record<string, { name: string, email: string }[]> | null,
 * }} args
 */
export async function saveClubPageInfo({ slug, info, adminUid, overridesBySlug = null }) {
  if (!firestore) throw new Error("Firebase is not configured.");
  if (!slug) throw new Error("Missing club slug.");
  if (!adminUid) throw new Error("Not signed in.");

  assertClientRateLimit("clubHubPageWrite", adminUid);

  const normalized = normalizeClubPageInfo(info, slug, overridesBySlug);

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
