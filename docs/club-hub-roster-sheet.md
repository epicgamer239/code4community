# Club Hub roster → Google Sheet

Live mirror per seminar club tab: every **club member**, with **Name**, **Email**, **Seminar** (synced from memberships), plus teacher **Left** / **Arrived** checkboxes. Hidden **User ID** is for sync only. Gold/Maroon for the Student meeting sheet are derived from memberships (no separate seminar-signup collection).

## Setup

1. Spreadsheet: [Club Rosters](https://docs.google.com/spreadsheets/d/1fdVX9URoMzroPllhTuZzINXzdpekwgoO_BDmF9NBN6c/edit) (`CLUB_ROSTER_SPREADSHEET_ID` is set in Cloud Build / Cloud Run).
2. **Share** the sheet with **`firebase-adminsdk-fbsvc@code4community26.iam.gserviceaccount.com`** as **Editor** (required once).
3. Enable [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com) on project `code4community26`.
4. Set env on Cloud Run (or local):
   - `CLUB_ROSTER_SPREADSHEET_ID=<spreadsheet id>`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` (already used for Admin SDK)

5. Bootstrap tabs + initial data (Club Hub admin, signed in):

```bash
curl -X POST https://code4community26.web.app/api/club-hub/admin/roster-sheet-bootstrap \
  -H "Authorization: Bearer <firebase id token>"
```

Re-run bootstrap after deploying attendance columns so existing tabs get **Left** / **Arrived**, checkboxes, and column protection.

## Behavior

- Join / leave on the site updates the club tab within a few seconds.
- Sync rewrites **Name**, **Email**, and **Seminar**, and preserves **Left** / **Arrived** per student (matched by hidden User ID).
- **Student meeting clubs** tab: name, Gold day club, Maroon day club (from the student's joined seminar clubs — one each), optional **special seminar** columns (one per admin-created event), then hidden **User ID** — updates when a student joins or leaves a club, or when a coordinator adds a **Special seminar event** on **Club Hub admin**.
- **Left not arrived** tab: Club / Name / Email / Seminar for students with **Left** checked and **Arrived** unchecked on a club tab (no checkboxes here). Checkbox edits on club tabs add/remove that student. Use **Rebuild Left not arrived** only for a full rescan.
- Hidden tab `_rosterMeta` and column **User ID** are for sync only.
- If env is unset, join/leave still works; sheet sync is skipped.

## Columns (each club tab)

| Column | Who edits | Notes |
|--------|-----------|--------|
| Name, Email, Seminar | Sync only | Protected — teachers cannot edit |
| Left, Arrived | Teachers / sponsors | Checkboxes; not cleared on sync |
| User ID | Sync only | Hidden + protected |

## How to test protection

1. Share the spreadsheet with a **non-owner** Google account as **Editor** (e.g. High School Staff).
2. As that Editor:
   - Club tab: try editing **Name** / Home / Student meeting → blocked.
   - Club tab: tick **Left** / **Arrived** only → works.
3. **Data → Protect sheets and ranges** — club tabs show `Club Hub — only Left/Arrived editable`; Home / Student meeting / Left not arrived show `Club Hub — read only`.

Re-run roster bootstrap (or `lockDownRosterSpreadsheet`) after deploy to refresh locks on every tab.

## Sponsors / teachers

Share as **Editor**. They may **only** edit **Left** / **Arrived** checkboxes on club tabs. Everything else (Home, Student meeting clubs, Left not arrived, Name/Email/Seminar/User ID, headers) is locked to the service account + `shail40926@gmail.com`. Do not unprotect those ranges.

## Home tab + live Left not arrived

1. Spreadsheet → **Extensions → Apps Script**
2. Paste / replace with `google-apps-script/club-roster-nav-tab.gs`, save
3. Run **`installLeftNotArrivedTrigger`** once **as the sheet owner** (authorize) — required so teacher checkbox edits can update the protected report tab
4. Optional: menu **Club Rosters → Rebuild Home links** / **Rebuild Left not arrived**

After that, ticking Left (and not Arrived) adds that student to **Left not arrived**; checking Arrived (or unchecking Left) removes them. Menu **Rebuild** still rescans every club tab.
