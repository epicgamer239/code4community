import { pushAssignmentIfNew } from "@/lib/grade-calculator/assignmentRecords";
import { NAVIGATION_ITEMS } from "@/lib/grade-calculator/constants";
import { extractScoreFromLine, matchOutOfScore } from "@/lib/grade-calculator/extractScore";
import { createSynergyCategoryHelpers } from "@/lib/grade-calculator/synergyCategories";

/**
 * Parse pasted Synergy gradebook text into course metadata, assignments, and category weights.
 *
 * @param {string} text
 */
export function parseGradebook(text) {
  const lines = text.split("\n").filter((line) => line.trim());
  let parsedCourseName = "";
  let parsedCurrentGrade = "";
  let parsedCurrentPercent = 0;
  const parsedAssignments = [];
  const parsedWeights = {};

  const {
    knownCategories,
    matchCategory,
    isPlausibleAssignmentTitleLine,
  } = createSynergyCategoryHelpers(parsedWeights);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (i < 20) {
      const gradeMatch = line.match(/([A-F][+-]?)\s*(\d+)%/);
      if (gradeMatch && !parsedCurrentGrade) {
        parsedCurrentGrade = gradeMatch[1];
        parsedCurrentPercent = parseInt(gradeMatch[2], 10);
      }
    }

    if (line.includes("Marking Period") && i > 0) {
      parsedCourseName = lines[i - 1].trim();
    }
  }

  let foundSummary = false;
  let weightColumn = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line)) continue;

    if (line.includes("Grade Calculation Summary")) {
      foundSummary = true;
      continue;
    }
    if (line.includes("Assignments")) foundSummary = false;

    const parts = line.split(/\t|\s{2,}/).map((p) => p.trim()).filter(Boolean);
    const headerIndex = parts.findIndex((p) => /^(weight|% of grade)$/i.test(p));
    if (headerIndex > 0) {
      weightColumn = headerIndex;
      continue;
    }
    if (parts.length < 2 || /TOTAL/i.test(parts[0])) continue;

    const categoryName = matchCategory(parts[0]) || (foundSummary ? parts[0] : null);
    if (!categoryName) continue;

    const weightCell = weightColumn > 0 ? parts[weightColumn] : parts.slice(1).find((p) => /%$/.test(p));
    const weightMatch = weightCell && weightCell.match(/^(\d+(?:\.\d+)?)%$/);
    if (weightMatch) {
      parsedWeights[categoryName] = parseFloat(weightMatch[1]);
      knownCategories.add(categoryName.toLowerCase());
    }
  }

  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
    const line = lines[i];
    const gradeMatch = line.match(/([A-F][+-]?)\s*\((\d+)%\)/);
    if (gradeMatch) {
      parsedCurrentGrade = gradeMatch[1];
      parsedCurrentPercent = parseInt(gradeMatch[2], 10);
      break;
    }
  }

  let assignmentsStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Assignments") || lines[i].includes("Data grid")) {
      assignmentsStartIndex = i;
      break;
    }
  }

  if (assignmentsStartIndex >= 0) {
    let i = assignmentsStartIndex;

    while (i < lines.length) {
      const line = lines[i].trim();
      const rawLine = lines[i];
      const dateMatch =
        line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/) ||
        rawLine.match(/^[\s\t]*(\d{1,2}\/\d{1,2}\/\d{2,4})/);

      if (dateMatch) {
        const date = dateMatch[1];
        let assignmentName = "";
        let category = "Other";
        let earned = 0;
        let possible = 0;
        let foundScore = false;

        let j = i + 1;
        let nameFound = false;
        let categoryFound = false;
        let shouldBreak = false;

        while (j < Math.min(i + 15, lines.length) && !shouldBreak) {
          const nextLine = lines[j].trim();

          if (!nextLine) {
            j++;
            continue;
          }

          if (nextLine.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
            if (nameFound || categoryFound || foundScore) {
              shouldBreak = true;
              break;
            }
          }

          if (NAVIGATION_ITEMS.includes(nextLine.replace(/^(gs\s+)?icon\s+/i, ""))) {
            j++;
            continue;
          }

          if (
            nextLine.includes("Not For Grading") ||
            nextLine.includes("(Not For Grading)") ||
            nextLine.includes("Not Due") ||
            nextLine.includes("Not Graded")
          ) {
            shouldBreak = true;
            break;
          }

          if (nextLine.includes("Diagnostic Formative")) {
            shouldBreak = true;
            break;
          }

          if (!nameFound && isPlausibleAssignmentTitleLine(nextLine)) {
            const tabParts = nextLine.split("\t");
            if (tabParts.length > 0) {
              const potentialName = tabParts[0].trim();
              if (
                potentialName &&
                potentialName.length > 2 &&
                !potentialName.match(/^\d+$/) &&
                !potentialName.match(/^\d+\.?\d*\/\d+\.?\d*$/) &&
                !potentialName.match(/out of/i)
              ) {
                assignmentName = potentialName;
                nameFound = true;
              }
            } else if (
              nextLine.length > 2 &&
              !nextLine.match(/^\d+\.?\d*\/\d+\.?\d*$/) &&
              !nextLine.match(/out of/i) &&
              !nextLine.match(/^\d+$/)
            ) {
              assignmentName = nextLine;
              nameFound = true;
            }
          }

          if (!categoryFound) {
            const matched = nextLine.split("\t").map(matchCategory).find(Boolean);
            if (matched) {
              category = matched;
              categoryFound = true;
            }
          }

          ({ foundScore, earned, possible } = extractScoreFromLine(nextLine, {
            foundScore,
            earned,
            possible,
          }));

          j++;
        }

        if (foundScore && possible > 0) {
          if (!assignmentName && category !== "Other") {
            for (let k = Math.max(0, i - 3); k < i; k++) {
              const prevLine = lines[k].trim();
              if (prevLine && isPlausibleAssignmentTitleLine(prevLine)) {
                assignmentName = prevLine.split("\t")[0].trim();
                if (assignmentName && !NAVIGATION_ITEMS.includes(assignmentName)) {
                  break;
                }
              }
            }
          }

          if (assignmentName && assignmentName.length < 3 && category === "Other") {
            i = shouldBreak ? j - 1 : j;
            continue;
          }

          if (!assignmentName) {
            assignmentName = `Assignment ${parsedAssignments.length + 1}`;
          }

          pushAssignmentIfNew(parsedAssignments, {
            date,
            name: assignmentName,
            category,
            earned,
            possible,
          });

          i = j - 1;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }
  } else {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const dateMatch = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/);

      if (dateMatch) {
        const date = dateMatch[1];
        const contextLines = lines.slice(i, Math.min(i + 10, lines.length)).join("\n");

        if (contextLines.includes("Grade Calculation Summary")) {
          continue;
        }

        const outOf = matchOutOfScore(contextLines);
        if (outOf) {
          const { earned, possible } = outOf;

          let category = "Other";
          for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
            if (/^\s*\d{1,2}\/\d{1,2}\/\d{2,4}/.test(lines[j])) break;
            const matched = lines[j].split("\t").map(matchCategory).find(Boolean);
            if (matched) {
              category = matched;
              break;
            }
          }

          if (
            contextLines.includes("Diagnostic Formative") ||
            contextLines.includes("Not For Grading") ||
            contextLines.includes("Not Due") ||
            contextLines.includes("Not Graded")
          ) {
            continue;
          }

          let assignmentName = "";
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const nextLine = lines[j].trim();
            if (
              nextLine &&
              isPlausibleAssignmentTitleLine(nextLine) &&
              !nextLine.match(/out of/i) &&
              nextLine.length > 2
            ) {
              assignmentName = nextLine.split("\t")[0].trim();
              break;
            }
          }

          if (assignmentName && !NAVIGATION_ITEMS.includes(assignmentName) && category !== "Other") {
            pushAssignmentIfNew(parsedAssignments, {
              date,
              name: assignmentName,
              category,
              earned,
              possible,
            });
          }
        }
      }
    }
  }

  if (!parsedCourseName) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("Grade Book") && i + 1 < lines.length) {
        parsedCourseName = lines[i + 1].trim();
        break;
      }
    }
  }

  return {
    courseName: parsedCourseName || "Unknown Course",
    currentGrade: parsedCurrentGrade,
    currentPercent: parsedCurrentPercent,
    assignments: parsedAssignments,
    weights: parsedWeights,
  };
}
