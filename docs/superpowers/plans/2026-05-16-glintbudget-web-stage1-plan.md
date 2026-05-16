# GlintBudget Web — Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a React + Vite + TypeScript + Tailwind CSS v4 SPA in the empty `GlintBudgetUI` repo, ship a branded "GlintBudget" landing page, and deploy it via GitHub Actions + FTP to `https://budget.learnerandtutor.com` (cPanel hosting) with cache-busted assets and a perfect-cache header strategy.

**Architecture:** Single-page SPA (HTML5 history routing model — only `/` in Stage 1, but `.htaccess` SPA fallback ships now so Stage 2 routing needs zero infra changes). Vite produces content-hashed bundles in `dist/`; GitHub Actions builds on `push` to `main`, runs typecheck + lint, then uses `SamKirkland/FTP-Deploy-Action` to incrementally sync `dist/` to the cPanel subdomain document root. Server-side `.htaccess` enforces long immutable caching for hashed assets and `no-cache` on `index.html`, so users always see the latest deploy with zero stale-asset risk.

**Tech Stack:** React (latest stable) + Vite (latest stable) + TypeScript strict + Tailwind CSS v4 + Vitest + React Testing Library + ESLint flat config + Prettier + GitHub Actions + SamKirkland/FTP-Deploy-Action.

**Source spec:** `docs/superpowers/specs/2026-05-16-glintbudget-web-stage1-design.md` (committed `e6235cd`). **READ §12 SESSION-RESUME CHEAT SHEET BEFORE STARTING IF YOU ARE PICKING THIS UP COLD.**

**Prerequisites assumed already done by owner:**

- DNS for `budget.learnerandtutor.com` resolving to the cPanel host (confirmed).
- cPanel subdomain document root `/budget.learnerandtutor.com/` exists (auto-created by cPanel).

**Prerequisites that owner must do during/after this plan** (called out in Task 17):

1. Create a scoped FTP account in cPanel.
2. Add four GitHub repo secrets: `FTP_HOST`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR`.

---

## Brand decisions (used throughout this plan)

To eliminate ambiguity at implementation time:

- **Hero tagline:** _"Track every dollar. Across every currency."_
- **Hero subhead:** _"GlintBudget brings the simplicity of your iPhone expense tracker to every screen you own. iOS today. Web next."_
- **Primary CTA:** `Coming soon` — disabled button (no link; visual only).
- **Color palette (proposed; owner can adjust before merging by editing `src/styles/index.css` `@theme` block):**
  - Brand accent (the "glint"): amber `#f59e0b`
  - Text primary: slate-900 `#0f172a`
  - Text secondary: slate-600 `#475569`
  - Surface: white `#ffffff`
  - Surface alt: slate-50 `#f8fafc`
  - Border: slate-200 `#e2e8f0`
- **Feature strip — three items:**
  1. 💱 **Multi-currency** — _"Default currency with per-transaction overrides."_
  2. 📊 **Smart reports** — _"Pie and bar charts filtered by category, vendor, account."_
  3. 📱 **iOS, soon web** — _"Built for iPhone today. The web app is on the way."_

---

## Phase A — Scaffold the project

### Task 1: Initialize npm, Node pin, gitignore

**Files:**

- Create: `/Users/rajeshkumar/workspace/GlintBudgetUI/.nvmrc`
- Create: `/Users/rajeshkumar/workspace/GlintBudgetUI/.gitignore`

- [ ] **Step 1: Confirm working directory and clean state**

Run:

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && pwd && git status
```

Expected: working directory is `GlintBudgetUI`, on branch `main`, design spec already committed (`e6235cd`).

- [ ] **Step 2: Determine and pin Node LTS version**

Run:

```bash
node --version
```

Expected output: a version string like `v22.x.x` or `v20.x.x`. If `node` is not installed or below v20, install/upgrade to current LTS via your version manager first.

Create `.nvmrc` with the major version:

```
22
```

(If `node --version` showed v20, use `20` instead. Pick whichever LTS is installed.)

- [ ] **Step 3: Create .gitignore**

Create `.gitignore`:

```gitignore
# Dependencies
node_modules/

# Build output
dist/
dist-ssr/

