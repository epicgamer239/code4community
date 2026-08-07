/** Shared tutor service identifiers for Math Lab + Writing Center. */

export const TUTOR_SERVICE = {
  MATH_LAB: "mathlab",
  WRITING_CENTER: "writing-center",
};

export const TUTOR_SERVICE_OPTIONS = [
  { id: TUTOR_SERVICE.MATH_LAB, label: "Math Lab" },
  { id: TUTOR_SERVICE.WRITING_CENTER, label: "Writing Center" },
];

/** @param {unknown} value */
export function normalizeTutorServices(value) {
  const allowed = new Set(Object.values(TUTOR_SERVICE));
  const list = Array.isArray(value) ? value : [];
  const next = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const id = item.trim().toLowerCase();
    if (!allowed.has(id) || next.includes(id)) continue;
    next.push(id);
  }
  return next;
}

/** @param {{ mathLabRole?: string, writingCenterRole?: string, role?: string } | null | undefined} user */
export function isLegacyWritingCenterTutor(user) {
  return (user?.role || "").toLowerCase() === "tutor";
}

/** @param {{ mathLabRole?: string, writingCenterRole?: string, role?: string } | null | undefined} user */
export function hasMathLabTutorAccess(user) {
  return user?.mathLabRole === "tutor";
}

/** @param {{ mathLabRole?: string, writingCenterRole?: string, role?: string } | null | undefined} user */
export function hasWritingCenterTutorAccess(user) {
  return user?.writingCenterRole === "tutor" || isLegacyWritingCenterTutor(user);
}

/** @param {{ mathLabRole?: string, writingCenterRole?: string, role?: string } | null | undefined} user */
export function hasAnyTutorService(user) {
  return hasMathLabTutorAccess(user) || hasWritingCenterTutorAccess(user);
}

/**
 * Services this user currently tutors for (not including teacher/admin elevation).
 * @param {{ mathLabRole?: string, writingCenterRole?: string, role?: string, services?: string[] } | null | undefined} user
 */
export function getTutorServices(user) {
  if (Array.isArray(user?.services) && user.services.length > 0) {
    return normalizeTutorServices(user.services);
  }
  const services = [];
  if (hasMathLabTutorAccess(user)) services.push(TUTOR_SERVICE.MATH_LAB);
  if (hasWritingCenterTutorAccess(user)) services.push(TUTOR_SERVICE.WRITING_CENTER);
  return services;
}

/** @param {string[]} services */
export function tutorServicesLabel(services) {
  const normalized = normalizeTutorServices(services);
  if (normalized.length === 0) return "";
  return TUTOR_SERVICE_OPTIONS.filter((o) => normalized.includes(o.id))
    .map((o) => o.label)
    .join(" · ");
}

/**
 * Profile fields to set for the given tutor services.
 * Clears legacy role=tutor when Writing Center is granted via writingCenterRole.
 * @param {string[]} services
 * @param {{ role?: string }} [existing]
 */
export function tutorServiceProfileUpdate(services, existing = {}) {
  const normalized = normalizeTutorServices(services);
  const role = (existing.role || "student").toLowerCase();
  const keepElevated = role === "admin" || role === "teacher";
  /** @type {Record<string, string>} */
  const update = {
    mathLabRole: normalized.includes(TUTOR_SERVICE.MATH_LAB) ? "tutor" : "",
    writingCenterRole: normalized.includes(TUTOR_SERVICE.WRITING_CENTER) ? "tutor" : "",
  };
  if (!keepElevated && role === "tutor") {
    update.role = "student";
  }
  return update;
}
