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
    // "English" alone is a language row; avoid matching surnames like "Jane English".
    if (t === "english") {
      if (trimLower === "english") return true;
      continue;
    }
    // Short UI tokens must match as whole words only — substring match would drop names
    // like "Ishanth Goli" ("Go" from the Search button) or "Hall" ("all").
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
  const [manualStudent, setManualStudent] = useState({ name: "", skills: [], performance: "medium" });
  const fileInputRef = useRef(null);

  // Schoology page parser
  const parseSchoologyPage = async (pageContent) => {
    setIsParsing(true);
    try {
      // Extract student names from Schoology members page
      // Filter out common Schoology template text and extract only student names
      const lines = pageContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      let names = [];
      
      // Try HTML patterns first
      const htmlPatterns = [
        /<div[^>]*class="[^"]*member-name[^"]*"[^>]*>([^<]+)<\/div>/gi,
        /<div[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/div>/gi,
        /<span[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/span>/gi,
        /<a[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/a>/gi,
      ];
      
      for (const pattern of htmlPatterns) {
        const matches = [...pageContent.matchAll(pattern)].map(match => match[1].trim());
        if (matches.length > 0) {
          names = [...new Set([...names, ...matches])];
        }
      }
      
      // Common Schoology template text that appears in all class lists
      const templateText = [
        "Skip to Content", "Home", "Courses", "Groups", "Resources", "More", "Grades",
        "Profile picture for", "Materials", "Updates", "Current Menu Item", "Notifications",
        "Section list", "Switch course", "Dropdown", "Switch to another course",
        "Previous", "Next", "All", "Members", "Admins", "Search members", "Go",
        "BrainPOP", "Britannica", "Canva", "DBQOnline", "Discovery Education", 
        "LockDown Browser", "MackinVIA", "McGraw Hill", "Nearpod", "OneNote", 
        "StudyMate", "WeVideo", "World Book Online", "BFW", "DataClassroom",
        "DeltaMath", "Newsela", "Access Pearson", "Information", "Grading periods",
        "SY25 MP1", "SY25 MP2", "SY25 MP3", "SY25 MP4", "English", "Change Language",
        "Support", "Privacy Policy", "Terms of Use", "PowerSchool", "Copyright",
        "DropdownMaterials", "LTI", "SSO", "K-12", "Interactivity", "Tools",
        "Click to toggle options",
      ];
      
      // Filter out template text and extract student names
      const studentNames = lines.filter(line => {
        // Skip very short lines
        if (line.length < 3) return false;

        // Schoology UI hints next to roster rows (not names)
        if (/^click\s+to\s+/i.test(line)) return false;
        
        // Skip lines with numbers
        if (/\d/.test(line)) return false;
        
        // Skip HTML tags
        if (/<[^>]+>/.test(line)) return false;
        
        // Skip template text that appears in roster page UIs (Schoology, PowerSchool, etc.)
        if (isTemplateNoiseLine(line, templateText)) {
          return false;
        }
        
        // Skip course description lines (pattern: "Course Name: (YR) Teacher Course(X) - A")
        if (line.includes('(') && line.includes(')') && line.includes(':') && line.includes('YR')) {
          return false;
        }
        
        // Must have at least 2 words (student names)
        const words = line.split(' ');
        if (words.length < 2) return false;
        
        // Accept as student name - no other restrictions
        return true;
      });
      
      names = [...new Set([...names, ...studentNames])].filter(
        (n) =>
          n &&
          !/^click\s+to\s+/i.test(n.trim()) &&
          !n.toLowerCase().includes("click to toggle options")
      );

      // Create student objects
      const students = names.map((name, index) => ({
        id: `student-${Date.now()}-${index}`,
        name: name,
        skills: [],
        performance: "medium",
        absent: false,
        previousGroups: []
      })).filter(student => student.name && student.name.length > 0);

      onStudentsUpdate(students);
      return students;
    } catch (error) {
      alert("Error parsing Schoology page. Please check the content and try again.");
      return [];
    } finally {
      setIsParsing(false);
    }
  };

  // Handle Schoology page paste
  const handleSchoologyPaste = async (e) => {
    const content = e.target.value;
    if (content) {
      await parseSchoologyPage(content);
    }
  };

  // Handle CSV file upload
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const students = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const student = {
            id: `student-${Date.now()}-${index}`,
            name: values[headers.indexOf('name')] || values[0] || '',
            email: values[headers.indexOf('email')] || values[1] || '',
            skills: values[headers.indexOf('skills')] ? values[headers.indexOf('skills')].split(';') : [],
            performance: values[headers.indexOf('performance')] || 'medium',
            gender: values[headers.indexOf('gender')] || 'other',
            absent: false,
            previousGroups: []
          };
          return student;
        }).filter(student => student.name);

        onStudentsUpdate(students);
      } catch (error) {
        alert("Error parsing CSV file. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  // Add student manually
  const addManualStudent = () => {
    if (!manualStudent.name.trim()) return;

    const newStudent = {
      id: `student-${Date.now()}`,
      name: manualStudent.name.trim(),
      skills: manualStudent.skills,
      performance: manualStudent.performance,
      absent: false,
      previousGroups: []
    };

    onStudentsUpdate([...students, newStudent]);
    setManualStudent({ name: "", skills: [], performance: "medium" });
  };

  // Remove student
  const removeStudent = (studentId) => {
    onStudentsUpdate(students.filter(s => s.id !== studentId));
  };

  // Update student
  const updateStudent = (studentId, updates) => {
    onStudentsUpdate(students.map(s => 
      s.id === studentId ? { ...s, ...updates } : s
    ));
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Student Roster Management</h3>
      
      {/* Import Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Schoology Import */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">Import</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Schoology Import</h4>
          <p className="text-sm text-gray-600 mb-4">
            Copy the members list from your Schoology course page and paste it below
          </p>
          <textarea
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[100px] w-full resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste Schoology members page content here..."
            onChange={handleSchoologyPaste}
          />
          {isParsing && (
            <div className="mt-2 text-sm text-blue-600">
              Parsing Schoology page...
            </div>
          )}
        </div>

        {/* CSV Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">Import</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">CSV Upload</h4>
          <p className="text-sm text-gray-600 mb-4">
            Upload a CSV file with student information
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Choose CSV File
          </button>
          <div className="mt-2 text-xs text-gray-500">
            Expected columns: name, email, skills, performance, gender
          </div>
        </div>
      </div>

      {/* Manual Entry */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Add Student Manually</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Student Name"
            value={manualStudent.name}
            onChange={(e) => setManualStudent({...manualStudent, name: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={manualStudent.performance}
            onChange={(e) => setManualStudent({...manualStudent, performance: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="very_low">Very Low Performance</option>
            <option value="low">Low Performance</option>
            <option value="medium">Medium Performance</option>
            <option value="high">High Performance</option>
            <option value="very_high">Very High Performance</option>
          </select>
          <button
            onClick={addManualStudent}
            disabled={!manualStudent.name.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Student
          </button>
        </div>
      </div>

      {/* Student List */}
      {students.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-gray-900">
              Student Roster ({students.length} students)
            </h4>
            <div className="text-sm text-gray-600">
              Ready for grouping!
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`border rounded-lg p-4 hover:bg-gray-50 ${
                    student.absent ? "border-amber-200 bg-amber-50/50" : "border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-900 flex flex-wrap items-center gap-2">
                        <span>{student.name}</span>
                        {student.absent && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 shrink-0">
                            Absent
                          </span>
                        )}
                      </h5>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
                      {onToggleAbsent && (
                        <button
                          type="button"
                          onClick={() => onToggleAbsent(student.id)}
                          className={`text-sm px-2 py-1 rounded transition-colors ${
                            student.absent
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {student.absent ? "Mark present" : "Mark absent"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeStudent(student.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  
                  {/* Editable Student Attributes */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2">Performance:</span>
                      <select
                        value={student.performance}
                        onChange={(e) => updateStudent(student.id, { performance: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="very_low">Very Low</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="very_high">Very High</option>
                      </select>
                    </div>
                    
                    {student.skills && student.skills.length > 0 && (
                      <div>
                        <span className="text-gray-500 mr-2">Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {student.skills.map((skill, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