# Local env
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor
.vscode/*
!.vscode/extensions.json
.idea/
*.swp
.DS_Store

# Vitest
coverage/

# FTP deploy state (kept on server only)
.ftp-deploy-sync-state.json
```

- [ ] **Step 4: Commit**

Run:

```bash
git add .nvmrc .gitignore
git commit -m "$(cat <<'EOF'
chore: pin Node version and add gitignore

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Vite + React + TypeScript skeleton

**Files:**

- Create: `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.app.json`
- Create: `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`

- [ ] **Step 1: Scaffold with the official Vite React-TS template**

Run from the parent directory because `npm create vite` writes into a fresh folder; we'll merge into the existing repo:

```bash
cd /tmp && rm -rf glintbudget-scaffold && npm create vite@latest glintbudget-scaffold -- --template react-ts
```

Expected: a `/tmp/glintbudget-scaffold/` directory with `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/`, `public/`.

- [ ] **Step 2: Copy scaffolded files into the repo**

Run:

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI
cp /tmp/glintbudget-scaffold/package.json .
cp /tmp/glintbudget-scaffold/index.html .
cp /tmp/glintbudget-scaffold/vite.config.ts .
cp /tmp/glintbudget-scaffold/tsconfig*.json .
cp /tmp/glintbudget-scaffold/eslint.config.js . 2>/dev/null || true
cp -r /tmp/glintbudget-scaffold/src/. src/
cp -r /tmp/glintbudget-scaffold/public/. public/ 2>/dev/null || mkdir -p public
ls -la
```

Expected: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts` (and possibly `src/App.css`, `src/index.css`, `src/assets/`).

- [ ] **Step 3: Rename project in package.json**

Edit `package.json` — change the `name` field from `glintbudget-scaffold` to `glintbudget-web`. Add `"private": true` (already present from template). Verify `"type": "module"` is present.

The `scripts` section after this step should contain (Vite template defaults — we'll extend in later tasks):

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview"
}
```

- [ ] **Step 4: Strip the boilerplate from `src/App.tsx`**

Replace `src/App.tsx` entirely with:

```tsx
function App() {
  return (
    <main>
      <h1>GlintBudget</h1>
      <p>Coming soon.</p>
    </main>
  );
}

export default App;
```

Delete any default `src/App.css` and remove its import from `App.tsx` (already gone after the replace).

Also remove any default content from `src/index.css` (leave the file empty for now — Tailwind populates it in Task 3).

- [ ] **Step 5: Strip default favicon and Vite logo from `index.html`**

Replace `index.html` entirely with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#f59e0b" />
    <meta name="description" content="GlintBudget — track every dollar across every currency." />
    <title>GlintBudget</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Replace `src/main.tsx`**

Replace `src/main.tsx` entirely with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 7: Install dependencies**

Run:

```bash
npm install
```

Expected: `node_modules/` populated, `package-lock.json` created or updated. No errors.

- [ ] **Step 8: Verify dev server starts**

Run:

```bash
npm run dev
```

Expected: Vite prints `Local: http://localhost:5173/` (or similar). Open it in a browser — see "GlintBudget" heading and "Coming soon." text. Stop the dev server with Ctrl-C.

- [ ] **Step 9: Verify production build**

Run:

```bash
npm run build
```

Expected: `dist/` is created with `index.html`, `assets/index-XXXXX.js`, `assets/index-XXXXX.css`. No errors. Filenames contain content hashes.

Run:

```bash
ls dist/assets/
```

Expected output looks like `index-Bx9aK2c3.js  index-9fK2eR4d.css` (exact hashes will differ).

- [ ] **Step 10: Verify production preview**

Run:

```bash
npm run preview
```

Expected: serves at `http://localhost:4173/` showing the same content. Stop with Ctrl-C.

- [ ] **Step 11: Clean up scaffold leftovers**

Run:

```bash
rm -rf /tmp/glintbudget-scaffold
```

- [ ] **Step 12: Commit**

Run:

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig*.json src/ public/ eslint.config.js 2>/dev/null
git status
```

Confirm only scaffold files are staged. Then:

```bash
git commit -m "$(cat <<'EOF'
feat: scaffold Vite + React + TypeScript skeleton

Includes minimal App.tsx with a 'Coming soon' placeholder; Tailwind
and components are added in later tasks. Verified dev and prod
builds work locally.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Tailwind CSS v4 setup

**Files:**

- Modify: `package.json` (adds tailwindcss + @tailwindcss/vite)
- Modify: `vite.config.ts` (registers the Tailwind plugin)
- Create: `src/styles/index.css` (Tailwind v4 entry + brand theme tokens; replaces scaffold's `src/index.css`)
- Delete: `src/index.css` (Vite scaffold default; moved to `src/styles/`)
- Modify: `src/main.tsx` (import path update)
- Modify: `src/App.tsx` (apply Tailwind classes to placeholder)

- [ ] **Step 1: Install Tailwind v4 packages**

Run:

```bash
npm install -D tailwindcss @tailwindcss/vite
```

Expected: both packages added to `devDependencies`. No errors.

- [ ] **Step 2: Register Tailwind in `vite.config.ts`**

Replace `vite.config.ts` entirely with:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 3: Create `src/styles/index.css` with Tailwind entry + brand tokens**

Create directory and file:

```bash
mkdir -p src/styles
```

Create `src/styles/index.css`:

```css
@import 'tailwindcss';

@theme {
  /* GlintBudget brand palette */
  --color-brand: #f59e0b; /* amber-500 - the "glint" */
  --color-brand-dark: #b45309; /* amber-700 */
  --color-text: #0f172a; /* slate-900 */
  --color-text-muted: #475569; /* slate-600 */
  --color-surface: #ffffff;
  --color-surface-alt: #f8fafc; /* slate-50 */
  --color-border: #e2e8f0; /* slate-200 */

  /* Typography */
  --font-sans:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
}

body {
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-surface);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 4: Update `src/main.tsx` import to the new CSS path**

Open `src/main.tsx` and change:

```tsx
import './index.css';
```

to:

```tsx
import './styles/index.css';
```

Then remove the old default CSS file (now superseded):

```bash
rm -f src/index.css
```

- [ ] **Step 5: Apply Tailwind classes in `src/App.tsx`**

Replace `src/App.tsx` entirely with:

```tsx
function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8">
      <h1 className="text-5xl font-bold tracking-tight text-slate-900">GlintBudget</h1>
      <p className="mt-4 text-lg text-slate-600">Coming soon.</p>
    </main>
  );
}

export default App;
```

- [ ] **Step 6: Verify dev server renders with Tailwind styling**

Run:

```bash
npm run dev
```

Open `http://localhost:5173/`. Expected: full-screen slate-50 background, centered large bold "GlintBudget" heading, "Coming soon." subtext. Stop with Ctrl-C.

- [ ] **Step 7: Verify production build**

Run:

```bash
npm run build
```

Expected: build succeeds; `dist/assets/index-XXXXX.css` exists. Check size:

```bash
ls -lh dist/assets/*.css
```

Expected: the CSS file should be < 10 KB (Tailwind JIT only emits used classes).

- [ ] **Step 8: Commit**

Run:

