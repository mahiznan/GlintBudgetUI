# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

GlintBudget Web is the web companion to the iOS GlintBudget personal expense tracker. Built with React + Vite + TypeScript + Tailwind CSS v4, deployed to `budget.learnerandtutor.com` via GitHub Actions + FTP to cPanel hosting.

The companion iOS app lives at `/Users/rajeshkumar/workspace/GlintBudget` (SwiftUI + Firebase). **The iOS app is the source of truth for data models and Firestore schema** — do not modify Firestore rules or change field names from this repo.

## Where We Are

- **Stage 1 (done):** Landing page, CI/CD, perfect-cache strategy.
- **Stage 2 (done):** Firebase Auth (Google), React Router v7, protected /app shell. Firebase lazy-loaded; / stays under 50 KB gzipped.
- **Stage 3 (done):** Dashboard (6 widgets + Recharts), transaction CRUD (add/edit/delete), Firestore data layer, PreferenceContext, period navigation, TransactionList, TransactionForm.
- **Stage 4+ (not started):** Preferences UI (currency, theme), reports, PWA.

See the specs and plans in `docs/superpowers/` for the canonical source of every decision and the session-resume cheat sheet.

## Key Documents

- **Stage 1 design spec:** `docs/superpowers/specs/2026-05-16-glintbudget-web-stage1-design.md` (§12 = session-resume cheat sheet)
- **Stage 1 implementation plan:** `docs/superpowers/plans/2026-05-16-glintbudget-web-stage1-plan.md`
- **Stage 2 design spec:** `docs/superpowers/specs/2026-05-16-glintbudget-web-stage2-design.md`
- **Stage 2 implementation plan:** `docs/superpowers/plans/2026-05-16-glintbudget-web-stage2-plan.md`
- **Stage 3 design spec:** `docs/superpowers/specs/2026-05-17-glintbudget-web-stage3-design.md`
- **Stage 3 implementation plan:** `docs/superpowers/plans/2026-05-17-glintbudget-web-stage3-plan.md`
- **iOS data model + Firestore rules:** `/Users/rajeshkumar/workspace/GlintBudget/firestore.rules` and `/Users/rajeshkumar/workspace/GlintBudget/GlintBudget/Model/`

## Build & Run Commands

```bash
nvm use            # activate Node version from .nvmrc
npm install
# Copy .env.example to .env.local and fill in Firebase web config before `npm run dev`.
npm run dev        # http://localhost:5173
npm run build      # production build to dist/
npm run preview    # serve built dist/ on http://localhost:4173
npm run test       # Vitest one-shot run
npm run typecheck
npm run lint
npm run format
```

## Architecture

### Stack

- React (latest stable) + TypeScript (strict)
- Vite (latest stable) for dev server and production builds
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- Vitest + React Testing Library for tests
- ESLint (flat config) + Prettier (Prettier owns formatting)

### Project structure

```
GlintBudgetUI/
├── .github/workflows/deploy.yml      # build + FTP deploy on push to main
├── docs/superpowers/
│   ├── specs/                        # design documents
│   └── plans/                        # implementation plans
├── public/
│   ├── .htaccess                     # SPA fallback + cache + compression + security
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── main.tsx                      # React root
│   ├── App.tsx                       # Router + AuthProvider + PreferenceProvider wrapper
│   ├── auth/                         # AuthContext, AuthProvider, RequireAuth, types
│   ├── firebase/                     # client.ts (initializeApp + getAuth), auth.ts, db.ts (Firestore)
│   ├── firestore/                    # types.ts (Transaction, Preference, BudgetData)
│   ├── context/                      # PreferenceContext, PreferenceProvider, usePreferenceContext
│   ├── hooks/                        # useTransactions, useMutateTransaction (add/update/delete)
│   ├── utils/                        # dateUtils.ts (getPeriodRange, formatDate)
│   ├── routes/                       # Landing, SignIn, AppShell, Dashboard, TransactionList, TransactionForm + tests
│   ├── components/
│   │   ├── {Header,Hero,FeatureStrip,Footer,UserMenu}.tsx + .test.tsx  # landing
│   │   ├── layout/                   # Sidebar, TopBar
│   │   ├── dashboard/                # HeroStatsRow, SpendingChart, CategoryBreakdown, IncomeExpenseDonut, TodayTransactions, QuickStats
│   │   ├── transactions/             # TransactionTable, TransactionRow, DateRangeFilter, DeleteConfirmDialog
│   │   └── form/                     # AmountInput, TypeToggle, FieldPicker
│   ├── styles/index.css              # Tailwind v4 entry + @theme brand tokens
│   ├── setupTests.ts                 # Vitest + jest-dom matchers (also stubs VITE_FIREBASE_* env)
│   └── vite-env.d.ts                 # typed ImportMetaEnv for VITE_FIREBASE_* vars
├── index.html                        # Vite entry; preconnects, theme-color
├── vite.config.ts                    # build config + test config
├── tsconfig*.json                    # TS strict + bundler resolution
├── eslint.config.js                  # flat config; defers formatting to Prettier
├── .env.example                      # required VITE_FIREBASE_* env var names (no values)
├── .prettierrc.json
├── .nvmrc
├── README.md
└── AGENTS.md                         # this file
```

