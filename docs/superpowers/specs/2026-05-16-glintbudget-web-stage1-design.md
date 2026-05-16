# GlintBudget Web — Stage 1 Design

**Status:** Design approved 2026-05-16, awaiting implementation plan
**Companion iOS project:** `/Users/rajeshkumar/workspace/GlintBudget` (SwiftUI + Firebase)
**This project (web):** `/Users/rajeshkumar/workspace/GlintBudgetUI`
**GitHub remote:** `https://github.com/mahiznan/GlintBudgetUI`
**Production URL (Stage 1):** `https://budget.learnerandtutor.com`
**Long-term URL:** dedicated domain (TBD by owner)

---

## 1. Goals and non-goals

### What Stage 1 must achieve

1. Stand up a production-quality React + Vite + TypeScript + Tailwind CSS v4 web app skeleton in the empty `GlintBudgetUI` repo.
2. Ship a branded **landing page** (no app logic yet) — the public face of GlintBudget while Stages 2+ build the real app behind it.
3. Wire **GitHub Actions** to build on push to `main` and deploy the static bundle via FTP/FTPS to the cPanel-hosted subdomain.
4. Bake in **performance and cache-busting** as foundational properties — not afterthoughts.
5. Document everything so a fresh Claude session (or human) can resume from anywhere with no context loss.

### Out of scope for Stage 1 (deliberate)

- Firebase SDK integration (Stage 2)
- Authentication UI (Stage 2)
- Routing / multi-page app (Stage 2 — but `.htaccess` SPA fallback is shipped now so Stage 2 needs zero infra work)
- CRUD on transactions (Stage 3)
- Preferences sync (Stage 4)
- Reporting / charts (Stage 5)
- PWA / offline (Stage 6)
- Dark mode (post-MVP)
- E2E tests (added once auth lands)

### Hard requirements (from owner)

- **Lightning fast.** Modern stack, minimal payload, aggressive but safe caching.
- **Cache-bust on every changed resource.** Users must never see a stale asset after a deploy.
- **Portable target.** Will move from `budget.learnerandtutor.com` to a dedicated domain later; nothing in code or CI should hard-code the host beyond a single configurable value.

---

## 2. Architectural decisions

### 2.1 Stack

| Layer           | Choice                                 | Why                                                                                                                        |
| --------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| UI framework    | **React** (latest stable)              | Largest ecosystem; matches likely future hires; same mental model as SwiftUI's declarative views.                          |
| Language        | **TypeScript (strict)**                | Catches errors at build time; pairs with iOS Swift's strictness.                                                           |
| Build tool      | **Vite** (latest stable)               | Fastest dev server; Rollup-based production builds with great tree-shaking; content-hashed asset filenames out of the box. |
| Styling         | **Tailwind CSS v4**                    | JIT generates only used classes; landing-page CSS typically < 5 KB gzipped; scales to forms/charts in later stages.        |
| Package manager | **npm**                                | Universal; ships with Node; no extra CI install step.                                                                      |
| Node version    | Latest **LTS** (pinned in `.nvmrc`)    | CI/local parity.                                                                                                           |
| Hosting         | **cPanel shared hosting** via FTP/FTPS | Owner's existing setup.                                                                                                    |
| CI/CD           | **GitHub Actions**                     | Native to the repo; free for public/private repos under the included minutes.                                              |

### 2.2 SPA shape — single-page with HTML5 history routing (Approach A)

Single `index.html` entry point; in Stage 2 we add React Router using real URLs (`/`, `/transactions`, `/reports`). Stage 1 ships only `/` but the project is structured so adding routes later requires zero new infra (the `.htaccess` SPA fallback is shipped now).

**Rejected:** hash routing (uglier URLs, worse for sharing/SEO) and Vite multi-page mode (would force Firebase SDK to re-bootstrap per page, killing the "lightning fast" repeat-navigation goal).

### 2.3 Performance budget (Stage 1)

| Metric                                             | Target      |
| -------------------------------------------------- | ----------- |
| Initial payload (HTML + critical CSS + JS) gzipped | **< 50 KB** |
| Largest Contentful Paint (fast connection)         | **< 1.0 s** |
| Lighthouse Performance score                       | **≥ 95**    |
| Lighthouse Best Practices score                    | **≥ 95**    |
| Lighthouse Accessibility score                     | **≥ 95**    |

These are gates the implementation plan should verify before claiming Stage 1 done.

### 2.4 Cache strategy — "perfect cache"

Two-tier caching, hard requirement from owner:

