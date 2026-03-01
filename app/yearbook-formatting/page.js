"use client";
import { useState, useEffect, useLayoutEffect } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";
import Footer from "../../components/Footer";

export default function YearbookFormatting() {
  useLayoutEffect(() => {
    document.title = "Code4Community | Yearbook Formatting";
  }, []);
  
  const [pastedText, setPastedText] = useState("");
  const [photographer, setPhotographer] = useState("");
  const [formattedOutput, setFormattedOutput] = useState("");
  const [error, setError] = useState(null);

  const parseNames = (text) => {
    if (!text.trim()) {
      return [];
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const students = [];
    let currentFirstName = "";
    let currentLastName = "";
    let currentGrade = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line contains "Grade:" - handle cases like "Grade: 12" or "Grade: 12Precious"
      const gradeMatch = line.match(/Grade:\s*(\d+)/i);
      if (gradeMatch) {
        // Normalize grade by removing leading zeros (e.g., "09" -> "9")
        currentGrade = parseInt(gradeMatch[1], 10).toString();
        
        // If we have a first name but no last name, the previous line was the last name
        if (currentFirstName && !currentLastName && i > 0) {
          currentLastName = lines[i - 1];
        }
        
        // If we have both names and grade, save the student
        if (currentFirstName && currentLastName && currentGrade) {
          students.push({
            firstName: currentFirstName,
            lastName: currentLastName,
            grade: currentGrade
          });
        }
        
        // Reset for next student
        currentFirstName = "";
        currentLastName = "";
        currentGrade = "";
        continue;
      }

      // Check if this looks like a name (not "Grade:")
      if (!line.match(/Grade:/i)) {
        // If we don't have a first name yet, this is the first name
        if (!currentFirstName) {
          currentFirstName = line;
        } else if (!currentLastName) {
          // We have a first name, so this must be the last name
          currentLastName = line;
        } else {
          // We have both names but no grade yet - this might be a new student
          // Save the previous student if we have all data (shouldn't happen in normal flow)
          // Start a new student
          currentFirstName = line;
          currentLastName = "";
          currentGrade = "";
        }
      }
    }

    // Don't forget the last student if we have all the data
    if (currentFirstName && currentLastName && currentGrade) {
      students.push({
        firstName: currentFirstName,
        lastName: currentLastName,
        grade: currentGrade
      });
    }

    return students;
  };

  const formatOutput = (students, photographer) => {
    if (students.length === 0) {
      return "";
    }

    // Get grade label (singular)
    const getGradeLabelSingular = (grade) => {
      return grade === "12" ? "Senior" : 
             grade === "11" ? "Junior" : 
             grade === "10" ? "Sophomore" : 
             grade === "9" ? "Freshman" : 
             `Grade ${grade}`;
    };

    // Get grade label (plural)
    const getGradeLabelPlural = (grade) => {
      return grade === "12" ? "Seniors" : 
             grade === "11" ? "Juniors" : 
             grade === "10" ? "Sophomores" : 
             grade === "9" ? "Freshmen" : 
             `Grade ${grade}`;
    };

    // Group students by grade
    const studentsByGrade = {};
    students.forEach(student => {
      if (!studentsByGrade[student.grade]) {
        studentsByGrade[student.grade] = [];
      }
      studentsByGrade[student.grade].push(student);
    });

    // Sort grades in descending order: Seniors (12) -> Juniors (11) -> Sophomores (10) -> Freshmen (9)
    // Empty grade categories are automatically skipped since they're not in studentsByGrade
    const sortedGrades = Object.keys(studentsByGrade).sort((a, b) => parseInt(b) - parseInt(a));
    
    // Format each grade group
    const gradeGroups = sortedGrades.map((grade, gradeIndex) => {
      const gradeStudents = studentsByGrade[grade];
      const isPlural = gradeStudents.length > 1;
      let gradeLabel = isPlural ? getGradeLabelPlural(grade) : getGradeLabelSingular(grade);
      
      // Lowercase grade label after the first one
      if (gradeIndex > 0) {
        gradeLabel = gradeLabel.charAt(0).toLowerCase() + gradeLabel.slice(1);
      }
      
      // Format names for this grade group - follow standard English conventions
      // 2 students: "Student1 and Student2" (no comma)
      // 3+ students: "Student1, Student2, and Student3" (commas with "and" before last)
      const studentCount = gradeStudents.length;
      if (studentCount === 1) {
        // Single student
        const student = gradeStudents[0];
        return `${gradeLabel} ${student.firstName} ${student.lastName}`;
      } else if (studentCount === 2) {
        // Two students: "Student1 and Student2" (no comma)
        const student1 = gradeStudents[0];
        const student2 = gradeStudents[1];
        return `${gradeLabel} ${student1.firstName} ${student1.lastName} and ${student2.firstName} ${student2.lastName}`;
      } else {
        // Three or more students: "Student1, Student2, and Student3" (commas with "and" before last)
        const names = gradeStudents.map((student, index) => {
          const fullName = `${student.firstName} ${student.lastName}`;
          if (index === studentCount - 1) {
            return `and ${fullName}`;
          }
          return fullName;
        }).join(", ");
        return `${gradeLabel} ${names}`;
      }
    });

    // Join all grade groups with commas and "and" before the last group
    // Format: "Group1, Group2, and Group3"
    let nameList = "";
    if (gradeGroups.length === 1) {
      nameList = gradeGroups[0];
    } else {
      // Multiple groups: always use commas with "and" before last
      nameList = gradeGroups.slice(0, -1).join(", ") + ", and " + gradeGroups[gradeGroups.length - 1];
    }

    // Add photographer if provided
    const photographerText = photographer ? ` (taken by ${photographer})` : "";
    
    return `1. ${nameList}${photographerText}.`;
  };

  const handleFormat = () => {
    setError(null);
    
    if (!pastedText.trim()) {
      setError("Please paste the names first");
      return;
    }

    try {
      const students = parseNames(pastedText);
      
      if (students.length === 0) {
        setError("No valid name data found. Please check the format.");
        return;
      }

      const formatted = formatOutput(students, photographer);
      setFormattedOutput(formatted);
    } catch (err) {
      console.error("Error formatting:", err);
      setError("An error occurred while formatting. Please check your input.");
    }
  };

  const handleCopy = () => {
    if (formattedOutput) {
      navigator.clipboard.writeText(formattedOutput).then(() => {
        // Show temporary success message
        const button = document.getElementById('copy-button');
        if (button) {
          const originalText = button.textContent;
          button.textContent = "Copied!";
          button.classList.add('bg-green-500');
          setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('bg-green-500');
          }, 2000);
        }
      }).catch(err => {
        console.error("Failed to copy:", err);
        setError("Failed to copy to clipboard");
      });
    }
  };

  const handleClear = () => {
    setPastedText("");
    setPhotographer("");
    setFormattedOutput("");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar title="Yearbook Formatting" />
      
      <div className="flex-1 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-6">Yearbook Formatting</h1>
          
          <div className="space-y-6">
            {/* Input Section */}
            <div className="card-elevated p-6 rounded-xl">
              <h2 className="text-xl font-semibold text-foreground mb-4">Input</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Paste names (one per line, format: FirstName, LastName, Grade: XX):
                  </label>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`Luke
Swanson
Grade: 10

Chloe
Wright
Grade: 11

Kyle
Ferguson
Grade: 12`}
                    className="w-full h-64 px-4 py-2 text-sm text-foreground bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Format: First name on one line, last name on next line, then &quot;Grade: XX&quot; on the next line. Separate entries with blank lines.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Photographer Name (optional):
                  </label>
                  <input
                    type="text"
                    value={photographer}
                    onChange={(e) => setPhotographer(e.target.value)}
                    placeholder="e.g., Shail Shah"
                    className="w-full px-4 py-2 text-sm text-foreground bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleFormat}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Format
                  </button>
                  <button
                    onClick={handleClear}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* Output Section */}
            {formattedOutput && (
              <div className="card-elevated p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Formatted Output</h2>
                  <button
                    id="copy-button"
                    onClick={handleCopy}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <textarea
                  value={formattedOutput}
                  readOnly
                  className="w-full h-48 px-4 py-2 text-sm text-foreground bg-muted/50 border border-border rounded-md resize-none font-mono"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

