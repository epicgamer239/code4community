import { describe, expect, it } from "vitest";
import { buildClubHubHomeRankings } from "@/lib/club-hub/clubHubEngagementRankings";
import {
  normalizeManualRankingSlugs,
  rankingRowsFromSlugs,
} from "@/lib/club-hub/manualRankings";

describe("manualRankings", () => {
  it("pads and dedupes ranking slugs", () => {
    expect(normalizeManualRankingSlugs(["deca", "deca", "sports-talk"])).toEqual([
      "deca",
      "",
      "sports-talk",
    ]);
    expect(normalizeManualRankingSlugs(["deca"])).toEqual(["deca", "", ""]);
  });

  it("builds named rows from slugs", () => {
    const rows = rankingRowsFromSlugs(["code4community", "", "key-club"]);
    expect(rows[0].name).toBe("Code4Community");
    expect(rows[0].placeholder).toBeUndefined();
    expect(rows[1]).toEqual({ rank: 2, name: "—", clubSlug: "", placeholder: true });
    expect(rows[2].name).toBe("Key Club");
  });

  it("builds home rankings without Coming soon placeholders", () => {
    const cols = buildClubHubHomeRankings(
      [{ rank: 1, name: "DECA", count: 12 }],
      { engagement: ["code4community"], volunteer: [] },
    );
    expect(cols).toHaveLength(3);
    expect(cols[0].title).toBe("Club Size Rankings");
    expect(cols[1].title).toBe("Club Engagement Rankings");
    expect(cols[1].placeholder).toBeUndefined();
    expect(cols[1].rows[0].name).toBe("Code4Community");
    expect(cols[1].rows.some((r) => /coming soon/i.test(r.name))).toBe(false);
    expect(cols[2].rows.every((r) => r.placeholder)).toBe(true);
  });
});