1. **Hashed assets (`/assets/*.{js,css,png,svg,woff2,…}`)**: Vite writes content-hashed filenames (e.g., `index-Bx9aK2c3.js`). The filename _is_ the cache key. Server sends:

   ```
   Cache-Control: public, max-age=31536000, immutable
   ```

   Browser caches for one year; never re-validates. When content changes, the filename changes, so a new URL is fetched — stale assets are mathematically impossible.

2. **`index.html` and `.htaccess`**: server sends:
   ```
   Cache-Control: no-cache, must-revalidate
   ```
   Browser always re-fetches HTML on navigation. Since HTML references the latest hashed assets, the user always gets the latest version after a deploy.

Net effect: first visit downloads everything; repeat visits download only the (tiny) HTML and reuse all assets from disk until a deploy genuinely changes them.

---

## 3. Project structure

```
GlintBudgetUI/
├── .github/
│   └── workflows/
│       └── deploy.yml                  # build + FTP deploy on push to main
├── docs/
│   └── superpowers/
│       ├── specs/                      # design documents (this file)
│       └── plans/                      # implementation plans
├── public/
│   ├── .htaccess                       # SPA fallback + cache headers + gzip
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── main.tsx                        # React root
│   ├── App.tsx                         # Landing page composition
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── FeatureStrip.tsx
│   │   └── Footer.tsx
│   ├── styles/
│   │   └── index.css                   # Tailwind v4 entry + @theme tokens
│   └── vite-env.d.ts
├── index.html                          # Vite entry; preconnects, font-display
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts                      # build target, chunking, base path
├── .gitignore
├── .nvmrc                              # pin Node LTS
├── .eslintrc.cjs (or eslint.config.js) # ESLint flat config
├── .prettierrc.json
├── README.md                           # quickstart, deploy steps, secrets list
└── CLAUDE.md                           # session-resumable project guidance
```

---

## 4. Stage 1 landing page content

### Sections (top to bottom)

1. **Header** — `GlintBudget` wordmark left, placeholder nav right (visual only).
2. **Hero**
   - Tagline (draft): _"Track every dollar. Across every currency."_
   - Subhead: short value prop, 1-2 lines.
   - Single CTA: `Coming soon` (disabled button) — copy refinable in implementation.
3. **Feature strip — 3 items** mirroring what the iOS app actually does:
   - **Multi-currency** — _"Default currency with per-transaction overrides."_
   - **Smart reports** — _"Pie and bar charts filtered by category, vendor, account."_
   - **iOS + Web sync** — _"Your data, anywhere. Offline-first."_ (forward-looking; honest about web sync coming with Stage 2+.)
