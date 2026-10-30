/** @type {Set<string>} */
let removedClubSlugs = new Set();

/** @param {Iterable<string> | null | undefined} slugs */
export function setRemovedClubSlugs(slugs) {
  const next = new Set();
  for (const raw of slugs || []) {
    const slug = String(raw || "").trim();
    if (slug) next.add(slug);
  }
  removedClubSlugs = next;
}

/** @returns {Set<string>} */
export function getRemovedClubSlugs() {
  return removedClubSlugs;
}

/** @param {string} slug */
export function isClubRemoved(slug) {
  const id = String(slug || "").trim();
  return Boolean(id) && removedClubSlugs.has(id);
}
