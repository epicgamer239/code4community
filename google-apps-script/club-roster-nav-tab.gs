/**
 * Club Rosters workbook — build a "Home" tab linking to every club roster tab.
 * Bound to: https://docs.google.com/spreadsheets/d/1fdVX9URoMzroPllhTuZzINXzdpekwgoO_BDmF9NBN6c
 *
 * Setup: Extensions → Apps Script → paste this file → Run buildClubRosterNavTab once → authorize.
 * Re-run after bootstrap adds new club tabs.
 */

var NAV_TAB_NAME = "Home";
var SKIP_TABS = { Home: true, _rosterMeta: true, Sheet1: true };

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Club Rosters")
    .addItem("Rebuild Home links", "buildClubRosterNavTab")
    .addToUi();
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
    // getRange(row, column, numRows, numColumns) — 3rd arg is count, not last row
    nav.getRange(2, 1, links.length, 1).setValues(links.map(function (row) {
      return [row[0]];
    }));
    nav.getRange(2, 2, links.length, 1).setFormulas(links.map(function (row) {
      return [row[1]];
    }));
  }

  nav.setFrozenRows(1);
  nav.autoResizeColumns(1, 2);
  SpreadsheetApp.getUi().alert("Home tab updated with " + links.length + " club links.");
}
