"use client";

import { useState, useRef, useEffect } from "react";
import StudentRosterManager from "./StudentRosterManager";
import ConstraintEngine from "./ConstraintEngine";
import GroupingAlgorithm from "./GroupingAlgorithm";
import GroupDisplay from "./GroupDisplay";
import ExportTools from "./ExportTools";
import ClassManager from "./ClassManager";

const TABS = [
  { id: "roster", label: "Roster" },
  { id: "constraints", label: "Constraints" },
  { id: "config", label: "Settings" },
  { id: "results", label: "Results" },
];

export default function GroupGenerator({ embedded = false }) {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [constraints, setConstraints] = useState({
    hardBlocks: [],
    buddyPairs: [],
    avoidPrevious: false,
    previousGroups: [],
  });
  const [groupingConfig, setGroupingConfig] = useState({
    mode: "byNumber",
    numberOfGroups: 4,
    studentsPerGroup: 4,
    strategy: "balanced",
  });
  const [activeTab, setActiveTab] = useState("roster");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);
  const currentClassRef = useRef(null);
  currentClassRef.current = currentClass;

  useEffect(() => {
    const savedCurrentClass = localStorage.getItem("currentClass");
    if (savedCurrentClass) {
      const classData = JSON.parse(savedCurrentClass);
      setCurrentClass(classData);

      const rosterKey = `classRoster-${classData.id}`;
      const savedRoster = localStorage.getItem(rosterKey);
      if (savedRoster) {
        setStudents(JSON.parse(savedRoster));
      }
    }
  }, []);

  useEffect(() => {
    const cc = currentClassRef.current;
    if (!cc?.id) return;

    const rosterKey = `classRoster-${cc.id}`;
    localStorage.setItem(rosterKey, JSON.stringify(students));
    const lastModified = new Date().toISOString();
    const updated = { ...cc, students, lastModified };
    localStorage.setItem("currentClass", JSON.stringify(updated));

    try {
      const raw = localStorage.getItem("schoologyClasses");
      if (raw) {
        const list = JSON.parse(raw);
        const idx = list.findIndex((c) => c.id === cc.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], students, lastModified };
          localStorage.setItem("schoologyClasses", JSON.stringify(list));
        }
      }
    } catch (_) {}

    setCurrentClass(updated);

    const t = window.setTimeout(() => {
      window.dispatchEvent(new Event("c4c-schoology-classes-updated"));
    }, 0);
    return () => window.clearTimeout(t);
  }, [students, currentClass?.id]);

  const handleStudentsUpdate = (newStudents) => {
    setStudents(newStudents);
    setGroups([]);
  };

  const handleConstraintsUpdate = (newConstraints) => {
    setConstraints(newConstraints);
    setGroups([]);
  };

  const handleConfigUpdate = (newConfig) => {
    setGroupingConfig(newConfig);
    setGroups([]);
  };

  const handleClassSelect = (classItem) => {
    setCurrentClass(classItem);
    localStorage.setItem("currentClass", JSON.stringify(classItem));

    const rosterKey = `classRoster-${classItem.id}`;
    const savedRoster = localStorage.getItem(rosterKey);
    if (savedRoster) {
      setStudents(JSON.parse(savedRoster));
    } else {
      setStudents([]);
    }

    setGroups([]);
    setActiveTab("roster");
  };

  const handleClassCreate = (newClass) => {
    setCurrentClass(newClass);
    localStorage.setItem("currentClass", JSON.stringify(newClass));
    setStudents([]);
    setGroups([]);
    setActiveTab("roster");
  };

  /**
   * @param {unknown} rosterOverride — when a full roster array; non-arrays ignored (e.g. click events).
   * @param {{ selectResultsTab?: boolean }} [options]
   */
  const generateGroups = async (rosterOverride, { selectResultsTab = true } = {}) => {
    const roster = Array.isArray(rosterOverride) ? rosterOverride : students;
    if (roster.length === 0) {
      alert("Please add students first!");
      return;
    }

    setIsGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newGroups = GroupingAlgorithm.generate(roster, constraints, groupingConfig);

      setGroups(newGroups);
      if (selectResultsTab) {
        setActiveTab("results");
      }
    } catch (_) {
      alert("Error generating groups. Please check your constraints and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStudentSwap = (fromGroup, fromIndex, toGroup, toIndex) => {
    const newGroups = [...groups];
    const temp = newGroups[fromGroup].members[fromIndex];
    newGroups[fromGroup].members[fromIndex] = newGroups[toGroup].members[toIndex];
    newGroups[toGroup].members[toIndex] = temp;
    setGroups(newGroups);
  };

  const handleStudentAbsentToggle = (studentId, { selectResultsTab = true } = {}) => {
    if (studentId == null) return;
    const newStudents = students.map((s) =>
      s.id === studentId ? { ...s, absent: !s.absent } : s
    );
    setStudents(newStudents);

    if (groups.length > 0) {
      void generateGroups(newStudents, { selectResultsTab });
    }
  };

  const shell = embedded
    ? "rounded-xl border border-border bg-muted/30 p-4 md:p-5"
    : "flex-1 px-4 py-6 sm:px-6 lg:px-8";

  return (
    <div className={shell}>
      <div className="mx-auto max-w-5xl space-y-6">
        {embedded && (
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Student Groups
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build balanced groups with roster constraints and export options.
            </p>
          </div>
        )}

        <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <ClassManager
            currentClass={currentClass}
            onClassSelect={handleClassSelect}
            onClassCreate={handleClassCreate}
          />
          {currentClass && (
            <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{currentClass.name}</span>
              {" · "}
              {students.length} student{students.length === 1 ? "" : "s"}
              {" · "}
              Updated{" "}
              {new Date(currentClass.lastModified).toLocaleString(undefined, {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card">
          <nav className="flex gap-1 overflow-x-auto border-b border-border px-2" aria-label="Group tools">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="p-4 sm:p-5">
            {activeTab === "roster" && (
              <StudentRosterManager
                students={students}
                onStudentsUpdate={handleStudentsUpdate}
                onToggleAbsent={(id) =>
                  handleStudentAbsentToggle(id, { selectResultsTab: false })
                }
              />
            )}

            {activeTab === "constraints" && (
              <ConstraintEngine
                students={students}
                constraints={constraints}
                onConstraintsUpdate={handleConstraintsUpdate}
              />
            )}

            {activeTab === "config" && (
              <div className="max-w-xl space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Group settings</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose how many groups to create and how to balance them.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Mode
                    </label>
                    <select
                      value={groupingConfig.mode}
                      onChange={(e) =>
                        handleConfigUpdate({
                          ...groupingConfig,
                          mode: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/30"
                    >
                      <option value="byNumber">Number of groups</option>
                      <option value="bySize">Students per group</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      {groupingConfig.mode === "byNumber"
                        ? "Number of groups"
                        : "Students per group"}
                    </label>
                    <input
                      type="number"
                      min="2"
                      max={groupingConfig.mode === "byNumber" ? 10 : 8}
                      value={
                        groupingConfig.mode === "byNumber"
                          ? groupingConfig.numberOfGroups || 4
                          : groupingConfig.studentsPerGroup || 4
                      }
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10) || 4;
                        handleConfigUpdate({
                          ...groupingConfig,
                          [groupingConfig.mode === "byNumber"
                            ? "numberOfGroups"
                            : "studentsPerGroup"]: value,
                        });
                      }}
                      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Strategy
                  </label>
                  <select
                    value={groupingConfig.strategy}
                    onChange={(e) =>
                      handleConfigUpdate({
                        ...groupingConfig,
                        strategy: e.target.value,
                      })
                    }
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/30"
                  >
                    <option value="balanced">Balanced (mixed levels)</option>
                    <option value="homogeneous">Similar levels</option>
                    <option value="random">Random</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => void generateGroups()}
                  disabled={isGenerating || students.length === 0}
                  className="rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isGenerating ? "Generating…" : "Generate groups"}
                </button>
              </div>
            )}

            {activeTab === "results" && (
              <div className="space-y-8">
                <GroupDisplay
                  groups={groups}
                  students={students}
                  constraints={constraints}
                  onStudentSwap={handleStudentSwap}
                  onToggleStudentAbsent={handleStudentAbsentToggle}
                  onRegenerate={() => void generateGroups()}
                />
                {groups.length > 0 && <ExportTools groups={groups} students={students} />}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
