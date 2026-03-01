"use client";
import { useState, useEffect, useLayoutEffect } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";
import Footer from "../../components/Footer";

export default function GradeCalculator() {
  useLayoutEffect(() => {
    document.title = "Code4Community | Grade Calculator";
  }, []);
  
  const [pastedText, setPastedText] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [originalAssignments, setOriginalAssignments] = useState([]);
  const [courseName, setCourseName] = useState("");
  const [currentGrade, setCurrentGrade] = useState("");
  const [currentPercent, setCurrentPercent] = useState(0);
  const [categoryWeights, setCategoryWeights] = useState({
    "Major Summative": 50,
    "Minor Summative": 30,
    "Graded Formative": 20,
    "Extra Credit": 0,
    "Other": 0
  });
  const [useWeightedGrading, setUseWeightedGrading] = useState(true);
  const [visibleCategories, setVisibleCategories] = useState({
    "Major Summative": true,
    "Minor Summative": true,
    "Graded Formative": true,
    "Extra Credit": true,
    "Other": true
  });
  const [showFilterMenu, setShowFilterMenu] = useState(false);

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


  const parseGradebook = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    let parsedCourseName = "";
    let parsedCurrentGrade = "";
    let parsedCurrentPercent = 0;
    const parsedAssignments = [];
    const parsedWeights = {};
    
    // Common navigation items to filter out
    const navigationItems = ['Home', 'Synergy', 'Mail', 'Calendar', 'Attendance', 'Class Schedule', 
                            'Course History', 'Grade Book', 'MTSS', 'Organization Information',
                            'User Info', 'Test History', 'Documents', 'Totals'];

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
    
    // Parse Grade Calculation Summary for category weights
    let foundSummary = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes("Grade Calculation Summary")) {
        foundSummary = true;
        continue;
      }
      
      if (foundSummary) {
        // Stop parsing summary when we hit "Assignments" or a blank line
        if (line.includes("Assignments") || line.trim() === "") {
          foundSummary = false;
          continue;
        }
        
        // Skip TOTAL line
        if (line.includes("TOTAL")) {
          continue;
        }
        
        // Parse category weight lines: "Major Summative	60%	299.00	300.00" or "Major Summative 60% 299.00 300.00"
        // Handle both tab-separated and space-separated data
        let weightFound = false;
        const parts = line.split(/\t|\s{2,}/).filter(p => p.trim());
        if (parts.length >= 2) {
          const categoryName = parts[0].trim();
          const weightMatch = parts[1].match(/(\d+)%/);
          
          if (weightMatch) {
            const weight = parseInt(weightMatch[1]);
            
            // Map to our category names
            if (categoryName.includes("Major Summative")) {
              parsedWeights["Major Summative"] = weight;
              weightFound = true;
            } else if (categoryName.includes("Minor Summative")) {
              parsedWeights["Minor Summative"] = weight;
              weightFound = true;
            } else if (categoryName.includes("Graded Formative")) {
              parsedWeights["Graded Formative"] = weight;
              weightFound = true;
            }
          }
        }
        
        // Fallback: Try regex pattern for space-separated data
        if (!weightFound) {
          const weightMatch = line.match(/([A-Za-z\s]+?)\s+(\d+)%\s+[\d.]+\s+[\d.]+/);
          if (weightMatch) {
            const categoryName = weightMatch[1].trim();
            const weight = parseInt(weightMatch[2]);
            
            // Map to our category names
            if (categoryName.includes("Major Summative")) {
              parsedWeights["Major Summative"] = weight;
            } else if (categoryName.includes("Minor Summative")) {
              parsedWeights["Minor Summative"] = weight;
            } else if (categoryName.includes("Graded Formative")) {
              parsedWeights["Graded Formative"] = weight;
            }
          }
        }
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
      console.log("🔍 Found assignments section at line", assignmentsStartIndex);
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
          console.log(`\n📅 Found date: ${date} at line ${i}`);
          console.log(`   Line content: "${line}"`);
          console.log(`   Raw line: "${lines[i]}"`);
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
          
          console.log(`   Looking ahead from line ${i + 1} to ${Math.min(i + 15, lines.length)}`);
          
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
            if (navigationItems.some(item => nextLine.includes(item))) {
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
            
            // Extract assignment name (first substantial non-category text)
            if (!nameFound && !nextLine.match(/(Major|Minor|Graded|Summative|Formative|Diagnostic)/i)) {
              // Check if it's tab-separated
              const tabParts = nextLine.split('\t');
              if (tabParts.length > 0) {
                const potentialName = tabParts[0].trim();
                if (potentialName && potentialName.length > 2 && !potentialName.match(/^\d+$/) && 
                    !potentialName.match(/^\d+\.?\d*\/\d+\.?\d*$/) && !potentialName.match(/out of/i)) {
                  assignmentName = potentialName;
                  nameFound = true;
                  console.log(`   ✅ Found name: "${assignmentName}" at line ${j}`);
                }
              } else {
                // Not tab-separated, use the whole line if it's substantial
                if (nextLine.length > 2 && !nextLine.match(/^\d+\.?\d*\/\d+\.?\d*$/) && 
                    !nextLine.match(/out of/i) && !nextLine.match(/^\d+$/)) {
                  assignmentName = nextLine;
                  nameFound = true;
                  console.log(`   ✅ Found name: "${assignmentName}" at line ${j}`);
                }
              }
            }
            
            // Extract category
            if (!categoryFound) {
              if (nextLine.includes("Major Summative")) {
                category = "Major Summative";
                categoryFound = true;
                console.log(`   ✅ Found category: "${category}" at line ${j}`);
              } else if (nextLine.includes("Minor Summative")) {
                category = "Minor Summative";
                categoryFound = true;
                console.log(`   ✅ Found category: "${category}" at line ${j}`);
              } else if (nextLine.includes("Graded Formative")) {
                category = "Graded Formative";
                categoryFound = true;
                console.log(`   ✅ Found category: "${category}" at line ${j}`);
              }
            }
            
            // Extract score - try multiple formats (keep trying even after name/category found)
            if (!foundScore) {
              // Format 1: "X out of Y" - example: "105 out of 100.0000"
              const outOfMatch = nextLine.match(/(\d+\.?\d*)\s+out\s+of\s+(\d+\.?\d*)/i);
              if (outOfMatch) {
                earned = parseFloat(outOfMatch[1]);
                possible = parseFloat(outOfMatch[2]);
                foundScore = true;
                console.log(`   ✅ Found score (out of): ${earned}/${possible} at line ${j}`);
              }
              
              // Format 2: "Raw Score	X.XX/Y.YYY"
              if (!foundScore) {
                const rawScoreMatch = nextLine.match(/(?:Raw\s+Score|Percentage)\s+(\d+\.?\d*)\/(\d+\.?\d*)/i);
                if (rawScoreMatch) {
                  earned = parseFloat(rawScoreMatch[1]);
                  possible = parseFloat(rawScoreMatch[2]);
                  foundScore = true;
                  console.log(`   ✅ Found score (Raw Score): ${earned}/${possible} at line ${j}`);
                }
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
                      console.log(`   ✅ Found score (X/Y): ${earned}/${possible} at line ${j}`);
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
                    console.log(`   ✅ Found score (tab-separated): ${earned}/${possible} at line ${j}`);
                  }
                }
              }
            }
            
            // Debug: show what we're checking
            if (j <= i + 5) {
              console.log(`   🔍 Line ${j}: "${nextLine.substring(0, 50)}${nextLine.length > 50 ? '...' : ''}"`);
            }
            
            j++;
          }
          
          // Only add if we found a valid score
          console.log(`   📊 Summary for ${date}: name="${assignmentName}", category="${category}", score=${foundScore ? `${earned}/${possible}` : 'NOT FOUND'}`);
          
          if (foundScore && possible > 0) {
            // If we don't have a name but have a category, try to get name from context
            if (!assignmentName && category !== "Other") {
              // Look back a few lines for potential name
              for (let k = Math.max(0, i - 3); k < i; k++) {
                const prevLine = lines[k].trim();
                if (prevLine && !prevLine.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/) && 
                    !prevLine.match(/(Major|Minor|Graded|Summative|Formative)/i) &&
                    prevLine.length > 2) {
                  assignmentName = prevLine.split('\t')[0].trim();
                  if (assignmentName && !navigationItems.includes(assignmentName)) {
                    console.log(`   🔄 Found name from context: "${assignmentName}"`);
                    break;
                  }
                }
              }
            }
            
            // Filter out entries with very generic names (but allow if we have a category)
            if (assignmentName && assignmentName.length < 3 && category === "Other") {
              console.log(`   ❌ Skipping: name too short and no category`);
              i = shouldBreak ? j - 1 : j;
              continue;
            }
            
            // If we still don't have a name, generate one
            if (!assignmentName) {
              assignmentName = `Assignment ${parsedAssignments.length + 1}`;
              console.log(`   🔄 Generated name: "${assignmentName}"`);
            }
            
            // If we don't have a category, try to infer from context or use "Other"
            if (category === "Other") {
              // Look in the context for category hints
              const contextText = lines.slice(i, Math.min(i + 10, lines.length)).join(' ');
              if (contextText.includes("Major Summative")) {
                category = "Major Summative";
                console.log(`   🔄 Inferred category from context: "${category}"`);
              } else if (contextText.includes("Minor Summative")) {
                category = "Minor Summative";
                console.log(`   🔄 Inferred category from context: "${category}"`);
              } else if (contextText.includes("Graded Formative")) {
                category = "Graded Formative";
                console.log(`   🔄 Inferred category from context: "${category}"`);
              }
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
              console.log(`   ✅ ADDED assignment: ${date} - ${assignmentName} (${category}) ${earned}/${possible}`);
            } else {
              console.log(`   ⚠️  Skipping duplicate: ${date} - ${assignmentName}`);
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
            console.log(`   ❌ SKIPPING: No valid score found (foundScore=${foundScore}, possible=${possible})`);
            // Move forward even if we didn't find a complete assignment
            i++;
          }
        } else {
          // Debug: log if we're in the assignments section and skipping a line that might be a date
          if (i >= assignmentsStartIndex && i < assignmentsStartIndex + 100) {
            // Check if this line looks like it might have a date (but didn't match our strict pattern)
            const mightBeDate = line.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
            if (mightBeDate && !line.includes("Marking Period") && !line.includes("Grade Calculation")) {
              console.log(`   ⚠️  Line ${i} might contain a date but didn't match: "${line.substring(0, 50)}"`);
            }
          }
          i++;
        }
      }
    } else {
      console.log("⚠️  Assignments section not found, using fallback method");
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
            
            // Find category
            let category = "Other";
            if (contextLines.includes("Major Summative")) {
              category = "Major Summative";
            } else if (contextLines.includes("Minor Summative")) {
              category = "Minor Summative";
            } else if (contextLines.includes("Graded Formative")) {
              category = "Graded Formative";
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
              if (nextLine && !nextLine.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/) && 
                  !nextLine.match(/(Major|Minor|Graded|Summative|Formative)/i) &&
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

    console.log(`\n📋 PARSING SUMMARY:`);
    console.log(`   Course: ${parsedCourseName || "Unknown"}`);
    console.log(`   Grade: ${parsedCurrentGrade} (${parsedCurrentPercent}%)`);
    console.log(`   Category Weights:`, parsedWeights);
    console.log(`   Assignments Found: ${parsedAssignments.length}`);
    parsedAssignments.forEach((a, idx) => {
      console.log(`   ${idx + 1}. ${a.date} - ${a.name} (${a.category}) ${a.earned}/${a.possible}`);
    });
    console.log(`\n`);

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

  // Calculate grade from assignments and weights
  const calculateGradeFromAssignments = (assignmentsToCalculate, weightsToUse, useWeighted) => {
    if (assignmentsToCalculate.length === 0) return { percent: 0, letter: "F" };
    
    if (useWeighted) {
      // Calculate weighted grade by category
      const categoryGroups = {};
      
      // Group assignments by category
      assignmentsToCalculate.forEach(assignment => {
        if (!categoryGroups[assignment.category]) {
          categoryGroups[assignment.category] = { earned: 0, possible: 0 };
        }
        // Handle empty strings as 0
        const earned = assignment.earned === "" ? 0 : (assignment.earned || 0);
        const possible = assignment.possible === "" ? 0 : (assignment.possible || 0);
        categoryGroups[assignment.category].earned += earned;
        categoryGroups[assignment.category].possible += possible;
      });
      
      // Calculate weighted average
      let totalWeightedScore = 0;
      let totalWeight = 0;
      
      Object.keys(categoryGroups).forEach(category => {
        const { earned, possible } = categoryGroups[category];
        const weight = weightsToUse[category] || 0;
        
        if (possible > 0 && weight > 0) {
          const categoryPercent = (earned / possible) * 100;
          totalWeightedScore += categoryPercent * weight;
          totalWeight += weight;
        }
      });
      
      const baseGrade = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
      // Add extra credit from assignments
      const extraCreditTotal = assignmentsToCalculate
        .filter(a => a.category === "Extra Credit")
        .reduce((sum, a) => sum + (a.earned === "" ? 0 : (a.earned || 0)), 0);
      
      const percent = baseGrade + extraCreditTotal;
      return { percent, letter: getLetterGrade(percent) };
    } else {
      // Simple average (all points equal weight)
      const regularAssignments = assignmentsToCalculate.filter(a => a.category !== "Extra Credit");
      const extraCreditTotal = assignmentsToCalculate
        .filter(a => a.category === "Extra Credit")
        .reduce((sum, a) => sum + (a.earned === "" ? 0 : (a.earned || 0)), 0);
      
      const totalEarned = regularAssignments.reduce((sum, a) => sum + (a.earned === "" ? 0 : (a.earned || 0)), 0);
      const totalPossible = regularAssignments.reduce((sum, a) => sum + (a.possible === "" ? 0 : (a.possible || 0)), 0);
      
      const baseGrade = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
      const percent = baseGrade + extraCreditTotal;
      return { percent, letter: getLetterGrade(percent) };
    }
  };

  const handleParse = () => {
    if (!pastedText.trim()) {
      alert("Please paste your gradebook data first");
      return;
    }
    
    const parsed = parseGradebook(pastedText);
    
    // Update category weights if found in the gradebook
    const finalWeights = { ...categoryWeights };
    if (parsed.weights && Object.keys(parsed.weights).length > 0) {
      Object.assign(finalWeights, parsed.weights);
    }
    
    // Recalculate actual current grade from parsed assignments
    const calculatedGrade = calculateGradeFromAssignments(
      parsed.assignments,
      finalWeights,
      parsed.weights && Object.keys(parsed.weights).length > 0
    );
    
    setCourseName(parsed.courseName);
    setCurrentGrade(calculatedGrade.letter);
    setCurrentPercent(calculatedGrade.percent);
    setAssignments(parsed.assignments);
    // Store original assignments for comparison
    setOriginalAssignments(parsed.assignments.map(a => ({ ...a })));
    
    // Update category weights
    if (parsed.weights && Object.keys(parsed.weights).length > 0) {
      setCategoryWeights(prev => ({
        ...prev,
        ...parsed.weights
      }));
      setUseWeightedGrading(true);
    }
  };

  const updateAssignment = (id, field, value) => {
    setAssignments(assignments.map(a => 
      a.id === id 
        ? { ...a, [field]: value }
        : a
    ));
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
      earned: 0,
      possible: 100,
      originalEarned: 0,
      originalPossible: 100
    };
    setAssignments([newAssignment, ...assignments]);
  };

  const deleteAssignment = (id) => {
    setAssignments(assignments.filter(a => a.id !== id));
  };

  // Calculate new grade based on edited assignments
  const calculateNewGrade = () => {
    if (assignments.length === 0) return 0;
    
    if (useWeightedGrading) {
      // Calculate weighted grade by category
      const categoryGroups = {};
      
      // Group assignments by category
      assignments.forEach(assignment => {
        if (!categoryGroups[assignment.category]) {
          categoryGroups[assignment.category] = { earned: 0, possible: 0 };
        }
        // Handle empty strings as 0
        const earned = assignment.earned === "" ? 0 : (assignment.earned || 0);
        const possible = assignment.possible === "" ? 0 : (assignment.possible || 0);
        categoryGroups[assignment.category].earned += earned;
        categoryGroups[assignment.category].possible += possible;
      });
      
      // Calculate weighted average
      let totalWeightedScore = 0;
      let totalWeight = 0;
      
      Object.keys(categoryGroups).forEach(category => {
        const { earned, possible } = categoryGroups[category];
        const weight = categoryWeights[category] || 0;
        
        if (possible > 0 && weight > 0) {
          const categoryPercent = (earned / possible) * 100;
          totalWeightedScore += categoryPercent * weight;
          totalWeight += weight;
        }
      });
      
      const baseGrade = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
      // Add extra credit from assignments
      const extraCreditTotal = assignments
        .filter(a => a.category === "Extra Credit")
        .reduce((sum, a) => sum + (a.earned === "" ? 0 : (a.earned || 0)), 0);
      
      return baseGrade + extraCreditTotal;
    } else {
      // Simple average (all points equal weight)
      const regularAssignments = assignments.filter(a => a.category !== "Extra Credit");
      const extraCreditTotal = assignments
        .filter(a => a.category === "Extra Credit")
        .reduce((sum, a) => sum + (a.earned === "" ? 0 : (a.earned || 0)), 0);
      
      const totalEarned = regularAssignments.reduce((sum, a) => sum + (a.earned === "" ? 0 : (a.earned || 0)), 0);
      const totalPossible = regularAssignments.reduce((sum, a) => sum + (a.possible === "" ? 0 : (a.possible || 0)), 0);
      
      const baseGrade = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
      return baseGrade + extraCreditTotal;
    }
  };

  // Check if assignments were added, deleted, or modified
  const hasChanges = 
    assignments.length !== originalAssignments.length ||
    assignments.some(a => {
      const original = originalAssignments.find(orig => orig.id === a.id);
      if (!original) return true; // Assignment was added
      return a.earned !== original.originalEarned || a.possible !== original.originalPossible;
    }) ||
    originalAssignments.some(orig => !assignments.find(a => a.id === orig.id)); // Assignment was deleted
  const newPercent = calculateNewGrade();
  const newGrade = getLetterGrade(newPercent);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar title="Grade Calculator" />
      
      <div className="flex-1 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-6">Grade Calculator</h1>
          
          {/* Paste Area */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-foreground mb-2">
              Paste your gradebook data from Synergy:
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your gradebook data here... (Right-click and paste from the gradebook page)"
              className="w-full h-32 px-4 py-2 text-sm text-foreground bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
            />
            <button
              onClick={handleParse}
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Parse Grades
            </button>
          </div>

          {/* Results */}
          {assignments.length > 0 && (
            <div className="space-y-6">
              {/* Grade Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-elevated p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{courseName}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-muted-foreground">{currentGrade}</span>
                    <span className="text-xl text-muted-foreground">{currentPercent.toFixed(2)}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Current Grade</p>
                </div>
                
                {hasChanges && (
                  <div className="card-elevated p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Projected Grade</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-primary">{newGrade}</span>
                      <span className={`text-xl ${newPercent > currentPercent ? 'text-green-500' : newPercent < currentPercent ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {newPercent.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {newPercent > currentPercent 
                        ? `+${(newPercent - currentPercent).toFixed(2)}% increase` 
                        : newPercent < currentPercent 
                        ? `${(currentPercent - newPercent).toFixed(2)}% decrease`
                        : "No change"}
                    </p>
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex gap-3">
                {hasChanges && (
                  <button
                    onClick={resetAll}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
                  >
                    Reset All Changes
                  </button>
                )}
                <button
                  onClick={addNewAssignment}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  + Add Assignment
                </button>
              </div>

              {/* Assignments Table */}
              <div className="card-elevated rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Assignment</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground relative">
                          <div className="flex items-center gap-2 filter-menu-container">
                            Category
                            <button
                              onClick={() => setShowFilterMenu(!showFilterMenu)}
                              className="relative text-muted-foreground hover:text-foreground transition-colors"
                              title="Filter categories"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                              </svg>
                            </button>
                            
                            {/* Filter Menu */}
                            {showFilterMenu && (
                              <div className="absolute left-0 top-full mt-2 w-48 bg-background border border-border rounded-md shadow-lg z-50">
                                <div className="p-2 space-y-1">
                                  {Object.keys(visibleCategories).map(category => (
                                    <label key={category} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 rounded cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={visibleCategories[category]}
                                        onChange={(e) => setVisibleCategories({
                                          ...visibleCategories,
                                          [category]: e.target.checked
                                        })}
                                        className="w-4 h-4"
                                      />
                                      <span className="text-sm text-foreground">{category}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Score</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Possible</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground">%</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.filter(assignment => visibleCategories[assignment.category]).map((assignment) => {
                        const earned = assignment.earned === "" ? 0 : (assignment.earned || 0);
                        const possible = assignment.possible === "" ? 0 : (assignment.possible || 0);
                        const percent = possible > 0 
                          ? (earned / possible) * 100 
                          : 0;
                        const earnedValue = assignment.earned === "" ? 0 : (assignment.earned || 0);
                        const possibleValue = assignment.possible === "" ? 0 : (assignment.possible || 0);
                        const isChanged = earnedValue !== assignment.originalEarned || possibleValue !== assignment.originalPossible;
                        
                        return (
                          <tr key={assignment.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-sm text-foreground">{assignment.date}</td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={assignment.name}
                                onChange={(e) => updateAssignment(assignment.id, 'name', e.target.value)}
                                className="w-full px-2 py-1 text-sm text-foreground bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={assignment.category}
                                onChange={(e) => updateAssignment(assignment.id, 'category', e.target.value)}
                                className="w-full px-2 py-1 text-sm text-foreground bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                              >
                                <option value="Major Summative">Major Summative</option>
                                <option value="Minor Summative">Minor Summative</option>
                                <option value="Graded Formative">Graded Formative</option>
                                <option value="Extra Credit">Extra Credit</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={assignment.earned === "" ? "" : (assignment.earned || 0)}
                                onChange={(e) => handleScoreChange(assignment.id, 'earned', e.target.value)}
                                onFocus={handleScoreFocus}
                                onBlur={(e) => handleScoreBlur(assignment.id, 'earned', e.target.value)}
                                className={`w-20 px-2 py-1 text-sm text-foreground bg-background border border-border rounded ${isChanged ? 'border-primary ring-1 ring-primary' : 'focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary'}`}
                                step="1"
                                min="0"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={assignment.possible === "" ? "" : (assignment.possible || 0)}
                                onChange={(e) => handleScoreChange(assignment.id, 'possible', e.target.value)}
                                onFocus={handleScoreFocus}
                                onBlur={(e) => handleScoreBlur(assignment.id, 'possible', e.target.value)}
                                className={`w-20 px-2 py-1 text-sm text-foreground bg-background border border-border rounded ${isChanged ? 'border-primary ring-1 ring-primary' : 'focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary'}`}
                                step="1"
                                min="0"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-foreground">{percent.toFixed(2)}%</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {isChanged && (
                                  <button
                                    onClick={() => resetAssignment(assignment.id)}
                                    className="text-sm text-primary hover:text-primary/80"
                                  >
                                    Reset
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteAssignment(assignment.id)}
                                  className="text-sm text-red-500 hover:text-red-600"
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
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

