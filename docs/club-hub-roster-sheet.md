# Club Hub roster → Google Sheet

Live mirror: **Name** and **Email** per club tab. Sponsors get **Viewer** on the spreadsheet; only the service account edits.

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

## Behavior

- Join / leave on the site updates the club tab within a few seconds.
- **Student meeting clubs** tab: name, Gold club, Maroon club — updates when a student saves on **Meeting days** (`/club-hub/meeting-days`).
- Hidden tab `_rosterMeta` and column **User ID** are for sync only.
- If env is unset, join/leave still works; sheet sync is skipped.

## Sponsors

Share the spreadsheet as **Viewer** only. Do not grant Editor — edits would be overwritten on the next sync or bootstrap.

## Home tab (links to all clubs)

1. Spreadsheet → **Extensions → Apps Script**
2. Paste `google-apps-script/club-roster-nav-tab.gs`, save
3. Run **`buildClubRosterNavTab`** once (authorize)
4. Later: menu **Club Rosters → Rebuild Home links** (or run again after new tabs exist)
