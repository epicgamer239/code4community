# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
Code4Community — a Next.js 16 (App Router) platform for a student-led engineering club that builds free digital tools for nonprofits. Single-service architecture: one Next.js app handles both frontend and API routes.

### Commands
- **Dev server**: `npm run dev` (uses Turbopack, starts on port 3000)
- **Dev (stale UI / HMR issues)**: `npm run dev:clean` or `npm run dev:stable` (no Turbopack, clears `.next`)
- **Local prod-like UI + c4cdev login**: `npm run preview:local`
- **Firebase Storage rules (Writing Center PDFs)**: `npm run firebase:deploy:storage` (prod) / `firebase:deploy:storage:dev` (c4cdev)
- **Build**: `npm run build`
- **Lint**: `npm run lint` (see known issue below)

### Known issues
- **ESLint circular reference**: `npm run lint` currently crashes with `TypeError: Converting circular structure to JSON`. This is a pre-existing compatibility issue between `eslint-config-next@16.1.4`, `@eslint/eslintrc@3`, and ESLint 9 flat config. The `next lint` CLI subcommand was removed in Next.js 16.

### Firebase configuration
The app requires Firebase credentials for authentication features. Without `keys.dev.js`, the app falls back to `tempkeys.dev.js` (empty config) via Turbopack/webpack aliases in `next.config.mjs`. Pages load and render correctly without credentials, but authentication flows (login, signup) will fail with "invalid-api-key" errors. To configure:
1. Copy `tempkeys.dev.js` to `keys.dev.js` and fill in Firebase Console credentials (local dev uses project `c4cdev-6f9f4`).
2. Optionally set `GEMINI_API_KEY` in `.env.local` for the AI study quiz feature.

**Firestore rules and indexes** (same `firestore.rules` + `firestore.indexes.json` for both projects):
- Dev (`c4cdev-6f9f4`): `npm run firebase:deploy:firestore:dev`
- Prod (`code4community26`): `npm run firebase:deploy:firestore`
- Both: `npm run firebase:deploy:firestore:all`

Firebase CLI aliases in `.firebaserc`: `dev`, `prod` (default).

### Writing Center async (Google Form)
Async requests use an external Google Form; Apps Script posts to `/api/writing-center/google-form-sync`. Setup: `docs/writing-center-google-form.md`, script in `google-apps-script/writing-center-form-sync.gs`.

### No test framework
This repository has no automated test framework (no Jest, Vitest, Playwright, etc.). Validation is limited to build checks and manual testing.
