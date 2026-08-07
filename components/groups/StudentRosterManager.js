"use client";

import { useState, useRef } from "react";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True if this line is portal UI / nav text, not a student name. */
function isTemplateNoiseLine(line, templateText) {
  const lower = line.toLowerCase();
  const trimLower = line.trim().toLowerCase();

  for (const term of templateText) {
    const t = term.toLowerCase();
    if (term.includes(" ")) {
      if (lower.includes(t)) return true;
      continue;
    }
    if (t === "english") {
      if (trimLower === "english") return true;
      continue;
    }
    if (term.length <= 4) {
      const re = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
      if (re.test(line)) return true;
    } else if (lower.includes(t)) {
      return true;
    }
  }
  return false;
}

export default function StudentRosterManager({ students, onStudentsUpdate, onToggleAbsent }) {
  const [isParsing, setIsParsing] = useState(false);
  const [manualStudent, setManualStudent] = useState({
    name: "",
    skills: [],
    performance: "medium",
  });
  const fileInputRef = useRef(null);

  const parseSchoologyPage = async (pageContent) => {
    setIsParsing(true);
    try {
      const lines = pageContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      let names = [];

      const htmlPatterns = [
        /<div[^>]*class="[^"]*member-name[^"]*"[^>]*>([^<]+)<\/div>/gi,
        /<div[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/div>/gi,
        /<span[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/span>/gi,
        /<a[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/a>/gi,
      ];

      for (const pattern of htmlPatterns) {
        const matches = [...pageContent.matchAll(pattern)].map((match) => match[1].trim());
        if (matches.length > 0) {
          names = [...new Set([...names, ...matches])];
        }
      }

      const templateText = [
        "Skip to Content",
        "Home",
        "Courses",
        "Groups",
        "Resources",
        "More",
        "Grades",
        "Profile picture for",
        "Materials",
        "Updates",
        "Current Menu Item",
        "Notifications",
        "Section list",
        "Switch course",
        "Dropdown",
        "Switch to another course",
        "Previous",
        "Next",
        "All",
        "Members",
        "Admins",
        "Search members",
        "Go",
        "BrainPOP",
        "Britannica",
        "Canva",
        "DBQOnline",
        "Discovery Education",
        "LockDown Browser",
        "MackinVIA",
        "McGraw Hill",
        "Nearpod",
        "OneNote",
        "StudyMate",
        "WeVideo",
        "World Book Online",
        "BFW",
        "DataClassroom",
        "DeltaMath",
        "Newsela",
        "Access Pearson",
        "Information",
        "Grading periods",
        "SY25 MP1",
        "SY25 MP2",
        "SY25 MP3",
        "SY25 MP4",
        "English",
        "Change Language",
        "Support",
        "Privacy Policy",
        "Terms of Use",
        "PowerSchool",
        "Copyright",
        "DropdownMaterials",
        "LTI",
        "SSO",
        "K-12",
        "Interactivity",
        "Tools",
        "Click to toggle options",
      ];

      const studentNames = lines.filter((line) => {
        if (line.length < 3) return false;
        if (/^click\s+to\s+/i.test(line)) return false;
        if (/\d/.test(line)) return false;
        if (/<[^>]+>/.test(line)) return false;
        if (isTemplateNoiseLine(line, templateText)) return false;
        if (line.includes("(") && line.includes(")") && line.includes(":") && line.includes("YR")) {
          return false;
        }
        if (line.split(" ").length < 2) return false;
        return true;
      });

      names = [...new Set([...names, ...studentNames])].filter(
        (n) =>
          n &&
          !/^click\s+to\s+/i.test(n.trim()) &&
          !n.toLowerCase().includes("click to toggle options")
      );

      const parsed = names
        .map((name, index) => ({
          id: `student-${Date.now()}-${index}`,
          name,
          skills: [],
          performance: "medium",
          absent: false,
          previousGroups: [],
        }))
        .filter((student) => student.name && student.name.length > 0);

      onStudentsUpdate(parsed);
      return parsed;
    } catch (_) {
      alert("Error parsing Schoology page. Please check the content and try again.");
      return [];
    } finally {
      setIsParsing(false);
    }
  };

  const handleSchoologyPaste = async (e) => {
    const content = e.target.value;
    if (content) {
      await parseSchoologyPage(content);
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split("\n").filter((line) => line.trim());
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

        const parsed = lines
          .slice(1)
          .map((line, index) => {
            const values = line.split(",").map((v) => v.trim());
            return {
              id: `student-${Date.now()}-${index}`,
              name: values[headers.indexOf("name")] || values[0] || "",
              email: values[headers.indexOf("email")] || values[1] || "",
              skills: values[headers.indexOf("skills")]
                ? values[headers.indexOf("skills")].split(";")
                : [],
              performance: values[headers.indexOf("performance")] || "medium",
              gender: values[headers.indexOf("gender")] || "other",
              absent: false,
              previousGroups: [],
            };
          })
          .filter((student) => student.name);

        onStudentsUpdate(parsed);
      } catch (_) {
        alert("Error parsing CSV file. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  const addManualStudent = () => {
    if (!manualStudent.name.trim()) return;

    const newStudent = {
      id: `student-${Date.now()}`,
      name: manualStudent.name.trim(),
      skills: manualStudent.skills,
      performance: manualStudent.performance,
      absent: false,
      previousGroups: [],
    };

    onStudentsUpdate([...students, newStudent]);
    setManualStudent({ name: "", skills: [], performance: "medium" });
  };

  const removeStudent = (studentId) => {
    onStudentsUpdate(students.filter((s) => s.id !== studentId));
  };

  const updateStudent = (studentId, updates) => {
    onStudentsUpdate(students.map((s) => (s.id === studentId ? { ...s, ...updates } : s)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Roster</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Import from Schoology or CSV, or add students one at a time.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Schoology paste</label>
          <textarea
            className="min-h-[100px] w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neutral-400/30"
            placeholder="Paste the members list from your course page…"
            onChange={handleSchoologyPaste}
          />
          {isParsing && (
            <p className="text-sm text-muted-foreground">Parsing…</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">CSV upload</label>
          <p className="text-xs text-muted-foreground">
            Columns: name, email, skills, performance, gender
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Choose CSV file
          </button>
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-5">
        <label className="block text-sm font-medium text-foreground">Add student</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Full name"
            value={manualStudent.name}
            onChange={(e) => setManualStudent({ ...manualStudent, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && addManualStudent()}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/30"
          />
          <select
            value={manualStudent.performance}
            onChange={(e) =>
              setManualStudent({ ...manualStudent, performance: e.target.value })
            }
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/30 sm:w-44"
          >
            <option value="very_low">Very low</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="very_high">Very high</option>
          </select>
          <button
            type="button"
            onClick={addManualStudent}
            disabled={!manualStudent.name.trim()}
            className="shrink-0 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      {students.length > 0 && (
        <div className="space-y-3 border-t border-border pt-5">
          <h4 className="text-sm font-medium text-foreground">
            {students.length} student{students.length === 1 ? "" : "s"}
          </h4>

          <ul className="divide-y divide-border rounded-md border border-border">
            {students.map((student) => (
              <li
                key={student.id}
                className={`flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between ${
                  student.absent ? "bg-muted/50" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {student.name}
                    </span>
                    {student.absent && (
                      <span className="text-xs text-muted-foreground">Absent</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`perf-${student.id}`}>
                      Performance
                    </label>
                    <select
                      id={`perf-${student.id}`}
                      value={student.performance}
                      onChange={(e) =>
                        updateStudent(student.id, { performance: e.target.value })
                      }
                      className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-400/30"
                    >
                      <option value="very_low">Very low</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="very_high">Very high</option>
                    </select>
                    {student.skills?.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {student.skills.join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {onToggleAbsent && (
                    <button
                      type="button"
                      onClick={() => onToggleAbsent(student.id)}
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      {student.absent ? "Present" : "Absent"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeStudent(student.id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