4. **Footer** — copyright, link to iOS App Store (placeholder), Privacy Policy link (placeholder URL — same one the iOS app's Settings → Legal needs).

### Visual direction

- Light mode only (dark mode is post-MVP).
- Clean, modern, generous whitespace; rounded corners; subtle gradient or soft shadow on the hero card.
- System font stack first: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. No webfont in Stage 1 (saves a request, prevents FOUT).
- Color palette: proposed in implementation plan; one brand accent + neutral grays. Owner has not specified colors from iOS app — implementer should screenshot iOS app and propose a matching palette in the plan.

---

## 5. Build configuration (key settings)

### 5.1 `vite.config.ts` highlights

- `build.target: 'es2022'` — modern browsers only, no legacy polyfills.
- `build.minify: 'esbuild'` — fastest minifier.
- `build.cssCodeSplit: true`.
- `build.rollupOptions.output.manualChunks` — split `react`/`react-dom` into a `vendor` chunk so landing-page chunk stays small and the vendor chunk caches forever across deploys.
- `build.assetsInlineLimit: 4096` — inline very small assets as base64 to save HTTP requests.
- `base: '/'` — subdomain root; revisit if owner moves to a subdirectory layout.

### 5.2 TypeScript

- `strict: true`, plus `noUncheckedIndexedAccess` and `noImplicitOverride`.

### 5.3 ESLint + Prettier

- ESLint flat config with `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`.
- Prettier for formatting; ESLint defers to Prettier on formatting.

### 5.4 `public/.htaccess`

```apacheconf
# --- SPA fallback (for Stage 2+ client-side routing) ---
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# --- Compression ---
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json image/svg+xml
</IfModule>

# --- Caching: hashed assets cache forever, HTML never ---
<IfModule mod_headers.c>
  <FilesMatch "\.(?:js|css|woff2|png|jpg|jpeg|gif|svg|ico)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\.html$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>
</IfModule>

# --- Security headers (baseline) ---
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set X-Frame-Options "DENY"
</IfModule>
```

Note: if cPanel supports Brotli (`mod_brotli`), the implementation should add an `AddOutputFilterByType BROTLI_COMPRESS` block alongside `mod_deflate`. Implementer must verify host support before relying on it.

---

## 6. GitHub Actions deploy pipeline

### 6.1 Workflow file: `.github/workflows/deploy.yml`

**Triggers:**

- `push` to `main`
- `workflow_dispatch` (manual re-deploy button)

**Single job: `build-and-deploy`** (Stage 1 has nothing to gate on; PR previews are a Stage 2+ consideration):

1. `actions/checkout@v4`
2. `actions/setup-node@v4` with `node-version-file: .nvmrc`, `cache: 'npm'`
3. `npm ci`
4. `npm run typecheck` — `tsc --noEmit`; fails the job on type errors
5. `npm run lint` — ESLint; fails the job on lint errors
6. `npm run build` — Vite production build into `dist/`
7. `SamKirkland/FTP-Deploy-Action@v4.3.5`:
   - `server: ${{ secrets.FTP_HOST }}`
   - `username: ${{ secrets.FTP_USERNAME }}`
   - `password: ${{ secrets.FTP_PASSWORD }}`
   - `server-dir: ${{ secrets.FTP_SERVER_DIR }}` (trailing slash required by the action)
   - `local-dir: ./dist/`
   - `protocol: ftps` (fall back to `ftp` only if owner's host doesn't support FTPS)
   - `dangerous-clean-slate: false` — preserves files outside our managed set
   - Incremental sync via `.ftp-deploy-sync-state.json` kept on the server — subsequent deploys upload only changed files (typically a few seconds).

If typecheck, lint, or build fails, the FTP step is skipped (the failed step short-circuits the job). Production never receives a broken build.

### 6.2 GitHub repository secrets required

Owner must add these in `github.com/mahiznan/GlintBudgetUI` → **Settings → Secrets and variables → Actions**:

| Secret           | Example value                                      | Notes                                                                                         |
| ---------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `FTP_HOST`       | `ftp.learnerandtutor.com` or `learnerandtutor.com` | Confirm in cPanel → FTP Accounts.                                                             |
| `FTP_USERNAME`   | e.g., `budget@learnerandtutor.com`                 | Use a **scoped FTP account** restricted to the subdomain directory, not the main cPanel user. |
| `FTP_PASSWORD`   | (strong random password)                           | Generated when creating the scoped FTP account.                                               |
| `FTP_SERVER_DIR` | `/budget.learnerandtutor.com/`                     | Auto-created subdomain document root. Trailing slash required.                                |

Optional (Stage 2+):

- `VITE_FIREBASE_*` for Firebase web config, injected at build time.

### 6.3 One-time manual setup (outside the repo)

1. In **cPanel → FTP Accounts**, create a new FTP account scoped to `/budget.learnerandtutor.com/`. Save the username and password.
2. In **GitHub repo Settings → Secrets**, add the four FTP secrets above.
3. Verify `budget.learnerandtutor.com` resolves in DNS (owner has confirmed this is done).
4. Verify cPanel supports FTPS (preferred) or fall back to plain FTP (`protocol: ftp`).

A copy of this checklist also lives in `README.md`.

---

## 7. Quality gates and verification (definition of done for Stage 1)

The implementation plan must verify all of these before marking Stage 1 complete:

1. `npm run build` succeeds with zero TS / lint errors.
2. `npm run preview` serves the built bundle locally; landing page renders correctly.
3. GitHub Actions workflow runs green on a push to `main`.
4. `https://budget.learnerandtutor.com` serves the landing page.
5. Browser DevTools → Network confirms:
   - Hashed assets return `Cache-Control: public, max-age=31536000, immutable`.
   - `index.html` returns `Cache-Control: no-cache, must-revalidate` (or equivalent).
   - Assets are gzip- or brotli-compressed.
6. After a trivial change (e.g., edit hero copy) is pushed:
   - New deploy completes successfully.
   - Browser hard-reload shows updated copy.
   - Network tab shows new hashed asset filename(s).
7. Lighthouse (mobile, throttled): Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95.

---

## 8. Future stages roadmap (so we know where Stage 1 plugs in)

| Stage                     | Scope                                                                                                                 | Notes                                                                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stage 1** _(this spec)_ | Landing page + CI/CD + cache strategy.                                                                                | Foundation for everything below.                                                                                                                           |
| Stage 2                   | Firebase Auth (Email + Google + Anonymous); React Router; protected routes; `.htaccess` SPA fallback already shipped. | Drop Apple Sign-In on web for now (extra Apple Developer setup; not blocking).                                                                             |
| Stage 3                   | Transactions CRUD: list (paginated 50/page, mirroring iOS), filter, create, edit, delete.                             | Share Firestore schema with iOS — same `transactions` collection, same field names (snake_case in Firestore, camelCase via `CodingKeys`-equivalent in TS). |
| Stage 4                   | Preferences sync: categories, vendors, accounts, payments, currencies.                                                | Same `preference/{userId}` doc as iOS.                                                                                                                     |
| Stage 5                   | Reports with pie / bar charts.                                                                                        | Pick chart lib by bundle size — likely Recharts or visx. Mirror iOS `Report` model.                                                                        |
| Stage 6                   | PWA polish: service worker, install prompt, manifest, offline support.                                                | Matches iOS app's offline-first behavior.                                                                                                                  |

Each stage will have its own design doc + implementation plan in `docs/superpowers/`.

---

## 9. Data model reference (iOS source of truth — for Stages 3+)

Reproduced here so future sessions don't need to re-derive it from the iOS repo. Source: `/Users/rajeshkumar/workspace/GlintBudget/GlintBudget/Model/`.

### Firestore collections

| Collection     | Doc ID                       | Notes                                                                                             |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `transactions` | UUID                         | User's transactions. Composite index `(user_id ASC, date DESC)` required for the paginated query. |
| `preference`   | userId (= Firebase Auth UID) | User's categories, vendors, accounts, payments, currencies, reports.                              |
| `users`        | userId (= Firebase Auth UID) | User profile.                                                                                     |

### Transaction schema (snake_case in Firestore)

```
id          UUID (string)
user_id     string  (must == request.auth.uid; rules enforce this)
category    string
sub_category string
date        timestamp
account     string
vendor      string
payment     string
currency    string
notes       string
amount      number
icon        string
```

Firestore security rules (`/Users/rajeshkumar/workspace/GlintBudget/firestore.rules`) enforce per-user ownership and required fields on create. **Do not modify these rules from the web client** — they are the iOS source of truth.

---

## 10. Risks and mitigations

| Risk                                                          | Mitigation                                                                                                                                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FTPS unsupported on this cPanel host                          | Fall back to plain FTP via workflow input; document in README. Note: plain FTP transmits credentials in clear — acceptable for a personal project, revisit if it becomes commercial. |
| FTP_SERVER_DIR mismatch silently uploads to wrong folder      | First deploy is manually verified by owner before merging to main; workflow has `workflow_dispatch` for safe re-runs.                                                                |
| Lighthouse score targets not met on shared hosting            | Most likely cause is host-level latency, not our code. If host TTFB is the bottleneck, document it; consider Cloudflare in front later.                                              |
| Owner forgets to set GitHub secrets before first push to main | First deploy will fail loudly in Actions; workflow logs name the missing secret. README lists all four.                                                                              |
| Future domain migration breaks deploys                        | All host-specific values (`FTP_HOST`, `FTP_SERVER_DIR`) live in GitHub secrets, not in code. Migration = update two secrets, done.                                                   |

---

## 11. Open questions (to resolve during implementation planning)

- **Brand color palette** — does owner want to mirror iOS app colors? Implementer should screenshot the iOS app and propose a palette in the implementation plan.
- **Hero copy** — owner has not finalized tagline; implementer can ship the draft above and iterate.
- **Privacy Policy URL** — same placeholder as iOS app; resolve before any user-facing launch.
- **FTPS vs FTP** — implementer to verify cPanel support and pick.

---

## 12. Session-resume cheat sheet

If a future session starts cold, here's what you need to know:

- **Where we are:** design approved on 2026-05-16; implementation plan not yet written.
- **Where the code lives:** `/Users/rajeshkumar/workspace/GlintBudgetUI` (the repo for this spec). The iOS sibling lives at `/Users/rajeshkumar/workspace/GlintBudget` and is **the source of truth for data models and Firestore schema** — do not edit it from this repo.
- **What's been decided:** everything in sections 2–8 above. Treat sections 1, 9, 10 as binding context.
- **What's next:** invoke the `superpowers:writing-plans` skill to turn this design into a numbered, step-by-step implementation plan saved under `docs/superpowers/plans/`.
- **What must NOT be skipped:** the cache-busting + cache-control headers (section 2.4), the quality gates (section 7), and the Stage 2+ readiness shipped now via `.htaccess` SPA fallback (section 5.4).