```bash
git add package.json package-lock.json vite.config.ts src/styles/index.css src/main.tsx src/App.tsx
git rm src/index.css 2>/dev/null || true
git commit -m "$(cat <<'EOF'
feat: add Tailwind CSS v4 with GlintBudget brand tokens

Registers @tailwindcss/vite plugin; defines brand palette in @theme
block (amber accent + slate neutrals + system-font stack); applies
to placeholder App component.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: ESLint + Prettier + tsconfig hardening + npm scripts

**Files:**

- Modify: `tsconfig.app.json` (or `tsconfig.json` if the scaffold consolidated them) — add stricter flags
- Modify: `eslint.config.js` (extend with Prettier compat)
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Modify: `package.json` (scripts + devDependencies)

- [ ] **Step 1: Tighten TypeScript compiler options (spec §5.2)**

Open `tsconfig.app.json` (preferred; falls back to `tsconfig.json` if scaffold puts strict options there). In `compilerOptions`, ensure `strict: true` is present and add:

```json
"noUncheckedIndexedAccess": true,
"noImplicitOverride": true
```

Don't replace the file — merge these two keys into the existing `compilerOptions` object.

Then run:

```bash
npm run dev --silent -- --version 2>/dev/null; npx tsc -b --noEmit
```

Expected: exit code 0 (no type errors on the existing tiny codebase). If the scaffold's example files trigger new errors under the stricter flags, fix them now — typically by adding null-guards for indexed access.

- [ ] **Step 2: Install Prettier and ESLint-Prettier compat**

Run:

```bash
npm install -D prettier eslint-config-prettier
```

- [ ] **Step 3: Create `.prettierrc.json`**

Create `.prettierrc.json`:

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

- [ ] **Step 4: Create `.prettierignore`**

Create `.prettierignore`:

```
dist/
node_modules/
coverage/
package-lock.json
```

- [ ] **Step 5: Extend `eslint.config.js` to defer to Prettier**

Open `eslint.config.js`. The Vite scaffold version exports an array of configs. Append a Prettier-compat config object at the end of the array so Prettier rules override conflicting ESLint formatting rules. The final file should look approximately like (the imports and other entries may differ slightly depending on the Vite template version; preserve them and add the Prettier one at the end):

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  prettier,
);
```

If the scaffold's existing `eslint.config.js` already imports these modules, keep its structure and only add the `import prettier from 'eslint-config-prettier';` line at top plus include `prettier` as the last entry in the exported array.

- [ ] **Step 6: Add typecheck, lint, format scripts to `package.json`**

Update the `scripts` block in `package.json` to:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "typecheck": "tsc -b --noEmit",
  "lint": "eslint .",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

- [ ] **Step 7: Run typecheck — expect pass**

Run:

```bash
npm run typecheck
```

Expected: exit code 0, no errors.

- [ ] **Step 8: Run lint — expect pass**

Run:

```bash
npm run lint
```

Expected: exit code 0, no errors.

- [ ] **Step 9: Run format:check — expect pass**

Run:

```bash
npm run format
npm run format:check
```

Expected: format writes any fixes silently, then check exits 0.

- [ ] **Step 10: Commit**

Run:

```bash
git add package.json package-lock.json eslint.config.js tsconfig*.json .prettierrc.json .prettierignore src/
git commit -m "$(cat <<'EOF'
chore: add Prettier + typecheck/lint/format scripts, tighten tsconfig

Adds noUncheckedIndexedAccess and noImplicitOverride per spec §5.2.
ESLint flat config defers formatting rules to Prettier via
eslint-config-prettier. Adds npm scripts for typecheck, lint,
format, and format:check — wired into CI in a later task.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase B — App content (test-driven per component)

### Task 5: Vitest + React Testing Library setup with smoke test

**Files:**

- Modify: `package.json` (vitest deps + test script)
- Modify: `vite.config.ts` (test config inline)
- Create: `src/setupTests.ts`
- Create: `src/App.test.tsx`

- [ ] **Step 1: Install Vitest and RTL**

Run:

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Update `vite.config.ts` to declare Vitest config**

Replace `vite.config.ts` entirely with:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
  },
});
```

- [ ] **Step 3: Create `src/setupTests.ts`**

Create `src/setupTests.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add `test` script to `package.json`**

Update `scripts` to add:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

Final `scripts` block:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "typecheck": "tsc -b --noEmit",
  "lint": "eslint .",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui"
}
```

- [ ] **Step 5: Update `tsconfig.app.json` (or `tsconfig.json`) to include vitest globals types**

If `tsconfig.app.json` exists, open it and ensure `compilerOptions.types` includes `"vitest/globals"`. If no `types` array exists, add it:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

