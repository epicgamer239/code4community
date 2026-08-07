"use client";

import { useState, useEffect } from "react";

export default function ClassManager({ currentClass, onClassSelect, onClassCreate }) {
  const [classes, setClasses] = useState([]);
  const [newClassName, setNewClassName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadClassesFromStorage = () => {
    const savedClasses = localStorage.getItem("schoologyClasses");
    if (savedClasses) {
      setClasses(JSON.parse(savedClasses));
    }
  };

  useEffect(() => {
    loadClassesFromStorage();
  }, []);

  useEffect(() => {
    const onSync = () => loadClassesFromStorage();
    window.addEventListener("c4c-schoology-classes-updated", onSync);
    return () => window.removeEventListener("c4c-schoology-classes-updated", onSync);
  }, []);

  useEffect(() => {
    if (classes.length > 0) {
      localStorage.setItem("schoologyClasses", JSON.stringify(classes));
    }
  }, [classes]);

  const handleCreateClass = () => {
    if (!newClassName.trim()) return;

    const newClass = {
      id: `class-${Date.now()}`,
      name: newClassName.trim(),
      students: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    setClasses([...classes, newClass]);
    setNewClassName("");
    setShowCreateForm(false);
    onClassCreate(newClass);
  };

  const handleSelectClass = (classItem) => {
    onClassSelect(classItem);
  };

  const handleDeleteClass = (classId) => {
    const updatedClasses = classes.filter((c) => c.id !== classId);
    setClasses(updatedClasses);
    localStorage.removeItem(`classRoster-${classId}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">Classes</h3>
        <button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          {showCreateForm ? "Cancel" : "New class"}
        </button>
      </div>

      {showCreateForm && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Class name"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/30"
            onKeyDown={(e) => e.key === "Enter" && handleCreateClass()}
          />
          <button
            type="button"
            onClick={handleCreateClass}
            disabled={!newClassName.trim()}
            className="shrink-0 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create
          </button>
        </div>
      )}

      {classes.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          No classes yet. Create one to start a roster.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {classes.map((classItem) => {
            const selected = currentClass?.id === classItem.id;
            return (
              <li key={classItem.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectClass(classItem)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectClass(classItem);
                    }
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 transition-colors ${
                    selected ? "bg-muted" : "hover:bg-muted/60"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {classItem.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {classItem.students?.length || 0} students
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClass(classItem.id);
                    }}
                    className="shrink-0 text-sm text-muted-foreground hover:text-destructive"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
