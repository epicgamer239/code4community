import {
  MANUAL_RANKING_TITLES,
  rankingRowsFromSlugs,
} from "@/lib/club-hub/manualRankings";

/** @typedef {{ rank: number, name: string, placeholder?: boolean, clubSlug?: string }} RankingRow */
/** @typedef {{ title: string, rows: RankingRow[], placeholder?: boolean }} RankingColumn */

/**
 * @param {Array<{ rank: number, name: string, count?: number }>} sizeRows
 * @param {{ engagement?: string[], volunteer?: string[] }} [manual]
 * @returns {RankingColumn[]}
 */
export function buildClubHubHomeRankings(sizeRows, manual = {}) {
  const sizeColumn = {
    title: "Club Size Rankings",
    rows:
      sizeRows.length > 0
        ? sizeRows.map((row) => ({
            rank: row.rank,
            name: row.count != null ? `${row.name} (${row.count})` : row.name,
          }))
        : [
            { rank: 1, name: "No memberships yet", placeholder: true },
            { rank: 2, name: "—", placeholder: true },
            { rank: 3, name: "—", placeholder: true },
          ],
  };

  const engagementColumn = {
    title: MANUAL_RANKING_TITLES.engagement,
    rows: rankingRowsFromSlugs(manual.engagement || []),
  };

  const volunteerColumn = {
    title: MANUAL_RANKING_TITLES.volunteer,
    rows: rankingRowsFromSlugs(manual.volunteer || []),
  };

  return [sizeColumn, engagementColumn, volunteerColumn];
}
