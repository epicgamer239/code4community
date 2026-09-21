/**
 * Club Hub home leaderboard sections.
 * Club Size Rankings use live membership counts; engagement/volunteer are placeholders until metrics exist.
 */

/** @typedef {{ rank: number, name: string, placeholder?: boolean }} RankingRow */
/** @typedef {{ title: string, rows: RankingRow[], placeholder?: boolean }} RankingColumn */

/** @type {RankingColumn[]} */
export const PLACEHOLDER_ENGAGEMENT_COLUMNS = [
  {
    title: "Club Engagement Rankings",
    placeholder: true,
    rows: [
      { rank: 1, name: "Coming soon", placeholder: true },
      { rank: 2, name: "Coming soon", placeholder: true },
      { rank: 3, name: "Coming soon", placeholder: true },
    ],
  },
  {
    title: "Club Volunteer Rankings",
    placeholder: true,
    rows: [
      { rank: 1, name: "Coming soon", placeholder: true },
      { rank: 2, name: "Coming soon", placeholder: true },
      { rank: 3, name: "Coming soon", placeholder: true },
    ],
  },
];

/**
 * @param {Array<{ rank: number, name: string, count?: number }>} sizeRows
 * @returns {RankingColumn[]}
 */
export function buildClubHubHomeRankings(sizeRows) {
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

  return [sizeColumn, ...PLACEHOLDER_ENGAGEMENT_COLUMNS];
}
