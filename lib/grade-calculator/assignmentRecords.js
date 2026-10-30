/**
 * @param {Array<{ date: string, name: string, earned: number }>} parsedAssignments
 */
export function isDuplicateAssignment(parsedAssignments, date, name, earned) {
  return parsedAssignments.some(
    (a) => a.date === date && a.name === name && Math.abs(a.earned - earned) < 0.01,
  );
}

/**
 * @param {Array<object>} parsedAssignments
 * @param {{ date: string, name: string, category: string, earned: number, possible: number }} fields
 */
export function pushAssignmentIfNew(parsedAssignments, fields) {
  const { date, name, category, earned, possible } = fields;
  if (isDuplicateAssignment(parsedAssignments, date, name, earned)) {
    return false;
  }
  parsedAssignments.push({
    id: parsedAssignments.length,
    date,
    name,
    category,
    earned,
    possible,
    originalEarned: earned,
    originalPossible: possible,
  });
  return true;
}