### Caching strategy (do not regress)

- Hashed assets (`/assets/*.{js,css,woff2,svg,…}`): `Cache-Control: public, max-age=31536000, immutable`.
- `index.html`: `Cache-Control: no-cache, must-revalidate`.

Filename content-hashing comes from Vite by default; headers come from `public/.htaccess`. If anyone proposes changes to either, push back — this is a hard requirement from the owner.

### Performance budget (Stage 1, do not regress)

- Initial payload (HTML + critical CSS + JS) gzipped: **< 50 KB**
- Lighthouse Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95
- Build target: `es2022` (no legacy polyfills)

### Brand tokens

Defined in `src/styles/index.css` `@theme` block:

- `--color-brand`: `#f59e0b` (amber-500 — the "glint")
- `--color-brand-dark`: `#b45309` (amber-700)
- `--color-text`: `#0f172a` (slate-900)
- `--color-text-muted`: `#475569` (slate-600)
- `--color-surface`: `#ffffff`
- `--color-surface-alt`: `#f8fafc` (slate-50)
- `--color-border`: `#e2e8f0` (slate-200)

## Deployment

`.github/workflows/deploy.yml` triggers on push to `main` (or manual `workflow_dispatch`):

1. `npm ci` → typecheck → lint → test → build (`dist/`)
2. `SamKirkland/FTP-Deploy-Action@v4.3.5` uploads `dist/` to `${FTP_SERVER_DIR}` on `${FTP_HOST}` over FTPS (incremental sync — only changed files transfer).

Secrets required (set in repo Settings → Secrets):

- `FTP_HOST`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `FTP_SERVER_DIR` (e.g., `/budget.learnerandtutor.com/` — trailing slash required)

Stage 2 also requires Firebase web-config secrets (NOT actually secret — Firebase
web config ships to every browser; the real security boundary is Firestore rules):

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_STORAGE_BUCKET`

If a deploy fails before the FTP step (typecheck/lint/test/build error), no upload happens. Production never receives a broken build.

## Conventions

- TypeScript `strict` is on. No `any` without justification.
- Each component sits in `src/components/<Name>.tsx` with a co-located `<Name>.test.tsx`.
- Prefer Tailwind utility classes over custom CSS. Use the brand tokens (`--color-brand`, etc.) instead of hard-coding hex values, so re-theming is one-file.
- Commit messages: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `perf:` prefixes.
- Tests are part of the diff that ships them: never commit a component without its smoke test.

## What this repo does NOT do (yet)

- No preferences UI (currency, theme) — Stage 4.
- No reports or charts beyond the Dashboard widgets — Stage 5.
- No PWA / offline / push notifications — Stage 6+.

## When you start a fresh session

1. Read this file (`AGENTS.md`).
2. Read `docs/superpowers/specs/2026-05-16-glintbudget-web-stage1-design.md` §12 — the session-resume cheat sheet.
3. Check `git log --oneline -20` to see where work stopped.
4. Check the in-progress plan in `docs/superpowers/plans/` for unchecked tasks.
