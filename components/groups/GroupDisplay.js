"use client";

import { useState } from "react";

export default function GroupDisplay({
  groups,
  students,
  constraints,
  onStudentSwap,
  onToggleStudentAbsent,
  onRegenerate,
}) {
  const [draggedStudent, setDraggedStudent] = useState(null);
  const [draggedFromGroup, setDraggedFromGroup] = useState(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState(null);

  const handleDragStart = (student, groupIndex, studentIndex) => {
    setDraggedStudent(student);
    setDraggedFromGroup(groupIndex);
    setDraggedFromIndex(studentIndex);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetGroupIndex, targetStudentIndex) => {
    e.preventDefault();

    if (draggedStudent && draggedFromGroup !== null && draggedFromIndex !== null) {
      onStudentSwap(draggedFromGroup, draggedFromIndex, targetGroupIndex, targetStudentIndex);
    }

    setDraggedStudent(null);
    setDraggedFromGroup(null);
    setDraggedFromIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedStudent(null);
    setDraggedFromGroup(null);
    setDraggedFromIndex(null);
  };

  const getBalanceScore = (group) => {
    if (!group.balance) return { score: 100, status: "good" };

    const avgBalance =
      ((group.balance.performance || 0) +
        (group.balance.gender || 0) +
        (group.balance.skills || 0) +
        (group.balance.diversity || 0)) /
      4;

    const score = Math.round((1 - avgBalance) * 100);

    let status = "good";
    if (score < 70) status = "poor";
    else if (score < 85) status = "fair";

    return { score, status };
  };

  if (groups.length === 0) {
    return (
      <div className="py-10 text-center">
        <h3 className="text-base font-semibold text-foreground">No groups yet</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Set your roster and settings, then generate groups to see results here.
        </p>
        <button
          type="button"
          onClick={onRegenerate}
          className="mt-5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Generate groups
        </button>
      </div>
    );
  }

  const activeCount = students.filter((s) => !s.absent).length;
  const avgBalance = Math.round(
    groups.reduce((sum, g) => sum + getBalanceScore(g).score, 0) / groups.length
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Groups</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {groups.length} groups · {activeCount} active · {avgBalance}% avg balance
          </p>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          Regenerate
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group, groupIndex) => {
          const violations = group.constraints || [];
          const balanceScore = getBalanceScore(group);
          const hasViolations = violations.length > 0;

          return (
            <div
              key={group.id}
              className={`rounded-lg border p-4 ${
                hasViolations ? "border-destructive/40" : "border-border"
              }`}
            >
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h4 className="font-medium text-foreground">{group.name}</h4>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {group.size} · {balanceScore.score}%
                </span>
              </div>

              {hasViolations && (
                <div className="mb-3 space-y-1 text-xs text-destructive">
                  {violations.map((violation, index) => (
                    <p key={index}>
                      {violation.type === "hardBlock" &&
                        "Separation constraint broken"}
                      {violation.type === "buddyPair" && "Pair should be together"}
                    </p>
                  ))}
                </div>
              )}

              <ul className="space-y-1.5">
                {group.members.map((student, studentIndex) => (
                  <li
                    key={student?.id || studentIndex}
                    draggable
                    onDragStart={() => handleDragStart(student, groupIndex, studentIndex)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, groupIndex, studentIndex)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm transition-colors ${
                      draggedStudent?.id === student?.id
                        ? "opacity-40"
                        : "hover:border-border hover:bg-muted/50"
                    } cursor-grab active:cursor-grabbing`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {student?.name || "Unknown"}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {student?.performance || "medium"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStudentAbsent(student?.id);
                      }}
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {student?.absent ? "Present" : "Absent"}
                    </button>
                  </li>
                ))}
              </ul>

              <div
                className="mt-3 rounded-md border border-dashed border-border px-2 py-2 text-center text-xs text-muted-foreground"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, groupIndex, group.members.length)}
              >
                Drop here to move
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
