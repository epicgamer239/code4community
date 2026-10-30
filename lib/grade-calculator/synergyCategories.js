import { CATEGORY_PATTERN, DEFAULT_WEIGHTS } from "@/lib/grade-calculator/constants";

/**
 * @param {Record<string, number>} parsedWeights Weights read from the paste (mutated during parse).
 */
export function createSynergyCategoryHelpers(parsedWeights) {
  const knownCategories = new Set(Object.keys(DEFAULT_WEIGHTS).map((c) => c.toLowerCase()));

  const matchCategory = (s) => {
    const t = s.trim().replace(/\s+/g, " ");
    if (!t) return null;
    if (knownCategories.has(t.toLowerCase()) || CATEGORY_PATTERN.test(t)) {
      const known = Object.keys({ ...DEFAULT_WEIGHTS, ...parsedWeights }).find(
        (c) => c.toLowerCase() === t.toLowerCase(),
      );
      return known || t.replace(/\b\w/g, (ch) => ch.toUpperCase());
    }
    return null;
  };

  const isSynergyCategoryHeaderLine = (s) => !!matchCategory(s.split("\t")[0]);
  const isSynergyScoreMetadataLine = (s) => /^(Raw\s+Score|Percentage)\b/i.test(s.trim());

  const isPlausibleAssignmentTitleLine = (s) => {
    const t = s.trim();
    if (!t || t.length < 3) return false;
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t)) return false;
    if (isSynergyCategoryHeaderLine(t)) return false;
    if (isSynergyScoreMetadataLine(t)) return false;
    if (/\d\s+out\s+of\s+\d/i.test(t)) return false;
    return true;
  };

  return {
    knownCategories,
    matchCategory,
    isSynergyCategoryHeaderLine,
    isSynergyScoreMetadataLine,
    isPlausibleAssignmentTitleLine,
  };
}
