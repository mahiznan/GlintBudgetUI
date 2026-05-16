# GlintBudget Web

The web app companion to the [GlintBudget iOS](../GlintBudget) personal expense tracker. Built with React + Vite + TypeScript + Tailwind CSS v4; deployed to [budget.learnerandtutor.com](https://budget.learnerandtutor.com) via GitHub Actions + FTP to cPanel hosting.

## Quickstart

Requires Node.js (version pinned in `.nvmrc`).

```bash
nvm use            # or otherwise activate Node matching .nvmrc
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Script                 | What it does                                 |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Vite dev server with HMR                     |
| `npm run build`        | Production build to `dist/`                  |
| `npm run preview`      | Serve the built `dist/` locally on port 4173 |
| `npm run typecheck`    | `tsc -b --noEmit`                            |
| `npm run lint`         | ESLint over the repo                         |
| `npm run format`       | Prettier write                               |
| `npm run format:check` | Prettier check (used in CI)                  |
| `npm run test`         | Vitest one-shot run                          |
| `npm run test:watch`   | Vitest watch mode                            |

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which:

1. Checks out the code, installs dependencies, runs typecheck + lint + tests.
2. Builds with Vite (`dist/` is the deploy artifact).
3. Uploads `dist/` to the cPanel host via FTPS using `SamKirkland/FTP-Deploy-Action`. The action keeps a sync-state file on the server so subsequent deploys only transfer changed files.

You can also re-deploy manually from the GitHub Actions tab via the workflow's `Run workflow` button.

### One-time setup required before the first deploy

In **cPanel**:

1. Confirm the document root for `budget.learnerandtutor.com` (default: `/budget.learnerandtutor.com/`).
2. Create a scoped FTP account restricted to that directory (cPanel → FTP Accounts).

In **GitHub** (`github.com/mahiznan/GlintBudgetUI` → Settings → Secrets and variables → Actions):

| Secret           | Value                                                    |
| ---------------- | -------------------------------------------------------- |
| `FTP_HOST`       | e.g., `ftp.learnerandtutor.com`                          |
| `FTP_USERNAME`   | the scoped FTP user you just created                     |
| `FTP_PASSWORD`   | the scoped FTP password                                  |
| `FTP_SERVER_DIR` | `/budget.learnerandtutor.com/` (trailing slash required) |

## Project structure

See `docs/superpowers/specs/2026-05-16-glintbudget-web-stage1-design.md` §3 for the canonical layout and rationale.

## Caching strategy

Hashed assets in `/assets/*` get `Cache-Control: public, max-age=31536000, immutable` (filename is the content hash — stale assets are impossible). `index.html` gets `no-cache, must-revalidate` so deploys are picked up immediately. Configured in `public/.htaccess`.

## Roadmap

- **Stage 1 (this release):** Landing page, CI/CD, cache strategy.
- **Stage 2:** Firebase Auth + React Router + protected routes.
- **Stage 3:** Transactions CRUD (shared Firestore schema with iOS).
- **Stage 4:** Preferences sync.
- **Stage 5:** Reports with charts.
- **Stage 6:** PWA polish.

Each stage gets its own design spec and implementation plan in `docs/superpowers/`.

## Related repos

- iOS app: `/Users/rajeshkumar/workspace/GlintBudget` (SwiftUI + Firebase) — **source of truth for data models and Firestore schema**.
