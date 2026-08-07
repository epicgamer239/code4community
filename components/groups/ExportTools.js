"use client";

import { useState } from "react";

export default function ExportTools({ groups, students }) {
  const [includeDetails, setIncludeDetails] = useState(true);

  const generatePrintableCards = () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Group Cards</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .card {
            border: 2px solid #333;
            margin: 20px;
            padding: 20px;
            width: 300px;
            height: 200px;
            page-break-inside: avoid;
            display: inline-block;
            vertical-align: top;
          }
          .card-header {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
          }
          .student-list { margin: 10px 0; }
          .student { margin: 5px 0; font-size: 14px; }
          .performance-high { color: #28a745; font-weight: bold; }
          .performance-medium { color: #ffc107; font-weight: bold; }
          .performance-low { color: #dc3545; font-weight: bold; }
          @media print {
            .card { margin: 10px; padding: 15px; }
          }
        </style>
      </head>
      <body>
        <h1>Student Group Cards</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>

        ${groups
          .map(
            (group) => `
          <div class="card">
            <div class="card-header">${group.name}</div>
            <div class="student-list">
              ${group.members
                .map(
                  (student) => `
                <div class="student">
                  <strong>${student.name}</strong>
                  ${
                    includeDetails
                      ? `
                    <br>
                    <span class="performance-${student.performance}">${student.performance}</span>
                    ${
                      student.skills && student.skills.length > 0
                        ? `<br><small>Skills: ${student.skills.join(", ")}</small>`
                        : ""
                    }
                  `
                      : ""
                  }
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `
          )
          .join("")}
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const generateSlideDeck = () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Group Presentation</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: white;
          }
          .slide {
            width: 100vw;
            height: 100vh;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            padding: 40px;
            box-sizing: border-box;
          }
          .slide-header {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 30px;
            text-align: center;
            color: #2c3e50;
          }
          .groups-container {
            display: flex;
            flex-wrap: wrap;
            gap: 30px;
            justify-content: center;
            flex: 1;
          }
          .group-card {
            border: 3px solid #3498db;
            border-radius: 10px;
            padding: 20px;
            min-width: 250px;
            background: #ecf0f1;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .group-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
            background: #3498db;
            color: white;
            padding: 10px;
            border-radius: 5px;
            margin: -20px -20px 15px -20px;
          }
          .student {
            margin: 8px 0;
            font-size: 16px;
            padding: 5px;
            background: white;
            border-radius: 3px;
          }
          .summary {
            text-align: center;
            margin-top: 20px;
            font-size: 18px;
            color: #7f8c8d;
          }
        </style>
      </head>
      <body>
        ${groups
          .map(
            (group, index) => `
          <div class="slide">
            <div class="slide-header">Group ${index + 1}</div>
            <div class="groups-container">
              ${groups
                .map(
                  (g) => `
                <div class="group-card">
                  <div class="group-title">${g.name}</div>
                  ${g.members
                    .map(
                      (student) => `
                    <div class="student">
                      <strong>${student.name}</strong>
                      ${includeDetails ? `<br><small>${student.performance}</small>` : ""}
                    </div>
                  `
                    )
                    .join("")}
                </div>
              `
                )
                .join("")}
            </div>
            <div class="summary">
              Total Groups: ${groups.length} | Active Students: ${students.filter((s) => !s.absent).length}
            </div>
          </div>
        `
          )
          .join("")}
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const generateEmailList = () => {
    const emailContent = groups
      .map(
        (group) =>
          `${group.name}:\n${group.members
            .map((student) => `  - ${student.name} (${student.performance})`)
            .join("\n")}`
      )
      .join("\n\n");

    const fullContent = `Student Groups - ${new Date().toLocaleDateString()}\n\n${emailContent}\n\nTotal: ${groups.length} groups, ${students.filter((s) => !s.absent).length} students`;

    downloadFile(fullContent, "group-email-list.txt", "text/plain");
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Export</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Print cards, open a slide layout, or download a text list.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generatePrintableCards}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Printable cards
        </button>
        <button
          type="button"
          onClick={generateSlideDeck}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Presentation
        </button>
        <button
          type="button"
          onClick={generateEmailList}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Email list
        </button>
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={includeDetails}
          onChange={(e) => setIncludeDetails(e.target.checked)}
          className="h-4 w-4 rounded border border-neutral-300"
        />
        <span className="text-sm text-muted-foreground">
          Include performance and skills in exports
        </span>
      </label>
    </div>
  );
}
