# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
Code4Community — a Next.js 16 (App Router) platform for a student-led engineering club that builds free digital tools for nonprofits. Single-service architecture: one Next.js app handles both frontend and API routes.

### Repo layout
- `app/` — routes and API only
- `components/<feature>/` — UI (`layout/`, `common/`, `mathlab/`, `writing-center/`, `library-pass/`, `club-hub/`, …)
- `lib/<feature>/` — domain logic (`club-hub/`, `mathlab/`, `writing-center/`, `library-pass/`, `firebase/`); shared modules (`email.js`, `profile.js`, `admin.js`, …) stay at `lib/` root
- `utils/` — cross-cutting helpers (AuthContext, cache, rate limits, App Check)
- `public/brand|team|partners|demos|group-pics|seating-furniture` — static assets
- `firebase.js` — client Firebase entry at repo root (keeps `keys.dev.js` resolve aliases working); config/admin live under `lib/firebase/`
- SEO routes: `app/(seo)/` (sitemap + robots)
- `firestore/fragments/` — domain-split Firestore rules sources; run `npm run build:firestore-rules` before deploy
- `config/admin-emails.json` — canonical site admin allowlist; kept in sync via `npm run check:admin-emails`

### Commands
- **Dev server**: `npm run dev` (uses Turbopack, starts on port 3000)
- **Dev (stale UI / HMR issues)**: `npm run dev:clean` or `npm run dev:stable` (no Turbopack, clears `.next`)
- **Local prod-like UI + c4cdev login**: `npm run preview:local`
- **Firebase Storage rules (Writing Center PDFs)**: `npm run firebase:deploy:storage` (prod) / `firebase:deploy:storage:dev` (c4cdev)
- **Build**: `npm run build`
- **Lint**: `npm run lint` / **CI lint**: `npm run lint:ci` (zero warnings)
- **Tests**: `npm run test` (Vitest — pure helpers; rules tests skip without emulator)
- **Tests (Firestore rules)**: `npm run test:rules` (requires Java for the Firestore emulator)
- **Admin allowlist drift check**: `npm run check:admin-emails`
- **Firestore rules build**: `npm run build:firestore-rules`

### CI
GitHub Actions (`.github/workflows/ci.yml`) runs on PRs and pushes to `main`:
1. `npm ci`
2. `npm run build:firestore-rules`
3. `npm run build`
4. `npm run lint:ci`
5. `npm run test`
6. `npm run test:rules` (Firestore emulator + rules tests)

### Firebase configuration
The app requires Firebase credentials for authentication features. Without `keys.dev.js`, the app falls back to `tempkeys.dev.js` (empty config) via Turbopack/webpack aliases in `next.config.mjs`. Pages load and render correctly without credentials, but authentication flows (login, signup) will fail with "invalid-api-key" errors. To configure:
1. Copy `tempkeys.dev.js` to `keys.dev.js` and fill in Firebase Console credentials (local dev uses project `c4cdev-6f9f4`).

**Firestore rules and indexes** (same `firestore.rules` + `firestore.indexes.json` for both projects):
- Dev (`c4cdev-6f9f4`): `npm run firebase:deploy:firestore:dev`
- Prod (`code4community26`): `npm run firebase:deploy:firestore`
- Both: `npm run firebase:deploy:firestore:all`

Firebase CLI aliases in `.firebaserc`: `dev`, `prod` (default).

### Writing Center async (Google Form)
Async requests use an external Google Form; Apps Script posts to `/api/writing-center/google-form-sync`. Setup: `docs/writing-center-google-form.md`, script in `google-apps-script/writing-center-form-sync.gs`.

### Testing
Vitest covers Club Hub pure functions (`normalizeClubEvent`, `getEditableClubSlugsForUser`, `normalizeEmail`) and Firestore security rules for membership/events via `@firebase/rules-unit-testing`. Run `npm run test:rules` (Java required) before merging Club Hub rules changes.
