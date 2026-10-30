/**
 * Club Rosters workbook helpers (bound to the Club Rosters spreadsheet).
 *
 * Setup:
 * 1. Extensions → Apps Script → paste this file → Save
 * 2. Run installLeftNotArrivedTrigger once (authorize as the sheet owner)
 * 3. Optional: Club Rosters menu → Rebuild Home links / Rebuild Left not arrived
 *
 * installLeftNotArrivedTrigger installs an onEdit that runs as YOU (the owner),
 * so when a teacher ticks Left/Arrived the report tab still updates under protection.
 */

var NAV_TAB_NAME = "Home";
var LEFT_NOT_ARRIVED_TAB = "Left not arrived";
var LEFT_COL = 4; // D
var ARRIVED_COL = 5; // E
var SKIP_TABS = {
  Home: true,
  _rosterMeta: true,
  Sheet1: true,
  "Student meeting clubs": true,
  "Left not arrived": true,
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Club Rosters")
    .addItem("Rebuild Home links", "buildClubRosterNavTab")
    .addItem("Rebuild Left not arrived", "rebuildLeftNotArrivedReport")
    .addItem("Install Left/Arrived auto-refresh", "installLeftNotArrivedTrigger")
    .addItem("Fit columns on every tab", "fitColumnsOnEveryTab")
    .addToUi();
}

/** Widen each visible column to its text, on every tab. */
function fitColumnsOnEveryTab() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var fitted = 0;

  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) continue;

    for (var col = 1; col <= lastCol; col++) {
      if (sheet.isColumnHiddenByUser(col)) continue;
      sheet.autoResizeColumn(col);
      var width = sheet.getColumnWidth(col) + 24;
      sheet.setColumnWidth(col, Math.min(width, 520));
    }
    fitted++;
  }

  Logger.log("Fitted columns on " + fitted + " tabs.");
}

/**
 * Installable onEdit (runs as the owner who installed it).
 * Adds/removes only the edited student on Left not arrived (no full workbook scan).
 */
function onClubAttendanceEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var clubName = sheet.getName();
  if (SKIP_TABS[clubName]) return;

  var col = e.range.getColumn();
  var lastCol = e.range.getLastColumn();
  var touchesAttendance =
    (col <= LEFT_COL && lastCol >= LEFT_COL) ||
    (col <= ARRIVED_COL && lastCol >= ARRIVED_COL);
  if (!touchesAttendance) return;

  var startRow = e.range.getRow();
  var endRow = e.range.getLastRow();
  if (endRow < 2) return;
  if (startRow < 2) startRow = 2;

  var width = Math.max(sheet.getLastColumn(), ARRIVED_COL);
  var header = sheet.getRange(1, 1, 1, width).getValues()[0] || [];
  var leftIdx = findHeaderIndex_(header, "left");
  var arrivedIdx = findHeaderIndex_(header, "arrived");
  if (leftIdx < 0 || arrivedIdx < 0) return;
  var cols = {
    leftIdx: leftIdx,
    arrivedIdx: arrivedIdx,
    nameIdx: findHeaderIndex_(header, "name"),
    emailIdx: findHeaderIndex_(header, "email"),
    seminarIdx: findHeaderIndex_(header, "seminar"),
    width: width,
  };

  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) return;
  try {
    var report = ensureLeftNotArrivedSheet_();
    for (var row = startRow; row <= endRow; row++) {
      syncLeftNotArrivedForClubRow_(sheet, clubName, row, cols, report);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Read one club roster row; add to report if Left && !Arrived, else remove.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} clubSheet
 * @param {string} clubName
 * @param {number} row 1-based
 * @param {{leftIdx:number,arrivedIdx:number,nameIdx:number,emailIdx:number,seminarIdx:number,width:number}} cols
 * @param {GoogleAppsScript.Spreadsheet.Sheet} report
 */
function syncLeftNotArrivedForClubRow_(clubSheet, clubName, row, cols, report) {
  var values = clubSheet.getRange(row, 1, 1, cols.width).getValues()[0] || [];
  var studentName = cols.nameIdx >= 0 ? String(values[cols.nameIdx] || "").trim() : "";
  var email = cols.emailIdx >= 0 ? String(values[cols.emailIdx] || "").trim() : "";
  var seminar = cols.seminarIdx >= 0 ? String(values[cols.seminarIdx] || "").trim() : "";
  if (!studentName && !email) return;

  var shouldList = isChecked_(values[cols.leftIdx]) && !isChecked_(values[cols.arrivedIdx]);
  var matchRow = findLeftNotArrivedRow_(report, clubName, email, studentName);

  if (shouldList) {
    var line = [clubName, studentName, email, seminar];
    if (matchRow > 0) {
      report.getRange(matchRow, 1, 1, 4).setValues([line]);
    } else {
      report.appendRow(line);
    }
  } else if (matchRow > 0) {
    report.deleteRow(matchRow);
  }
}

/** @returns {GoogleAppsScript.Spreadsheet.Sheet} */
function ensureLeftNotArrivedSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var report = ss.getSheetByName(LEFT_NOT_ARRIVED_TAB);
  if (!report) {
    report = ss.insertSheet(LEFT_NOT_ARRIVED_TAB, 1);
    report.getRange(1, 1, 1, 4).setValues([["Club", "Name", "Email", "Seminar"]]);
    report.getRange(1, 1, 1, 4).setFontWeight("bold");
    report.setFrozenRows(1);
  } else if (report.getLastRow() < 1) {
    report.getRange(1, 1, 1, 4).setValues([["Club", "Name", "Email", "Seminar"]]);
    report.getRange(1, 1, 1, 4).setFontWeight("bold");
    report.setFrozenRows(1);
  }
  return report;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} report
 * @param {string} clubName
 * @param {string} email
 * @param {string} studentName
 * @returns {number} 1-based row or 0
 */
