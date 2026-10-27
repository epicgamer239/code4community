"use client";
import { useState, useEffect, useLayoutEffect } from "react";
import { AppPageLayout } from "@/components/common/AppPageLayout";
import { useIsClient } from "@/hooks/useIsClient";
import { useRunEffect } from "@/hooks/useRunEffect";

// LCPS secondary weighting; Synergy's chart view doesn't copy as text, so this is usually what applies.
const DEFAULT_WEIGHTS = {
  "Major Summative": 80,
  "Minor Summative": 10,
  "Graded Formative": 10,
  "Formative Assessment": 10,
  "Extra Credit": 0,
  "Other": 0
};

// Synergy category names vary by school ("Graded Formative" vs "Formative Assessment", etc.).
const CATEGORY_PATTERN = /^((Major|Minor|Graded|Diagnostic)\s+(Summative|Formative)|(Formative|Summative)\s+Assessments?)$/i;

const toNumber = (value) => (value === "" ? 0 : (value || 0));

// Points-based within each category, then weighted across categories that have graded work.
const calculateGrade = (assignmentsToCalculate, weights, useWeighted) => {
  if (assignmentsToCalculate.length === 0) return 0;

  const extraCreditTotal = assignmentsToCalculate
    .filter(a => a.category === "Extra Credit")
    .reduce((sum, a) => sum + toNumber(a.earned), 0);
  const regularAssignments = assignmentsToCalculate.filter(a => a.category !== "Extra Credit");

  if (!useWeighted) {
    const totalEarned = regularAssignments.reduce((sum, a) => sum + toNumber(a.earned), 0);
    const totalPossible = regularAssignments.reduce((sum, a) => sum + toNumber(a.possible), 0);
    const baseGrade = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
    return baseGrade + extraCreditTotal;
  }

  const categoryGroups = {};
  regularAssignments.forEach(a => {
    if (!categoryGroups[a.category]) categoryGroups[a.category] = { earned: 0, possible: 0 };
    categoryGroups[a.category].earned += toNumber(a.earned);
    categoryGroups[a.category].possible += toNumber(a.possible);
  });

  let totalWeightedScore = 0;
  let totalWeight = 0;
  Object.keys(categoryGroups).forEach(category => {
    const { earned, possible } = categoryGroups[category];
    const weight = Number(weights[category]) || 0;
    if (possible > 0 && weight > 0) {
      totalWeightedScore += (earned / possible) * 100 * weight;
      totalWeight += weight;
    }
  });

  const baseGrade = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  return baseGrade + extraCreditTotal;
};

