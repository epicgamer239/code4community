/**
 * @param {string} text
 * @returns {{ earned: number, possible: number } | null}
 */
export function matchOutOfScore(text) {
  const outOfMatch = text.match(/(\d+\.?\d*)\s+out\s+of\s+(\d+\.?\d*)/i);
  if (!outOfMatch) return null;
  return {
    earned: parseFloat(outOfMatch[1]),
    possible: parseFloat(outOfMatch[2]),
  };
}

/**
 * Update earned/possible from a single Synergy line (main assignment scan).
 *
 * @param {string} nextLine
 * @param {{ foundScore: boolean, earned: number, possible: number }} scoreState
 * @returns {{ foundScore: boolean, earned: number, possible: number }}
 */
export function extractScoreFromLine(nextLine, scoreState) {
  let { foundScore, earned, possible } = scoreState;

  const rawScoreMatch = nextLine.match(/(?:Raw\s+Score|Percentage)\s+(\d+\.?\d*)\/(\d+\.?\d*)/i);
  if (rawScoreMatch) {
    earned = parseFloat(rawScoreMatch[1]);
    possible = parseFloat(rawScoreMatch[2]);
    foundScore = true;
  }
  if (!foundScore) {
    const outOf = matchOutOfScore(nextLine);
    if (outOf) {
      earned = outOf.earned;
      possible = outOf.possible;
      foundScore = true;
    }

    if (!foundScore) {
      const scoreMatch = nextLine.match(/(\d+\.?\d*)\/(\d+\.?\d*)/);
      if (scoreMatch) {
        const num1 = parseFloat(scoreMatch[1]);
        const num2 = parseFloat(scoreMatch[2]);
        if (num2 > 10 && num2 < 10000 && num1 <= num2) {
          const beforeMatch = nextLine.substring(0, scoreMatch.index);
          if (!beforeMatch.match(/\d{2}\/\d{2}$/)) {
            earned = num1;
            possible = num2;
            foundScore = true;
          }
        }
      }
    }

    if (!foundScore) {
      const tabParts = nextLine.split("\t");
      if (tabParts.length >= 2) {
        const num1 = parseFloat(tabParts[0].trim());
        const num2 = parseFloat(tabParts[1].trim());
        if (!isNaN(num1) && !isNaN(num2) && num2 > 0 && num1 >= 0 && num1 <= num2 && num2 < 10000) {
          earned = num1;
          possible = num2;
          foundScore = true;
        }
      }
    }
  }

  return { foundScore, earned, possible };
}