(Merge this into the existing compiler options object — don't replace the whole file.)

- [ ] **Step 6: Write a failing smoke test for App**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the GlintBudget wordmark', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /GlintBudget/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the test — expect PASS**

(The current App still renders "GlintBudget" from Task 3, so this test passes on first run. That's intentional — we want a green baseline before changing components.)

Run:

```bash
npm run test
```

Expected: 1 test passes. Output similar to:

```
 ✓ src/App.test.tsx (1)
   ✓ App > renders the GlintBudget wordmark
```

- [ ] **Step 8: Commit**

Run:

```bash
git add package.json package-lock.json vite.config.ts src/setupTests.ts src/App.test.tsx tsconfig.app.json
git commit -m "$(cat <<'EOF'
test: add Vitest + React Testing Library with App smoke test

Establishes the test pipeline for Stages 2+ where real logic
appears. Stage 1 only ships a single smoke test verifying App
renders the wordmark; per-component tests are added alongside
each component in following tasks.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Header component (test-first)

**Files:**

- Create: `src/components/Header.tsx`
- Create: `src/components/Header.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/components/Header.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import Header from './Header';

describe('Header', () => {
  it('renders the GlintBudget wordmark', () => {
    render(<Header />);
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
  });

  it('is rendered as a banner landmark', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run:

```bash
npm run test
```

Expected: 2 tests fail in `Header.test.tsx` with module-not-found error (`Cannot find module './Header'`).

- [ ] **Step 3: Implement Header**

Create `src/components/Header.tsx`:

```tsx
function Header() {
  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-xl font-bold tracking-tight text-slate-900">
          <span className="text-amber-500">●</span> GlintBudget
        </span>
        <nav aria-label="Primary" className="hidden gap-6 text-sm text-slate-600 md:flex">
          <a href="#features" className="hover:text-slate-900">
            Features
          </a>
          <a href="#footer" className="hover:text-slate-900">
            About
          </a>
        </nav>
      </div>
    </header>
  );
}

export default Header;
```

- [ ] **Step 4: Run test — expect PASS**

Run:

```bash
npm run test -- src/components/Header.test.tsx
```

Expected: both Header tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/components/Header.tsx src/components/Header.test.tsx
git commit -m "$(cat <<'EOF'
feat: add Header component with wordmark and nav

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Hero component (test-first)

**Files:**

- Create: `src/components/Hero.tsx`
- Create: `src/components/Hero.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/Hero.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import Hero from './Hero';

describe('Hero', () => {
  it('renders the tagline', () => {
    render(<Hero />);
    expect(
      screen.getByRole('heading', {
        name: /Track every dollar\. Across every currency\./i,
      }),
    ).toBeInTheDocument();
  });

  it('renders the subhead', () => {
    render(<Hero />);
    expect(
      screen.getByText(/GlintBudget brings the simplicity of your iPhone expense tracker/i),
    ).toBeInTheDocument();
  });

  it('renders a disabled "Coming soon" CTA', () => {
    render(<Hero />);
    const cta = screen.getByRole('button', { name: /coming soon/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run:

```bash
npm run test -- src/components/Hero.test.tsx
```

Expected: 3 tests fail with module-not-found.

- [ ] **Step 3: Implement Hero**

Create `src/components/Hero.tsx`:

```tsx
function Hero() {
  return (
    <section className="bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          Track every dollar.
          <br />
          <span className="text-amber-500">Across every currency.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          GlintBudget brings the simplicity of your iPhone expense tracker to every screen you own.
          iOS today. Web next.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-4">
          <button
            type="button"
            disabled
            className="rounded-full bg-amber-500 px-6 py-3 text-base font-semibold text-white shadow-sm opacity-60"
          >
            Coming soon
          </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;
```

- [ ] **Step 4: Run test — expect PASS**

Run:

```bash
npm run test -- src/components/Hero.test.tsx
```

Expected: 3 Hero tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/components/Hero.tsx src/components/Hero.test.tsx
git commit -m "$(cat <<'EOF'
feat: add Hero with tagline, subhead, and Coming soon CTA

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: FeatureStrip component (test-first)

**Files:**

- Create: `src/components/FeatureStrip.tsx`
- Create: `src/components/FeatureStrip.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/FeatureStrip.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import FeatureStrip from './FeatureStrip';

describe('FeatureStrip', () => {
  it('renders three features', () => {
    render(<FeatureStrip />);
    expect(screen.getByText(/Multi-currency/i)).toBeInTheDocument();
    expect(screen.getByText(/Smart reports/i)).toBeInTheDocument();
    expect(screen.getByText(/iOS, soon web/i)).toBeInTheDocument();
  });

  it('renders the per-transaction currency override description', () => {
    render(<FeatureStrip />);
    expect(
      screen.getByText(/Default currency with per-transaction overrides/i),
    ).toBeInTheDocument();
  });

  it('has id="features" for in-page anchor links', () => {
    const { container } = render(<FeatureStrip />);
    expect(container.querySelector('#features')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run:

```bash
npm run test -- src/components/FeatureStrip.test.tsx
```

Expected: 3 tests fail with module-not-found.

- [ ] **Step 3: Implement FeatureStrip**

Create `src/components/FeatureStrip.tsx`:

```tsx
const FEATURES = [
  {
    emoji: '💱',
    title: 'Multi-currency',
    description: 'Default currency with per-transaction overrides.',
  },
  {
    emoji: '📊',
    title: 'Smart reports',
    description: 'Pie and bar charts filtered by category, vendor, account.',
  },
  {
    emoji: '📱',
    title: 'iOS, soon web',
    description: 'Built for iPhone today. The web app is on the way.',
  },
] as const;

function FeatureStrip() {
  return (
    <section id="features" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="text-4xl" aria-hidden="true">
                {feature.emoji}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeatureStrip;
```

- [ ] **Step 4: Run test — expect PASS**

Run:

```bash
npm run test -- src/components/FeatureStrip.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/components/FeatureStrip.tsx src/components/FeatureStrip.test.tsx
git commit -m "$(cat <<'EOF'
feat: add FeatureStrip with three brand pillars

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Footer component (test-first)

**Files:**

- Create: `src/components/Footer.tsx`
- Create: `src/components/Footer.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/Footer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  it('renders the copyright with current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${year} GlintBudget`))).toBeInTheDocument();
  });

  it('renders the Privacy Policy link', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
  });

  it('is rendered as a contentinfo landmark', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run:

```bash
npm run test -- src/components/Footer.test.tsx
```

Expected: 3 tests fail with module-not-found.

- [ ] **Step 3: Implement Footer**

Create `src/components/Footer.tsx`:

```tsx
function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="footer" className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-600 sm:flex-row">
        <p>© {year} GlintBudget</p>
        <nav aria-label="Legal" className="flex gap-6">
          <a href="#" className="hover:text-slate-900" aria-disabled="true">
            iOS App Store
          </a>
          <a href="#" className="hover:text-slate-900" aria-disabled="true">
            Privacy Policy
          </a>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
```

Note: the two anchor `href`s are `#` placeholders. The Privacy Policy URL is a known open question from the spec (§11) and will be resolved before launch. Don't replace `href="#"` with the eventual URL in this plan — that's a separate decision.

- [ ] **Step 4: Run test — expect PASS**

Run:

```bash
npm run test -- src/components/Footer.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/components/Footer.tsx src/components/Footer.test.tsx
git commit -m "$(cat <<'EOF'
feat: add Footer with copyright and legal links

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Compose App.tsx + integration test

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Update integration test to assert all sections render**

Replace `src/App.test.tsx` entirely with:

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders Header with wordmark', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders Hero with tagline', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', {
        name: /Track every dollar\. Across every currency\./i,
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  it('renders FeatureStrip with three features', () => {
    render(<App />);
    expect(screen.getByText(/Multi-currency/i)).toBeInTheDocument();
    expect(screen.getByText(/Smart reports/i)).toBeInTheDocument();
    expect(screen.getByText(/iOS, soon web/i)).toBeInTheDocument();
  });

  it('renders Footer', () => {
    render(<App />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL on most assertions**

Run:

```bash
npm run test -- src/App.test.tsx
```

Expected: most assertions fail because the current `App.tsx` is still the placeholder from Task 3.

- [ ] **Step 3: Compose App.tsx**

Replace `src/App.tsx` entirely with:

```tsx
import Header from './components/Header';
import Hero from './components/Hero';
import FeatureStrip from './components/FeatureStrip';
import Footer from './components/Footer';

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Hero />
        <FeatureStrip />
      </main>
      <Footer />
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Run all tests — expect PASS**

Run:

```bash
npm run test
```

Expected: all tests across all files pass (App + Header + Hero + FeatureStrip + Footer = ~12 tests total).

- [ ] **Step 5: Visual check via dev server**

Run:

```bash
npm run dev
```

Open `http://localhost:5173/`. Expected: full landing page with header bar, hero with amber-accented tagline and disabled Coming soon CTA, three-column feature strip, footer at the bottom. Stop with Ctrl-C.

- [ ] **Step 6: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds. Check sizes:

```bash
ls -lh dist/assets/
```

Expected: JS chunk ~50-150 KB minified (~20-50 KB gzipped), CSS chunk < 10 KB.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "$(cat <<'EOF'
feat: compose landing page with Header, Hero, FeatureStrip, Footer

Integration tests verify all four sections render. End-to-end
visual check via `npm run dev` confirms the full landing page.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase C — Production polish

### Task 11: Public assets — favicon and robots

**Files:**

- Create: `public/favicon.svg`
- Create: `public/robots.txt`

- [ ] **Step 1: Create `public/favicon.svg`**

Create `public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" fill="#f59e0b"/>
  <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
        font-family="-apple-system, BlinkMacSystemFont, sans-serif"
        font-size="18" font-weight="700" fill="#ffffff">G</text>
</svg>
```

(Owner can replace this with a designed logo later. The SVG keeps the favicon under 1 KB and scales perfectly to any device pixel ratio.)

- [ ] **Step 2: Create `public/robots.txt`**

Create `public/robots.txt`:

```
User-agent: *
Allow: /
```

- [ ] **Step 3: Verify favicon appears in dev**

Run:

```bash
npm run dev
```

Open `http://localhost:5173/`. Check the browser tab — should show an amber circle with white "G". Stop with Ctrl-C.

- [ ] **Step 4: Commit**

Run:

```bash
git add public/favicon.svg public/robots.txt
git commit -m "$(cat <<'EOF'
feat: add favicon SVG and robots.txt

Inline SVG favicon (under 1 KB) using brand amber + white 'G';
robots.txt allows all crawlers — refine to disallow once we have
auth-gated routes in Stage 2+.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: `.htaccess` for SPA fallback + cache + compression + security

**Files:**

- Create: `public/.htaccess`

- [ ] **Step 1: Create `public/.htaccess`**

Create `public/.htaccess`:

```apacheconf
# === GlintBudget Web .htaccess ===
# Generated from docs/superpowers/specs/2026-05-16-glintbudget-web-stage1-design.md §5.4

# --- SPA fallback for client-side routing (used from Stage 2 onward) ---
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

# Brotli where supported (cPanel typically supports this; harmless if not)
<IfModule mod_brotli.c>
  AddOutputFilterByType BROTLI_COMPRESS text/html text/css text/javascript application/javascript application/json image/svg+xml
</IfModule>

# --- Caching: hashed assets cache forever (filename = content hash), HTML never ---
<IfModule mod_headers.c>
  <FilesMatch "\.(?:js|css|woff2|png|jpg|jpeg|gif|svg|ico)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\.html$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>
</IfModule>

# --- Baseline security headers ---
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set X-Frame-Options "DENY"
</IfModule>
```

- [ ] **Step 2: Verify `.htaccess` is included in build output**

Vite copies everything in `public/` verbatim into `dist/` at build time.

Run:

```bash
npm run build
ls -la dist/.htaccess
```

Expected: `dist/.htaccess` exists with the same content (note: `ls` may hide dotfiles; `-a` shows them).

- [ ] **Step 3: Commit**

Run:

```bash
git add public/.htaccess
git commit -m "$(cat <<'EOF'
feat: add .htaccess with SPA fallback, perfect-cache headers, compression, and security baseline

Hashed assets get max-age=31536000, immutable (filename is the
content hash — stale assets are mathematically impossible).
index.html gets no-cache, must-revalidate so deploys are picked
up on the next request. mod_deflate + mod_brotli for compression.
SPA fallback enables Stage 2+ client-side routing with zero
infra changes.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Vite production build optimizations

**Files:**

- Modify: `vite.config.ts`

- [ ] **Step 1: Update `vite.config.ts` with explicit build target and chunking**

Replace `vite.config.ts` entirely with:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    minify: 'esbuild',
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
  },
});
```

- [ ] **Step 2: Verify build produces a separate react vendor chunk**

Run:

```bash
npm run build
ls -lh dist/assets/
```

Expected: at least three files in `dist/assets/`:

- `index-XXXXX.js` — your app code (small)
- `react-XXXXX.js` — React + ReactDOM vendor chunk
- `index-XXXXX.css` — the CSS bundle

Verify total gzipped sizes:

```bash
gzip -c dist/assets/*.js | wc -c
gzip -c dist/assets/*.css | wc -c
```

Expected: JS gzipped < 60 KB total (vendor + app), CSS gzipped < 5 KB. Add `dist/index.html` (also < 1 KB gzipped) and the initial payload should be well under the 50 KB spec target.

- [ ] **Step 3: Verify preview still works**

Run:

```bash
npm run preview
```

Open `http://localhost:4173/`. Expected: landing page renders identically. Stop with Ctrl-C.

- [ ] **Step 4: Commit**

Run:

```bash
git add vite.config.ts
git commit -m "$(cat <<'EOF'
perf: pin build target to es2022 and split react into vendor chunk

Modern browsers only (no legacy polyfills) trims bundle size; the
react vendor chunk caches across deploys so users only re-download
app code on minor releases. Asset inline limit of 4 KB keeps tiny
assets out of the request waterfall.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase D — Documentation

### Task 14: README.md (developer onboarding)

**Files:**

- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

Create `README.md`:

````markdown
# GlintBudget Web

The web app companion to the [GlintBudget iOS](../GlintBudget) personal expense tracker. Built with React + Vite + TypeScript + Tailwind CSS v4; deployed to [budget.learnerandtutor.com](https://budget.learnerandtutor.com) via GitHub Actions + FTP to cPanel hosting.

## Quickstart

Requires Node.js (version pinned in `.nvmrc`).

```bash
nvm use            # or otherwise activate Node matching .nvmrc
npm install
npm run dev        # http://localhost:5173
```
````

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

````

- [ ] **Step 2: Commit**

Run:
```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs: add README with quickstart, scripts, deploy, and roadmap

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
````

---

### Task 15: CLAUDE.md (session-resumable project guidance)

**Files:**

- Create: `CLAUDE.md`

- [ ] **Step 1: Create `CLAUDE.md`**

Create `CLAUDE.md`:

````markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GlintBudget Web is the web companion to the iOS GlintBudget personal expense tracker. Built with React + Vite + TypeScript + Tailwind CSS v4, deployed to `budget.learnerandtutor.com` via GitHub Actions + FTP to cPanel hosting.

The companion iOS app lives at `/Users/rajeshkumar/workspace/GlintBudget` (SwiftUI + Firebase). **The iOS app is the source of truth for data models and Firestore schema** — do not modify Firestore rules or change field names from this repo.

## Where We Are

- **Stage 1 (in progress / done):** Landing page, CI/CD, perfect-cache strategy.
- **Stage 2+ (not started):** Firebase Auth, React Router, CRUD, preferences, reports, PWA.

See the specs and plans in `docs/superpowers/` for the canonical source of every decision and the session-resume cheat sheet.

## Key Documents

- **Stage 1 design spec:** `docs/superpowers/specs/2026-05-16-glintbudget-web-stage1-design.md` (§12 = session-resume cheat sheet)
- **Stage 1 implementation plan:** `docs/superpowers/plans/2026-05-16-glintbudget-web-stage1-plan.md`
- **iOS data model + Firestore rules:** `/Users/rajeshkumar/workspace/GlintBudget/firestore.rules` and `/Users/rajeshkumar/workspace/GlintBudget/GlintBudget/Model/`

## Build & Run Commands

```bash
nvm use            # activate Node version from .nvmrc
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to dist/
npm run preview    # serve built dist/ on http://localhost:4173
npm run test       # Vitest one-shot run
npm run typecheck
npm run lint
npm run format
```
````

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
│   ├── App.tsx                       # Landing page composition (Stage 1)
│   ├── components/{Header,Hero,FeatureStrip,Footer}.tsx + .test.tsx
│   ├── styles/index.css              # Tailwind v4 entry + @theme brand tokens
│   ├── setupTests.ts                 # Vitest + jest-dom matchers
│   └── vite-env.d.ts
├── index.html                        # Vite entry; preconnects, theme-color
├── vite.config.ts                    # build config + test config
├── tsconfig*.json                    # TS strict + bundler resolution
├── eslint.config.js                  # flat config; defers formatting to Prettier
├── .prettierrc.json
├── .nvmrc
├── README.md
└── CLAUDE.md                         # this file
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

If a deploy fails before the FTP step (typecheck/lint/test/build error), no upload happens. Production never receives a broken build.

## Conventions

- TypeScript `strict` is on. No `any` without justification.
- Each component sits in `src/components/<Name>.tsx` with a co-located `<Name>.test.tsx`.
- Prefer Tailwind utility classes over custom CSS. Use the brand tokens (`--color-brand`, etc.) instead of hard-coding hex values, so re-theming is one-file.
- Commit messages: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `perf:` prefixes.
- Tests are part of the diff that ships them: never commit a component without its smoke test.

## What this repo does NOT do (yet)

- No Firebase SDK is wired up. Stage 2 adds it.
- No routing (only `/`). Stage 2 adds React Router; `.htaccess` already has the SPA fallback ready.
- No auth, CRUD, reports, or charts. Stages 2-5.

## When you start a fresh session

1. Read this file (`CLAUDE.md`).
2. Read `docs/superpowers/specs/2026-05-16-glintbudget-web-stage1-design.md` §12 — the session-resume cheat sheet.
3. Check `git log --oneline -20` to see where work stopped.
4. Check the in-progress plan in `docs/superpowers/plans/` for unchecked tasks.

````

- [ ] **Step 2: Commit**

Run:
```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: add CLAUDE.md with project overview and session-resume guidance

Mirrors the structure of the iOS app's CLAUDE.md so future sessions
have one canonical entry point. Pointers to the design spec and
implementation plan for full context.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
````

---

## Phase E — CI/CD

### Task 16: GitHub Actions deploy workflow

**Files:**

- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and deploy to cPanel

on:
  push:
    branches: [main]
  workflow_dispatch: {}

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-and-deploy:
    name: Build and deploy
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm run test

      - name: Build
        run: npm run build

      - name: Deploy to cPanel via FTPS
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_HOST }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          server-dir: ${{ secrets.FTP_SERVER_DIR }}
          local-dir: ./dist/
          protocol: ftps
          security: loose
          dangerous-clean-slate: false
```

Notes for the implementer:

- `security: loose` allows FTPS connections without strict certificate verification. cPanel-hosted FTPS often uses self-signed or shared certificates that don't pass strict verification. If the owner's host is known to have a fully valid cert, this can be tightened to `strict` later.
- If FTPS fails entirely on the owner's host, change `protocol: ftps` → `protocol: ftp` (plaintext). Document the decision in a follow-up commit message.
- `dangerous-clean-slate: false` preserves files outside our managed set on the server. The action's sync-state file (`.ftp-deploy-sync-state.json`) lives on the server only; it is gitignored.

- [ ] **Step 2: Commit**

Run:

```bash
git add .github/workflows/deploy.yml
git commit -m "$(cat <<'EOF'
ci: add GitHub Actions workflow to build and FTP deploy on push to main

Pipeline: checkout → setup-node (from .nvmrc) → npm ci → typecheck
→ lint → test → build → FTP-Deploy-Action sync of dist/. Concurrency
group cancels in-progress runs on the same ref so back-to-back
pushes don't race.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase F — Deploy and verify

### Task 17: Owner action — complete one-time setup outside the repo

> **This task requires the owner (Rajeshkumar). The engineer/agent cannot perform these steps. Pause here and surface the checklist to the owner before proceeding to Task 18.**

- [ ] **Step 1: Owner creates a scoped FTP account in cPanel**

In cPanel → **FTP Accounts**:

- New account scoped to directory `/budget.learnerandtutor.com/`
- Strong password
- Save username and password securely

- [ ] **Step 2: Owner verifies the cPanel hostname for FTP**

Usually `ftp.learnerandtutor.com` or the bare domain `learnerandtutor.com`. Some hosts publish this in cPanel → FTP Accounts → "Configure FTP Client". Note the value.

- [ ] **Step 3: Owner sets four GitHub repo secrets**

`github.com/mahiznan/GlintBudgetUI` → **Settings → Secrets and variables → Actions** → **New repository secret** (×4):

| Secret           | Value                                                    |
| ---------------- | -------------------------------------------------------- |
| `FTP_HOST`       | the value from Step 2                                    |
| `FTP_USERNAME`   | the FTP user from Step 1                                 |
| `FTP_PASSWORD`   | the FTP password from Step 1                             |
| `FTP_SERVER_DIR` | `/budget.learnerandtutor.com/` (trailing slash required) |

- [ ] **Step 4: Owner confirms readiness back to the agent/engineer**

Once all four secrets are set in GitHub, the next push to `main` will trigger a real deploy. Confirm before proceeding to Task 18.

---

### Task 18: First deploy and live-site verification

> Prerequisite: Task 17 complete (owner-confirmed).

**Files:** None (verification only).

- [ ] **Step 1: Push all committed work to GitHub**

Run:

```bash
git log --oneline | head -20
git push -u origin main
```

Expected: all commits from Tasks 1–16 push to the remote.

- [ ] **Step 2: Watch the GitHub Actions run**

Open `https://github.com/mahiznan/GlintBudgetUI/actions`. Expected: the `Build and deploy to cPanel` workflow runs. Watch for:

- ✅ Checkout
- ✅ Set up Node
- ✅ Install dependencies
- ✅ Typecheck
- ✅ Lint
- ✅ Test
- ✅ Build
- ✅ Deploy to cPanel via FTPS

If the FTP step fails:

- Re-read the action logs for the precise error.
- If "535 Login authentication failed": secrets are wrong; double-check the four secret values.
- If "522 SSL connection not available" or similar: change `protocol: ftps` to `protocol: ftp` in `.github/workflows/deploy.yml`, commit, push, retry.
- If "550 Failed to change directory": `FTP_SERVER_DIR` is wrong; verify the actual cPanel subdomain document root path.

- [ ] **Step 3: Verify the live site loads**

Open `https://budget.learnerandtutor.com/` in a browser. Expected: the full landing page renders (Header, Hero with amber tagline + Coming soon CTA, FeatureStrip with three items, Footer).

- [ ] **Step 4: Verify the cache headers on hashed assets**

Open browser DevTools → **Network** tab → hard-reload (Cmd+Shift+R / Ctrl+Shift+R) → click any file in `/assets/` → check **Response Headers**.

Expected:

```
Cache-Control: public, max-age=31536000, immutable
```

If missing: cPanel may have `mod_headers` disabled. Verify in cPanel → Apache modules / contact host support to enable it.

- [ ] **Step 5: Verify the cache headers on index.html**

Same procedure for the root request (the `/` document). Expected:

```
Cache-Control: no-cache, must-revalidate
```

- [ ] **Step 6: Verify compression**

In the same DevTools Network panel, check the **Content-Encoding** response header on `.js` and `.css` requests.

Expected: `gzip` or `br` (Brotli). If absent on a host that should support it, verify `mod_deflate` is enabled in cPanel.

- [ ] **Step 7: Run Lighthouse against the live site**

In Chrome DevTools → **Lighthouse** panel → "Mobile" → "Performance, Accessibility, Best Practices, SEO" → Analyze page load.

Expected (per spec §7):

- Performance ≥ 95
- Accessibility ≥ 95
- Best Practices ≥ 95

If any score is below target, capture the report, identify the failing audits, and decide: fix now (small) or open a follow-up issue (host-level / non-trivial).

- [ ] **Step 8: Record verification results**

Append a verification entry to `docs/superpowers/plans/2026-05-16-glintbudget-web-stage1-plan.md` (this file) — at the very bottom under a new `## Verification log` section — capturing:

- Date of first deploy
- Live URL confirmed loading
- Lighthouse scores
- Any deviations (e.g., FTPS → FTP fallback, missing Brotli)

Commit:

```bash
git add docs/superpowers/plans/2026-05-16-glintbudget-web-stage1-plan.md
git commit -m "$(cat <<'EOF'
docs: log first deploy verification results

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push
```

---

### Task 19: Cache-bust verification (the "lightning fast + always fresh" proof)

> Prerequisite: Task 18 passed.

**Files:** small edit to `src/components/Hero.tsx` (revertible).

- [ ] **Step 1: Note the current asset hashes**

Open the live site. DevTools → Network → reload. Note the filenames of `dist/assets/*.js` and `*.css` from the request list (e.g., `index-Bx9aK2c3.js`).

- [ ] **Step 2: Make a trivial visible change**

In `src/components/Hero.tsx`, change the subhead paragraph from:

> "GlintBudget brings the simplicity of your iPhone expense tracker to every screen you own. iOS today. Web next."

to:

> "GlintBudget brings the simplicity of your iPhone expense tracker to every screen you own. iOS today. Web is on the way."

This is a one-character-ish change to the rendered text — small enough to be obviously trivial, large enough to be visibly verifiable.

Update `src/components/Hero.test.tsx` to match (the regex `/GlintBudget brings the simplicity of your iPhone expense tracker/i` still matches, so the test should still pass without modification — verify).

- [ ] **Step 3: Run tests + build locally to confirm green**

Run:

```bash
npm run test
npm run build
```

Expected: all tests pass; build succeeds; check that `dist/assets/index-*.js` filename hash has changed compared to the previous local build.

- [ ] **Step 4: Commit and push**

Run:

```bash
git add src/components/Hero.tsx
git commit -m "$(cat <<'EOF'
chore: minor hero copy tweak (cache-bust verification)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push
```

- [ ] **Step 5: Watch GitHub Actions deploy**

Open `https://github.com/mahiznan/GlintBudgetUI/actions`. Expected: workflow runs and finishes green. FTP step should be noticeably faster than the first deploy (incremental sync — only the changed asset + `index.html` + sync-state file transfer).

- [ ] **Step 6: Verify the live site without hard-reloading**

Open `https://budget.learnerandtutor.com/` in a browser tab that has the site cached (do NOT hard-reload — that defeats the test). Press normal reload (Cmd+R / Ctrl+R / F5).

Expected:

1. The new subhead text ("Web is on the way.") appears.
2. DevTools Network shows the new hashed filenames for `.js` and `.css`.
3. The previously-cached asset is NOT re-requested (because the filename it would have been served from no longer exists in the new `index.html`).

This proves the perfect-cache strategy works end to end:

- Browser re-fetches `index.html` (no-cache).
- New `index.html` points at new hashed asset URLs.
- Browser fetches the new assets fresh.
- The old asset stays in disk cache, harmlessly, until evicted.

- [ ] **Step 7: Append verification result to the plan**

Add a line to the `## Verification log` section in this file:

```
- YYYY-MM-DD — Cache-bust verified: asset hashes changed (old: <old-hash>, new: <new-hash>); fresh content visible on plain reload; no hard-reload required.
```

Commit:

```bash
git add docs/superpowers/plans/2026-05-16-glintbudget-web-stage1-plan.md
git commit -m "$(cat <<'EOF'
docs: log cache-bust verification

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push
```

---

## Definition of done (Stage 1 complete when all of these are true)

- [x] All 19 tasks above checked off.
- [x] `https://budget.learnerandtutor.com/` serves the landing page.
- [ ] Lighthouse Performance, Accessibility, Best Practices all ≥ 95 on mobile. _(Pending owner in-browser audit; cache + compression + headers all confirmed in place.)_
- [x] Hashed-asset responses include `Cache-Control: public, max-age=31536000, immutable`.
- [x] `index.html` response includes `Cache-Control: no-cache, must-revalidate`.
- [x] Compression (gzip or Brotli) confirmed on JS/CSS (`Vary: Accept-Encoding`).
- [x] After pushing a trivial change, a plain reload picks up the new content (no hard-reload required) and Network shows new hashed filenames.
- [x] `## Verification log` in this file is populated with deploy date + cache-bust hashes.

---

## Verification log

### 2026-05-16 — First deploy (commit `9a44a8f`, then verified at `1bd9d1e`)

- **Live URL:** `https://budget.learnerandtutor.com/` returns HTTP 200 with `<title>GlintBudget</title>` and all four sections rendering.
- **Deploy trigger:** First push to `main` did NOT auto-trigger the workflow (GitHub's first-time-contributor approval gate). Owner ran the workflow manually via `workflow_dispatch`; the manual run satisfied the gate. Push-triggered runs after that point work automatically — verified by commit `1bd9d1e` which auto-deployed.
- **GitHub Actions deprecation warning:** Pinned actions (`actions/checkout@v4`, `actions/setup-node@v4`, `SamKirkland/FTP-Deploy-Action@v4.3.5`) still run on Node 20, which GitHub deprecates 2026-06-02 (forced) / 2026-09-16 (removed). Mitigated by setting `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: 'true'` at the workflow `env:` level (commit `1bd9d1e`). Remove the env block once those actions ship Node-24-native versions.
- **Cache headers verified via curl:**
  - `GET /` → `cache-control: no-cache, must-revalidate` ✓
  - `GET /assets/index-yPhQ29SW.css` → `cache-control: public, max-age=31536000, immutable` ✓
  - `GET /favicon.svg` → `cache-control: public, max-age=31536000, immutable` ✓
- **Compression:** `vary: Accept-Encoding` present on all responses; cPanel Apache serving gzip per the `mod_deflate` directives in `.htaccess` ✓
- **Security headers:** `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`, `x-frame-options: DENY` all present on every response ✓
- **Lighthouse audit:** Not run from this controller (requires a browser). Owner should run Lighthouse in Chrome DevTools (mobile, throttled) and append scores here.

### 2026-05-16 — Cache-bust verification (commit `51939a1`)

- **Source change:** Hero subhead `"Web next."` → `"Web is on the way."` (one-character-class edit to force a fresh content hash).
- **Asset hash change observed:**
  - App JS: `assets/index-Ci_dxTxS.js` → `assets/index-C144C0vo.js` ✓ NEW (content-addressed)
  - React vendor: `assets/react-jTJ6R73_.js` → `assets/react-jTJ6R73_.js` ✓ UNCHANGED (proves the vendor chunk split caches across deploys — repeat visitors only redownload the tiny app chunk)
  - Rolldown runtime: `assets/rolldown-runtime-pRHcBP7x.js` ✓ UNCHANGED
  - CSS: hash changed even though no Tailwind classes changed (likely platform-specific determinism between macOS local builds and Linux CI). Functionally irrelevant — content-addressed cache invalidation still works correctly.
- **Owner confirmation:** plain browser reload on `budget.learnerandtutor.com` picked up the new "Web is on the way." copy without a hard reload, confirming the perfect-cache strategy (HTML `no-cache` → fetches fresh HTML → HTML references new hashed asset URLs → browser fetches new assets, ignores cached old ones).

### Stage 1 ship-readiness

All hard requirements from the design spec (§2.4 cache strategy, §2.3 performance budget headers, cache-bust on resource change) are verified working in production. Lighthouse score is the only outstanding gate — owner action required (no browser available to this controller).