export default function GradeCalculator() {
  useLayoutEffect(() => {
    document.title = "Code4Community | Grade Calculator";
  }, []);
  
  const [pastedText, setPastedText] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [originalAssignments, setOriginalAssignments] = useState([]);
  const [courseName, setCourseName] = useState("");
  const [reportedGrade, setReportedGrade] = useState("");
  const [reportedPercent, setReportedPercent] = useState(0);
  const [categoryWeights, setCategoryWeights] = useState(DEFAULT_WEIGHTS);
  const [useWeightedGrading, setUseWeightedGrading] = useState(true);
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showWeightPlanModal, setShowWeightPlanModal] = useState(false);
  const isClient = useIsClient();
  // A plan key, "Other" (custom), or "Gradebook" when weights were read from the paste
  const [selectedWeightPlan, setSelectedWeightPlan] = useState("80/10/10");
  const [customWeights, setCustomWeights] = useState({
    "Major Summative": 80,
    "Minor Summative": 10,
    "Graded Formative": 10
  });

  const WEIGHT_PLANS = {
    "50/40/10": {
      name: "50/40/10",
      weights: { "Major Summative": 50, "Minor Summative": 40, "Graded Formative": 10 },
      description: "Major assessments 50%, Minor assessments 40%, Formatives 10%"
    },
    "60/30/10": {
      name: "60/30/10",
      weights: { "Major Summative": 60, "Minor Summative": 30, "Graded Formative": 10 },
      description: "Major assessments 60%, Minor assessments 30%, Formatives 10%"
    },
    "80/10/10": {
      name: "80/10/10",
      weights: { "Major Summative": 80, "Minor Summative": 10, "Graded Formative": 10 },
      description: "LCPS secondary default: Major assessments 80%, Minor assessments 10%, Formatives 10%"
    },
  };

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterMenu && !event.target.closest('.filter-menu-container')) {
        setShowFilterMenu(false);
      }
    };

    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilterMenu]);

  useRunEffect(() => {
    setShowWeightPlanModal(true);
  }, []);


  const parseGradebook = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    let parsedCourseName = "";
    let parsedCurrentGrade = "";
    let parsedCurrentPercent = 0;
    const parsedAssignments = [];
    const parsedWeights = {};
    
    // Common navigation items to filter out
    const navigationItems = ['Home', 'Synergy', 'Mail', 'Calendar', 'Attendance', 'Class Schedule', 
                            'Course History', 'Grade Book', 'MTSS', 'School Information', 
                            'Student Info', 'Test History', 'Documents', 'Totals'];

    // Category names come from the built-in list, the common Synergy patterns, and any weights row in the paste.
    const knownCategories = new Set(Object.keys(DEFAULT_WEIGHTS).map(c => c.toLowerCase()));
    const matchCategory = (s) => {
      const t = s.trim().replace(/\s+/g, " ");
      if (!t) return null;
      if (knownCategories.has(t.toLowerCase()) || CATEGORY_PATTERN.test(t)) {
        const known = Object.keys({ ...DEFAULT_WEIGHTS, ...parsedWeights }).find(c => c.toLowerCase() === t.toLowerCase());
        return known || t.replace(/\b\w/g, ch => ch.toUpperCase());
      }
      return null;
    };
    // Synergy uses lines like "Major Summative" as categories but assignment titles can include "Summative" (e.g. "Summative Polar").
    const isSynergyCategoryHeaderLine = (s) => !!matchCategory(s.split("\t")[0]);
    const isSynergyScoreMetadataLine = (s) =>
      /^(Raw\s+Score|Percentage)\b/i.test(s.trim());
    const isPlausibleAssignmentTitleLine = (s) => {
      const t = s.trim();
      if (!t || t.length < 3) return false;
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t)) return false;
      if (isSynergyCategoryHeaderLine(t)) return false;
      if (isSynergyScoreMetadataLine(t)) return false;
      if (/\d\s+out\s+of\s+\d/i.test(t)) return false;
      return true;
    };

    // Find course name and overall grade (appears early in the text)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for overall grade like "A- (91%)" or "A+ (100%)"
      // Try to find it in the header area
      if (i < 20) {
        const gradeMatch = line.match(/([A-F][+-]?)\s*(\d+)%/);
        if (gradeMatch && !parsedCurrentGrade) {
          parsedCurrentGrade = gradeMatch[1];
          parsedCurrentPercent = parseInt(gradeMatch[2]);
        }
      }

      // Look for course name (usually before "Marking Period")
      if (line.includes("Marking Period") && i > 0) {
        parsedCourseName = lines[i - 1].trim();
      }
    }
    
    // Parse category weights from the summary/grid table, e.g. "Major Summative	60%	299.00	300.00"
    // or "Formative Assessment	10.00%	...". A header row naming a "Weight" / "% of Grade" column picks
    // which percentage is the weight; otherwise the first percentage after the category name is used.
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

      const parts = line.split(/\t|\s{2,}/).map(p => p.trim()).filter(Boolean);
      const headerIndex = parts.findIndex(p => /^(weight|% of grade)$/i.test(p));
      if (headerIndex > 0) {
        weightColumn = headerIndex;
        continue;
      }
      if (parts.length < 2 || /TOTAL/i.test(parts[0])) continue;

      const categoryName = matchCategory(parts[0]) || (foundSummary ? parts[0] : null);
      if (!categoryName) continue;

      const weightCell = weightColumn > 0 ? parts[weightColumn] : parts.slice(1).find(p => /%$/.test(p));
      const weightMatch = weightCell && weightCell.match(/^(\d+(?:\.\d+)?)%$/);
      if (weightMatch) {
        parsedWeights[categoryName] = parseFloat(weightMatch[1]);
        knownCategories.add(categoryName.toLowerCase());
      }
    }
    
    // Also check the "Totals" section at the end for overall grade
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
      const line = lines[i];
      const gradeMatch = line.match(/([A-F][+-]?)\s*\((\d+)%\)/);
      if (gradeMatch) {
        parsedCurrentGrade = gradeMatch[1];
        parsedCurrentPercent = parseInt(gradeMatch[2]);
        break;
      }
    }

    // Parse assignments - redesigned to handle Synergy's structured format
    // Find the "Assignments" section
    let assignmentsStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("Assignments") || lines[i].includes("Data grid")) {
        assignmentsStartIndex = i;
        break;
      }
    }
    
    // If we found assignments section, parse from there
    if (assignmentsStartIndex >= 0) {
      // Parse assignments systematically
      // Pattern: Date -> Name -> Category -> Score info
      let i = assignmentsStartIndex;
      
      while (i < lines.length) {
        const line = lines[i].trim();
        
        // Look for date pattern M/D/YY, MM/DD/YY, or MM/DD/YYYY (at start or after tabs/spaces)
        // Handle both single-digit and double-digit months/days
        // Also check the raw line in case there are tabs
        const rawLine = lines[i];
        // Match dates like: 11/6/25, 9/24/25, 10/28/25, etc.
        const dateMatch = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/) || rawLine.match(/^[\s\t]*(\d{1,2}\/\d{1,2}\/\d{2,4})/);
        
        if (dateMatch) {
          const date = dateMatch[1];
          let assignmentName = "";
          let category = "Other";
          let earned = 0;
          let possible = 0;
          let foundScore = false;
          
          // Look ahead for assignment data (next 15 lines to be safe)
          let j = i + 1;
          let nameFound = false;
          let categoryFound = false;
          let shouldBreak = false;
          
          
          // Extract assignment name (usually the next non-empty line after date)
          while (j < Math.min(i + 15, lines.length) && !shouldBreak) {
            const nextLine = lines[j].trim();
            
            // Skip empty lines
            if (!nextLine) {
              j++;
              continue;
            }
            
            // Skip if it's another date (next assignment) - but only if we've found some data
            // Handle both single-digit and double-digit dates
            if (nextLine.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
              // If we haven't found anything useful yet, this might be part of the current assignment
              // Only break if we've found at least name or category
              if (nameFound || categoryFound || foundScore) {
                shouldBreak = true;
                break;
              }
            }
            
            // Skip navigation items
            // Exact match only: titles like "Homework Unit 2" contain nav words such as "Home"
            if (navigationItems.includes(nextLine.replace(/^(gs\s+)?icon\s+/i, ""))) {
              j++;
              continue;
            }
            
            // Skip assignments marked as "Not For Grading", "Not Due", or "Not Graded"
            if (nextLine.includes("Not For Grading") || nextLine.includes("(Not For Grading)") ||
                nextLine.includes("Not Due") || nextLine.includes("Not Graded")) {
              shouldBreak = true;
              break;
            }
            
            // Check for diagnostic formatives
            if (nextLine.includes("Diagnostic Formative")) {
              shouldBreak = true;
              break;
            }
            
            // Extract assignment name (first substantial line that is not a category or "Raw Score" metadata)
            if (!nameFound && isPlausibleAssignmentTitleLine(nextLine)) {
              // Check if it's tab-separated
              const tabParts = nextLine.split('\t');
              if (tabParts.length > 0) {
                const potentialName = tabParts[0].trim();
                if (potentialName && potentialName.length > 2 && !potentialName.match(/^\d+$/) && 
                    !potentialName.match(/^\d+\.?\d*\/\d+\.?\d*$/) && !potentialName.match(/out of/i)) {
                  assignmentName = potentialName;
                  nameFound = true;
                }
              } else {
                // Not tab-separated, use the whole line if it's substantial
                if (nextLine.length > 2 && !nextLine.match(/^\d+\.?\d*\/\d+\.?\d*$/) && 
                    !nextLine.match(/out of/i) && !nextLine.match(/^\d+$/)) {
                  assignmentName = nextLine;
                  nameFound = true;
                }
              }
            }
            
            // Extract category
            if (!categoryFound) {
              const matched = nextLine.split('\t').map(matchCategory).find(Boolean);
              if (matched) {
                category = matched;
                categoryFound = true;
              }
            }
            
            // Extract score - try multiple formats (keep trying even after name/category found)
            // "Raw Score	X.XX/Y.YYY" is the points value that counts toward the grade. It can differ from the
            // displayed "X out of Y" (e.g. "39 out of 40" worth 9.75/10), so it overrides any earlier match.
            const rawScoreMatch = nextLine.match(/(?:Raw\s+Score|Percentage)\s+(\d+\.?\d*)\/(\d+\.?\d*)/i);
            if (rawScoreMatch) {
              earned = parseFloat(rawScoreMatch[1]);
              possible = parseFloat(rawScoreMatch[2]);
              foundScore = true;
            }
            if (!foundScore) {
              // Format 1: "X out of Y" - example: "105 out of 100.0000"
              const outOfMatch = nextLine.match(/(\d+\.?\d*)\s+out\s+of\s+(\d+\.?\d*)/i);
              if (outOfMatch) {
                earned = parseFloat(outOfMatch[1]);
                possible = parseFloat(outOfMatch[2]);
                foundScore = true;
              }

              // Format 3: "X.XX/Y.YYY" (but not dates)
              if (!foundScore) {
                const scoreMatch = nextLine.match(/(\d+\.?\d*)\/(\d+\.?\d*)/);
                if (scoreMatch) {
                  const num1 = parseFloat(scoreMatch[1]);
                  const num2 = parseFloat(scoreMatch[2]);
                  // Valid score: num2 should be > 10 (not a date) and reasonable
                  if (num2 > 10 && num2 < 10000 && num1 <= num2) {
                    // Make sure it's not a date pattern
                    const beforeMatch = nextLine.substring(0, scoreMatch.index);
                    if (!beforeMatch.match(/\d{2}\/\d{2}$/)) {
                      earned = num1;
                      possible = num2;
                      foundScore = true;
                    }
                  }
                }
              }
              
              // Format 4: Look for two separate numbers that could be earned/possible
              // This handles cases where they're on separate lines or separated differently
              if (!foundScore) {
                // Look for patterns like "11	11" (tab-separated numbers)
                const tabParts = nextLine.split('\t');
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
            
            j++;
          }
          
          // Only add if we found a valid score
          if (foundScore && possible > 0) {
            // If we don't have a name but have a category, try to get name from context
            if (!assignmentName && category !== "Other") {
              // Look back a few lines for potential name
              for (let k = Math.max(0, i - 3); k < i; k++) {
                const prevLine = lines[k].trim();
                if (prevLine && isPlausibleAssignmentTitleLine(prevLine)) {
                  assignmentName = prevLine.split('\t')[0].trim();
                  if (assignmentName && !navigationItems.includes(assignmentName)) {
                    break;
                  }
                }
              }
            }
            
            // Filter out entries with very generic names (but allow if we have a category)
            if (assignmentName && assignmentName.length < 3 && category === "Other") {
              i = shouldBreak ? j - 1 : j;
              continue;
            }
            
            // If we still don't have a name, generate one
            if (!assignmentName) {
              assignmentName = `Assignment ${parsedAssignments.length + 1}`;
            }
            
            // Check for duplicates
            const isDuplicate = parsedAssignments.some(a => 
              a.date === date && a.name === assignmentName && Math.abs(a.earned - earned) < 0.01
            );
            
            if (!isDuplicate) {
              parsedAssignments.push({
                id: parsedAssignments.length,
                date,
                name: assignmentName,
                category,
                earned: earned,
                possible: possible,
                originalEarned: earned,
                originalPossible: possible
              });
            }
            
            // Move to the next assignment
            // If we broke because we found the next date at line j, set i = j - 1
            // Then the loop will check j-1 (no date), increment to j, and next iteration will process j (the date)
            // Otherwise, continue from where we stopped looking
            if (shouldBreak) {
              i = j - 1; // j is the line with the next date
            } else {
              i = j - 1; // Continue from where we stopped (j was incremented at end of inner loop)
            }
          } else {
            // Move forward even if we didn't find a complete assignment
            i++;
          }
        } else {
          i++;
        }
      }
    } else {
      // Fallback: try to find assignments without "Assignments" header
      // Use the old method as backup
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const dateMatch = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/);
        
        if (dateMatch) {
          const date = dateMatch[1];
          const contextLines = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');
          
          // Skip if it's in the summary section
          if (contextLines.includes("Grade Calculation Summary")) {
            continue;
          }
          
          // Try to extract assignment data
          const outOfMatch = contextLines.match(/(\d+\.?\d*)\s+out\s+of\s+(\d+\.?\d*)/i);
          if (outOfMatch) {
            const earned = parseFloat(outOfMatch[1]);
            const possible = parseFloat(outOfMatch[2]);
            
            // Find category (only within this assignment's lines, not the next one's)
            let category = "Other";
            for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
              if (/^\s*\d{1,2}\/\d{1,2}\/\d{2,4}/.test(lines[j])) break;
              const matched = lines[j].split('\t').map(matchCategory).find(Boolean);
              if (matched) {
                category = matched;
                break;
              }
            }
            
            // Skip if diagnostic or not graded
            if (contextLines.includes("Diagnostic Formative") || 
                contextLines.includes("Not For Grading") || 
                contextLines.includes("Not Due") || 
                contextLines.includes("Not Graded")) {
              continue;
            }
            
            // Find assignment name
            let assignmentName = "";
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              const nextLine = lines[j].trim();
              if (nextLine && isPlausibleAssignmentTitleLine(nextLine) &&
                  !nextLine.match(/out of/i) && nextLine.length > 2) {
                assignmentName = nextLine.split('\t')[0].trim();
                break;
              }
            }
            
            if (assignmentName && !navigationItems.includes(assignmentName)) {
              const isDuplicate = parsedAssignments.some(a => 
                a.date === date && a.name === assignmentName && Math.abs(a.earned - earned) < 0.01
              );
              
              if (!isDuplicate && category !== "Other") {
                parsedAssignments.push({
                  id: parsedAssignments.length,
                  date,
                  name: assignmentName,
                  category,
                  earned: earned,
                  possible: possible,
                  originalEarned: earned,
                  originalPossible: possible
                });
              }
            }
          }
        }
      }
    }

    // If we couldn't find course name, try to find it elsewhere
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
      weights: parsedWeights
    };
  };

  const getLetterGrade = (percent) => {
    if (percent >= 98) return "A+";
    if (percent >= 93) return "A";
    if (percent >= 90) return "A-";
    if (percent >= 87) return "B+";
    if (percent >= 83) return "B";
    if (percent >= 80) return "B-";
    if (percent >= 77) return "C+";
    if (percent >= 73) return "C";
    if (percent >= 70) return "C-";
    if (percent >= 67) return "D+";
    if (percent >= 63) return "D";
    if (percent >= 60) return "D-";
    return "F";
  };

  const handleParse = () => {
    if (!pastedText.trim()) {
      alert("Please paste your gradebook data first");
      return;
    }

    const parsed = parseGradebook(pastedText);
    const hasParsedWeights = Object.keys(parsed.weights).length > 0;

    setCourseName(parsed.courseName);
    setReportedGrade(parsed.currentGrade);
    setReportedPercent(parsed.currentPercent);
    setAssignments(parsed.assignments.map(a => ({ ...a, isHypothetical: false })));
    // Store original assignments for comparison
    setOriginalAssignments(parsed.assignments.map(a => ({ ...a, isHypothetical: false })));
    setHiddenCategories([]);

    // The gradebook's own weights win over the chosen plan, so stale defaults don't leak in
    if (hasParsedWeights) {
      setCategoryWeights({ ...parsed.weights, "Extra Credit": 0, "Other": 0 });
      setSelectedWeightPlan("Gradebook");
      setUseWeightedGrading(true);
    }
  };

  // Plans name a single formative weight; apply it to both Synergy formative category names
  const applyPlanWeights = (weights) => {
    setCategoryWeights({
      ...DEFAULT_WEIGHTS,
      ...weights,
      "Formative Assessment": weights["Graded Formative"]
    });
    setUseWeightedGrading(true);
  };

  const handleWeightPlanSelect = (planKey) => {
    if (planKey === "Other") {
      setSelectedWeightPlan("Other");
    } else {
      applyPlanWeights(WEIGHT_PLANS[planKey].weights);
      setSelectedWeightPlan(planKey);
      setShowWeightPlanModal(false);
    }
  };

  const handleCustomWeightChange = (category, value) => {
    const numValue = parseFloat(value) || 0;
    setCustomWeights(prev => ({
      ...prev,
      [category]: numValue
    }));
  };

  const handleCustomWeightsApply = () => {
    const total = customWeights["Major Summative"] + 
                  customWeights["Minor Summative"] + 
                  customWeights["Graded Formative"];
    
    if (Math.abs(total - 100) > 0.01) {
      alert("Weights must sum to 100%");
      return;
    }
    
    applyPlanWeights(customWeights);
    setShowWeightPlanModal(false);
  };

  const updateAssignment = (id, field, value) => {
    setAssignments(assignments.map(a =>
      a.id === id
        ? { ...a, [field]: value }
        : a
    ));
    // Changing a category corrects the import, so it also applies to the current grade
    if (field === "category") {
      setOriginalAssignments(originalAssignments.map(a =>
        a.id === id ? { ...a, category: value } : a
      ));
    }
  };

  const updateAssignmentScore = (id, newEarned, newPossible) => {
    setAssignments(assignments.map(a => 
      a.id === id 
        ? { ...a, earned: newEarned, possible: newPossible }
        : a
    ));
  };

  const handleScoreChange = (id, field, value) => {
    const currentAssignment = assignments.find(a => a.id === id);
    if (!currentAssignment) return;
    
    const currentValue = field === 'earned' ? currentAssignment.earned : currentAssignment.possible;
    
    // If the current value is 0 and user is typing, handle replacement
    if (currentValue === 0 && value !== "" && value !== "0") {
      // If value starts with "0" followed by digits (e.g., "05"), remove leading 0
      // Otherwise use the value as-is
      const cleanValue = value.startsWith("0") && value.length > 1 ? value.substring(1) : value;
      const numValue = parseFloat(cleanValue) || 0;
      if (field === 'earned') {
        updateAssignmentScore(id, numValue, currentAssignment.possible === "" ? 0 : (currentAssignment.possible || 0));
      } else {
        updateAssignmentScore(id, currentAssignment.earned === "" ? 0 : (currentAssignment.earned || 0), numValue);
      }
    } else if (value === "") {
      // Store as empty string to allow clearing
      if (field === 'earned') {
        setAssignments(assignments.map(a => 
          a.id === id ? { ...a, earned: "" } : a
        ));
      } else {
        setAssignments(assignments.map(a => 
          a.id === id ? { ...a, possible: "" } : a
        ));
      }
    } else {
      // Parse the number value normally
      const numValue = parseFloat(value) || 0;
      if (field === 'earned') {
        updateAssignmentScore(id, numValue, currentAssignment.possible === "" ? 0 : (currentAssignment.possible || 0));
      } else {
        updateAssignmentScore(id, currentAssignment.earned === "" ? 0 : (currentAssignment.earned || 0), numValue);
      }
    }
  };

  const handleScoreFocus = (e) => {
    // When user focuses on a field with value 0, select all text so they can type to replace it
    if (e.target.value === "0") {
      e.target.select();
    }
  };

  const handleScoreBlur = (id, field, value) => {
    // Convert empty to 0 when field loses focus
    const numValue = value === "" ? 0 : (parseFloat(value) || 0);
    const currentAssignment = assignments.find(a => a.id === id);
    if (!currentAssignment) return;
    
    if (field === 'earned') {
      updateAssignmentScore(id, numValue, currentAssignment.possible === "" ? 0 : (currentAssignment.possible || 0));
    } else {
      updateAssignmentScore(id, currentAssignment.earned === "" ? 0 : (currentAssignment.earned || 0), numValue);
    }
  };

  const resetAssignment = (id) => {
    setAssignments(assignments.map(a => 
      a.id === id 
        ? { ...a, earned: a.originalEarned, possible: a.originalPossible }
        : a
    ));
  };

  const resetAll = () => {
    // Restore original assignments (including any that were deleted)
    setAssignments(originalAssignments.map(a => ({
      ...a,
      earned: a.originalEarned,
      possible: a.originalPossible
    })));
  };

  const addNewAssignment = () => {
    const indices = Date.now();
    const newAssignment = {
      id: indices,
      date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      name: "New Assignment",
      category: "Minor Summative",
      earned: 100,
      possible: 100,
      originalEarned: 100,
      originalPossible: 100,
      isHypothetical: true,
    };
    setAssignments([newAssignment, ...assignments]);
  };

  const deleteAssignment = (id) => {
    setAssignments(assignments.filter(a => a.id !== id));
  };

  // Options for the category dropdown and filter: known categories plus any parsed from the gradebook
  const categories = [...new Set([...Object.keys(categoryWeights), ...assignments.map(a => a.category)])];

  // Both grades use the live weights, so fixing a weight or category updates the current grade too
  const currentPercent = calculateGrade(originalAssignments, categoryWeights, useWeightedGrading);
  const currentGrade = getLetterGrade(currentPercent);
  const weightPlanName = selectedWeightPlan === "Other"
    ? "Custom"
    : selectedWeightPlan === "Gradebook"
      ? "From gradebook"
      : WEIGHT_PLANS[selectedWeightPlan]?.name || selectedWeightPlan;

  // Check if assignments were added, deleted, or modified
  const hasChanges = 
    assignments.length !== originalAssignments.length ||
    assignments.some(a => {
      const original = originalAssignments.find(orig => orig.id === a.id);
      if (!original) return true; // Assignment was added
      return a.earned !== original.originalEarned || a.possible !== original.originalPossible;
    }) ||
    originalAssignments.some(orig => !assignments.find(a => a.id === orig.id)); // Assignment was deleted
  const newPercent = calculateGrade(assignments, categoryWeights, useWeightedGrading);
  const newGrade = getLetterGrade(newPercent);

  return (
    <AppPageLayout title="Grade Calculator">
      <div className="flex-1 bg-gradient-to-b from-background to-muted/20 px-4 py-6 md:px-6 md:py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <section className="rounded-2xl border border-border bg-background/95 shadow-sm">
            <div className="border-b border-border px-6 py-5 md:px-8">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Grade Calculator</h1>
              <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-3xl">
                Paste your Synergy gradebook export to calculate your current grade and preview how changes to future
                assignments affect your overall result.
              </p>
            </div>
            <div className="px-6 py-5 md:px-8 md:py-6">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Synergy gradebook data
                  </label>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste your full Synergy gradebook page here (Ctrl+A, Ctrl+C, then paste)."
                    className="h-36 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex flex-col gap-3 lg:w-56">
                  <button
                    onClick={handleParse}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  >
                    Parse gradebook
                  </button>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Parsing updates your course snapshot, assignment list, and weighting profile.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {assignments.length > 0 && (
            <section className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current grade</p>
                  <h2 className="mt-2 text-lg font-semibold text-foreground">{courseName}</h2>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">{currentGrade}</span>
                    <span className="text-xl font-semibold text-muted-foreground">{currentPercent.toFixed(2)}%</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {!useWeightedGrading
                      ? "Points-based grading"
                      : selectedWeightPlan === "Gradebook"
                        ? "Weights read from your gradebook"
                        : `Weight plan: ${weightPlanName}`}
                  </p>
                  {reportedGrade && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Synergy reports {reportedGrade} ({reportedPercent}%)
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projected grade</p>
                  {hasChanges ? (
                    <>
                      <div className="mt-6 flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-primary">{newGrade}</span>
                        <span
                          className={`text-xl font-semibold ${
                            newPercent > currentPercent
                              ? "text-green-600"
                              : newPercent < currentPercent
                                ? "text-red-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          {newPercent.toFixed(2)}%
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {newPercent > currentPercent
                          ? `+${(newPercent - currentPercent).toFixed(2)}% increase`
                          : newPercent < currentPercent
                            ? `${(currentPercent - newPercent).toFixed(2)}% decrease`
                            : "No change"}
                      </p>
                    </>
                  ) : (
                    <p className="mt-6 text-sm text-muted-foreground">
                      Edit assignment scores to preview your projected outcome.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4 shadow-sm md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Showing{" "}
                    <span className="font-semibold text-foreground">
                      {assignments.filter((assignment) => !hiddenCategories.includes(assignment.category)).length}
                    </span>{" "}
                    of <span className="font-semibold text-foreground">{assignments.length}</span> assignments
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {hasChanges && (
                      <button
                        onClick={resetAll}
                        className="rounded-lg border border-border bg-secondary px-3.5 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/90"
                      >
                        Reset all changes
                      </button>
                    )}
                    <button
                      onClick={addNewAssignment}
                      className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                    >
                      + Add assignment
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px]">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignment</th>
                        <th className="relative px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <div className="filter-menu-container inline-flex items-center gap-2">
                            Category
                            <button
                              onClick={() => setShowFilterMenu(!showFilterMenu)}
                              className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                              title="Filter categories"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                              </svg>
                            </button>
                            {showFilterMenu && (
                              <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-background p-2 shadow-lg">
                                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Visible categories
                                </p>
                                <div className="space-y-1">
                                  {categories.map((category) => (
                                    <label
                                      key={category}
                                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={!hiddenCategories.includes(category)}
                                        onChange={(e) =>
                                          setHiddenCategories(
                                            e.target.checked
                                              ? hiddenCategories.filter((c) => c !== category)
                                              : [...hiddenCategories, category]
                                          )
                                        }
                                        className="h-4 w-4"
                                      />
                                      <span className="text-foreground">{category}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Possible</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">% Score</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.filter((assignment) => !hiddenCategories.includes(assignment.category)).map((assignment) => {
                        const earned = assignment.earned === "" ? 0 : (assignment.earned || 0);
                        const possible = assignment.possible === "" ? 0 : (assignment.possible || 0);
                        const percent = possible > 0 ? (earned / possible) * 100 : 0;
                        const earnedValue = assignment.earned === "" ? 0 : (assignment.earned || 0);
                        const possibleValue = assignment.possible === "" ? 0 : (assignment.possible || 0);
                        const isChanged =
                          earnedValue !== assignment.originalEarned || possibleValue !== assignment.originalPossible;

                        return (
                          <tr
                            key={assignment.id}
                            className="border-t border-border odd:bg-background even:bg-muted/20 hover:bg-primary/5 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm text-foreground">{assignment.date}</td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={assignment.name}
                                onChange={(e) => updateAssignment(assignment.id, "name", e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={assignment.category}
                                onChange={(e) => updateAssignment(assignment.id, "category", e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              >
                                {categories.map((category) => (
                                  <option key={category} value={category}>{category}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={assignment.earned === "" ? "" : (assignment.earned || 0)}
                                onChange={(e) => handleScoreChange(assignment.id, "earned", e.target.value)}
                                onFocus={handleScoreFocus}
                                onBlur={(e) => handleScoreBlur(assignment.id, "earned", e.target.value)}
                                className={`w-24 rounded-lg border bg-background px-3 py-2 text-sm text-foreground transition focus:outline-none focus:ring-2 ${
                                  isChanged
                                    ? "border-primary ring-1 ring-primary/40 focus:ring-primary/30"
                                    : "border-border focus:border-primary focus:ring-primary/20"
                                }`}
                                step="1"
                                min="0"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={assignment.possible === "" ? "" : (assignment.possible || 0)}
                                onChange={(e) => handleScoreChange(assignment.id, "possible", e.target.value)}
                                onFocus={handleScoreFocus}
                                onBlur={(e) => handleScoreBlur(assignment.id, "possible", e.target.value)}
                                className={`w-24 rounded-lg border bg-background px-3 py-2 text-sm text-foreground transition focus:outline-none focus:ring-2 ${
                                  isChanged
                                    ? "border-primary ring-1 ring-primary/40 focus:ring-primary/30"
                                    : "border-border focus:border-primary focus:ring-primary/20"
                                }`}
                                step="1"
                                min="0"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-foreground">{percent.toFixed(2)}%</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {isChanged && (
                                  <button
                                    onClick={() => resetAssignment(assignment.id)}
                                    className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
                                  >
                                    Reset
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteAssignment(assignment.id)}
                                  className="rounded-md border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {isClient && showWeightPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-2xl rounded-2xl border border-border bg-background p-6 shadow-lg">
            <h2 className="mb-2 text-2xl font-bold text-foreground">Select Weight Plan</h2>
            <p className="mb-6 text-sm text-muted-foreground">Choose the grading scheme your teacher uses for this course.</p>
            
            <div className="mb-6 grid grid-cols-2 gap-3">
              {Object.entries(WEIGHT_PLANS).map(([key, plan]) => (
                <button
                  key={key}
                  onClick={() => handleWeightPlanSelect(key)}
                  className="flex min-h-[7.25rem] items-center rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary hover:bg-primary/5"
                  title={plan.description}
                >
                  <div className="text-lg font-semibold text-foreground">{plan.name}</div>
                </button>
              ))}
              <button
                onClick={() => handleWeightPlanSelect("Other")}
                className="flex min-h-[7.25rem] items-center rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary hover:bg-primary/5"
              >
                <div className="text-lg font-semibold text-foreground">Custom</div>
              </button>
            </div>

            {selectedWeightPlan === "Other" && (
              <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Custom Weights</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Major Summative %</label>
                    <input
                      type="number"
                      value={customWeights["Major Summative"]}
                      onChange={(e) => handleCustomWeightChange("Major Summative", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Minor Summative %</label>
                    <input
                      type="number"
                      value={customWeights["Minor Summative"]}
                      onChange={(e) => handleCustomWeightChange("Minor Summative", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Graded Formative %</label>
                    <input
                      type="number"
                      value={customWeights["Graded Formative"]}
                      onChange={(e) => handleCustomWeightChange("Graded Formative", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Total: {customWeights["Major Summative"] + customWeights["Minor Summative"] + customWeights["Graded Formative"]}%
                  {Math.abs((customWeights["Major Summative"] + customWeights["Minor Summative"] + customWeights["Graded Formative"]) - 100) > 0.01 && (
                    <span className="ml-2 text-red-600">(Must equal 100%)</span>
                  )}
                </div>
                <button
                  onClick={handleCustomWeightsApply}
                  disabled={Math.abs((customWeights["Major Summative"] + customWeights["Minor Summative"] + customWeights["Graded Formative"]) - 100) > 0.01}
                  className="mt-3 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply Custom Weights
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppPageLayout>
  );
}

