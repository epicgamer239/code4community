# Code4Community

Next.js platform for Code4Community — student-built tools for Broad Run High School and nonprofits.

For local setup, Firebase credentials, and deploy commands, see [AGENTS.md](./AGENTS.md).

## Layout (high level)

- `app/` — routes only (pages + API)
- `components/` — UI by feature (`mathlab/`, `writing-center/`, `club-hub/`, `layout/`, …)
- `lib/` — domain logic by feature (`mathlab/`, `club-hub/`, …); shared helpers stay at `lib/` root
- `utils/` — cross-cutting client helpers (auth context, cache, rate limits)
- `public/brand`, `public/team`, `public/partners`, `public/demos` — static assets
- `firebase.js` — client Firebase SDK entry (stays at repo root so `keys.dev.js` aliases keep working)