function findLeftNotArrivedRow_(report, clubName, email, studentName) {
  var last = report.getLastRow();
  if (last < 2) return 0;
  var data = report.getRange(2, 1, last - 1, 3).getValues();
  var emailKey = String(email || "").trim().toLowerCase();
  var nameKey = String(studentName || "").trim().toLowerCase();
  for (var i = 0; i < data.length; i++) {
    var club = String(data[i][0] || "");
    if (club !== clubName) continue;
    var rowEmail = String(data[i][2] || "").trim().toLowerCase();
    var rowName = String(data[i][1] || "").trim().toLowerCase();
    if (emailKey && rowEmail === emailKey) return i + 2;
    if (!emailKey && nameKey && rowName === nameKey) return i + 2;
  }
  return 0;
}

/** One-time: install the attendance onEdit trigger (run as sheet owner). */
function installLeftNotArrivedTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "onClubAttendanceEdit") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("onClubAttendanceEdit")
    .forSpreadsheet(ss)
    .onEdit()
    .create();
  SpreadsheetApp.getUi().alert(
    "Installed. Ticking Left/Arrived adds or removes that student on “Left not arrived” (no full scan).",
  );
}

function rebuildLeftNotArrivedReport() {
  var n = rebuildLeftNotArrivedReport_();
  try {
    SpreadsheetApp.getUi().alert("Left not arrived updated (" + n + " student" + (n === 1 ? "" : "s") + ").");
  } catch (err) {
    Logger.log("Left not arrived updated (" + n + " rows).");
  }
}

/** @returns {number} row count */
function rebuildLeftNotArrivedReport_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var report = ss.getSheetByName(LEFT_NOT_ARRIVED_TAB);
  if (!report) {
    report = ss.insertSheet(LEFT_NOT_ARRIVED_TAB, 1);
  }

  var rows = [];
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    var clubName = sh.getName();
    if (SKIP_TABS[clubName]) continue;

    var lastRow = sh.getLastRow();
    if (lastRow < 2) continue;
    var lastCol = Math.max(sh.getLastColumn(), ARRIVED_COL);
    var values = sh.getRange(1, 1, lastRow, lastCol).getValues();
    var header = values[0] || [];
    var leftIdx = findHeaderIndex_(header, "left");
    var arrivedIdx = findHeaderIndex_(header, "arrived");
    var nameIdx = findHeaderIndex_(header, "name");
    var emailIdx = findHeaderIndex_(header, "email");
    var seminarIdx = findHeaderIndex_(header, "seminar");
    if (leftIdx < 0 || arrivedIdx < 0) continue;

    for (var r = 1; r < values.length; r++) {
      var row = values[r] || [];
      if (!isChecked_(row[leftIdx]) || isChecked_(row[arrivedIdx])) continue;
      rows.push([
        clubName,
        nameIdx >= 0 ? String(row[nameIdx] || "") : "",
        emailIdx >= 0 ? String(row[emailIdx] || "") : "",
        seminarIdx >= 0 ? String(row[seminarIdx] || "") : "",
      ]);
    }
  }

  rows.sort(function (a, b) {
    var c = String(a[0]).localeCompare(String(b[0]), undefined, { sensitivity: "base" });
    if (c !== 0) return c;
    return String(a[1]).localeCompare(String(b[1]), undefined, { sensitivity: "base" });
  });

  report.clear();
  report.getRange(1, 1, 1, 4).setValues([["Club", "Name", "Email", "Seminar"]]);
  report.getRange(1, 1, 1, 4).setFontWeight("bold");
  if (rows.length) {
    report.getRange(2, 1, rows.length, 4).setValues(rows);
  }
  report.setFrozenRows(1);
  return rows.length;
}

/** @param {unknown[]} header @param {string} label */
function findHeaderIndex_(header, label) {
  var want = String(label || "").toLowerCase();
  for (var i = 0; i < header.length; i++) {
    if (String(header[i] || "").trim().toLowerCase() === want) return i;
  }
  return -1;
}

/** @param {unknown} value */
function isChecked_(value) {
  return value === true || value === "TRUE" || value === "true" || value === 1 || value === "1";
}

function buildClubRosterNavTab() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var nav = ss.getSheetByName(NAV_TAB_NAME);
  if (!nav) {
    nav = ss.insertSheet(NAV_TAB_NAME, 0);
  } else {
    ss.setActiveSheet(nav);
    ss.moveActiveSheet(0);
    nav.clear();
  }

  nav.getRange(1, 1, 1, 2).setValues([["Club", "Open roster"]]);
  nav.getRange(1, 1, 1, 2).setFontWeight("bold");

  var links = [];
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    var name = sh.getName();
    if (SKIP_TABS[name]) continue;
    var gid = sh.getSheetId();
    var label = name.replace(/"/g, '""');
    links.push([name, '=HYPERLINK("#gid=' + gid + '", "' + label + '")']);
  }

  links.sort(function (a, b) {
    return String(a[0]).localeCompare(String(b[0]), undefined, { sensitivity: "base" });
  });

  if (links.length) {
    nav.getRange(2, 1, links.length, 1).setValues(
      links.map(function (row) {
        return [row[0]];
      }),
    );
    nav.getRange(2, 2, links.length, 1).setFormulas(
      links.map(function (row) {
        return [row[1]];
      }),
    );
  }

  nav.setFrozenRows(1);
  nav.autoResizeColumns(1, 2);
  SpreadsheetApp.getUi().alert("Home tab updated with " + links.length + " club links.");
}
