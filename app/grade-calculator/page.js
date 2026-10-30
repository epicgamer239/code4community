"use client";
import { useState, useEffect, useLayoutEffect } from "react";
import { AppPageLayout } from "@/components/common/AppPageLayout";
import { useIsClient } from "@/hooks/useIsClient";
import { useRunEffect } from "@/hooks/useRunEffect";
import { DEFAULT_WEIGHTS } from "@/lib/grade-calculator/constants";
import { parseGradebook } from "@/lib/grade-calculator/parseSynergyGradebook";

const toNumber = (value) => (value === "" ? 0 : (value || 0));

function AssignmentScoreInput({
  assignmentId,
  field,
  value,
  isChanged,
  onScoreChange,
  onScoreFocus,
  onScoreBlur,
}) {
  const inputClass = `w-24 rounded-lg border bg-background px-3 py-2 text-sm text-foreground transition focus:outline-none focus:ring-2 ${
    isChanged
      ? "border-primary ring-1 ring-primary/40 focus:ring-primary/30"
      : "border-border focus:border-primary focus:ring-primary/20"
  }`;

  return (
    <input
      type="number"
      value={value === "" ? "" : (value || 0)}
      onChange={(e) => onScoreChange(assignmentId, field, e.target.value)}
      onFocus={onScoreFocus}
      onBlur={(e) => onScoreBlur(assignmentId, field, e.target.value)}
      className={inputClass}
      step="1"
      min="0"
    />
  );
}

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
                              <AssignmentScoreInput
                                assignmentId={assignment.id}
                                field="earned"
                                value={assignment.earned}
                                isChanged={isChanged}
                                onScoreChange={handleScoreChange}
                                onScoreFocus={handleScoreFocus}
                                onScoreBlur={handleScoreBlur}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <AssignmentScoreInput
                                assignmentId={assignment.id}
                                field="possible"
                                value={assignment.possible}
                                isChanged={isChanged}
                                onScoreChange={handleScoreChange}
                                onScoreFocus={handleScoreFocus}
                                onScoreBlur={handleScoreBlur}
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
                  {[
                    ["Major Summative", "Major Summative %"],
                    ["Minor Summative", "Minor Summative %"],
                    ["Graded Formative", "Graded Formative %"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs font-medium text-foreground">{label}</label>
                      <input
                        type="number"
                        value={customWeights[key]}
                        onChange={(e) => handleCustomWeightChange(key, e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        step="0.1"
                        min="0"
                        max="100"
                      />
                    </div>
                  ))}
                </div>
                {(() => {
                  const total =
                    customWeights["Major Summative"] +
                    customWeights["Minor Summative"] +
                    customWeights["Graded Formative"];
                  const invalid = Math.abs(total - 100) > 0.01;
                  return (
                    <>
                      <div className="mt-3 text-xs text-muted-foreground">
                        Total: {total}%
                        {invalid && <span className="ml-2 text-red-600">(Must equal 100%)</span>}
                      </div>
                      <button
                        onClick={handleCustomWeightsApply}
                        disabled={invalid}
                        className="mt-3 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Apply Custom Weights
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </AppPageLayout>
  );
}

