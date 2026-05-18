# GlintBudget Theme System + Glassmorphism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 4-theme color system (Lime/Forest/Ocean/Amber) via CSS custom properties, persisted to Firestore, with glassmorphism on key surfaces and an Appearance tab in Settings.

**Architecture:** CSS custom properties on `:root` define runtime theme tokens (gradient strings); `@theme {}` in Tailwind holds static design tokens defaulting to Lime; `[data-theme]` blocks on `<html>` override both at runtime. A `ThemeProvider` reads the active theme from `PreferenceContext` and writes `document.documentElement.dataset.theme`; chart components read the active theme via `useTheme()` to get hex colors for SVG attributes (which cannot use CSS `var()`).

**Tech Stack:** React + TypeScript strict, Tailwind CSS v4, Vitest + RTL, Firestore (existing `useUpdatePreference` hook)

**Spec:** `docs/superpowers/specs/2026-05-18-glintbudget-theme-system-design.md`

---

## File Map

**Create:**
- `src/lib/themes.ts` — Theme type, THEMES array, getTheme helper
- `src/lib/themes.test.ts` — unit tests for themes data
- `src/context/ThemeContext.tsx` — ThemeContextValue + useTheme hook
- `src/context/ThemeProvider.tsx` — applies data-theme, exposes setTheme
- `src/context/ThemeProvider.test.tsx` — unit tests for ThemeProvider
- `src/components/settings/AppearanceTab.tsx` — 2×2 swatch picker
- `src/components/settings/AppearanceTab.test.tsx` — unit tests

**Modify:**
- `src/styles/index.css` — @theme Lime defaults, runtime CSS vars, [data-theme] blocks, .glass class
- `src/firestore/types.ts` — add `theme?: string` to Preference
- `src/hooks/useUpdatePreference.ts` — add `theme?: string` to FirestorePreferencePartial
- `src/App.tsx` — wrap with ThemeProvider
- `src/components/layout/Sidebar.tsx` — `var(--sidebar-gradient)` replaces hardcoded hex
- `src/components/layout/TopBar.tsx` — `var(--brand-gradient)` on period pills + Add button
- `src/routes/Settings.tsx` — `var(--brand-gradient)` on active tab + wire AppearanceTab
- `src/components/form/TypeToggle.tsx` — `var(--brand-gradient)` on active state
- `src/components/settings/CurrencyTab.tsx` — `var(--brand-gradient)` on button
- `src/components/settings/BudgetDataTab.tsx` — `var(--brand-gradient)` on 2 buttons
- `src/components/settings/SubcategoriesTab.tsx` — `var(--brand-gradient)` on 2 buttons
- `src/routes/TransactionForm.tsx` — `var(--brand-gradient)` on submit button
- `src/components/transactions/DateRangeFilter.tsx` — `var(--brand-gradient)` on active button
- `src/components/dashboard/DailyTransactions.tsx` — 4 hardcoded inline values → CSS vars
- `src/components/dashboard/SpendingChart.tsx` — bar fill from `theme.chartColor`
- `src/components/dashboard/CategoryBreakdown.tsx` — category colors from `theme.categoryColors`
- `src/components/dashboard/IncomeExpenseDonut.tsx` — income color from `theme.chartColor`

---

## Task 1: CSS Foundations

**Files:**
- Modify: `src/styles/index.css` (full replacement)

The `@theme {}` block changes from Forest defaults to Lime defaults. Six runtime gradient variables are added to `:root` (and overridden by `[data-theme]` blocks). `.card-surface` becomes glassmorphism. `.glass` utility class is added. `.hero-gradient` and `.gradient-text` are updated to use CSS vars.

> **Note:** `@theme` in Tailwind v4 generates both CSS custom properties on `:root` AND Tailwind utility classes (`bg-brand`, `text-brand`, etc.). The `[data-theme]` attribute selector on `<html>` has higher specificity than `:root`, so it overrides `@theme` variables at runtime — no `!important` needed.

> **Note on chart SVG:** SVG `fill` attributes don't resolve CSS `var()` references (SVG attributes vs CSS properties). Chart components use `getTheme(themeId).chartColor` to get a literal hex color (see Tasks 7 and 8).

- [ ] **Step 1: Replace `src/styles/index.css` with the following**

```css
@import 'tailwindcss';

@theme {
  /* GlintBudget brand palette — Lime is the default theme */
  --color-brand:       rgb(150,191,13);
  --color-brand-dark:  rgb(80,120,0);
  --color-accent:      #22c55e;
  --color-highlight:   rgb(150,191,13);
  --color-text:        #0f172a;       /* slate-900 */
  --color-text-muted:  #475569;       /* slate-600 */
  --color-surface:     #ffffff;
  --color-surface-alt: #f8fafc;       /* slate-50 */
  --color-border:      #e2e8f0;       /* slate-200 */

  /* Typography */
  --font-sans: 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

/* ── Runtime theme variables (Lime defaults) ──────────────────────────── */
/* Gradient strings cannot live in @theme; they live here as plain CSS     */
/* custom properties. [data-theme] blocks below override them per theme.   */
:root {
  --sidebar-gradient:    linear-gradient(180deg, rgb(80,120,0) 0%, rgb(150,191,13) 60%, #22c55e 100%);
  --hero-gradient:       linear-gradient(120deg, rgb(80,120,0) 0%, rgb(150,191,13) 40%, #22c55e 70%, #ecfccb 100%);
  --hero-text-gradient:  linear-gradient(135deg, #ffffff 0%, #ecfccb 60%, rgb(150,191,13) 100%);
  --brand-gradient:      linear-gradient(135deg, rgb(150,191,13), #22c55e);
  --brand-glow:          rgba(150,191,13,0.45);
  --brand-gradient-text: linear-gradient(135deg, rgb(150,191,13), #22c55e);
}

[data-theme="forest"] {
  --color-brand:         #007836;
  --color-brand-dark:    #003d1c;
  --color-accent:        #1fa32e;
  --color-highlight:     #96bf0d;
  --sidebar-gradient:    linear-gradient(180deg, #003d1c 0%, #005c2a 50%, #007836 100%);
  --hero-gradient:       linear-gradient(120deg, #003d1c 0%, #007836 40%, #1fa32e 70%, #e8f5e9 100%);
  --hero-text-gradient:  linear-gradient(135deg, #ffffff 0%, #d1fae5 60%, #96bf0d 100%);
  --brand-gradient:      linear-gradient(135deg, #007836, #1fa32e);
  --brand-glow:          rgba(0,120,54,0.45);
  --brand-gradient-text: linear-gradient(135deg, #007836, #1fa32e);
}

[data-theme="ocean"] {
  --color-brand:         #2563eb;
  --color-brand-dark:    #0c2d5e;
  --color-accent:        #0ea5e9;
  --color-highlight:     #60a5fa;
  --sidebar-gradient:    linear-gradient(180deg, #0c2d5e 0%, #1e4d9b 50%, #2563eb 100%);
  --hero-gradient:       linear-gradient(120deg, #0c2d5e 0%, #2563eb 40%, #0ea5e9 70%, #e0f2fe 100%);
  --hero-text-gradient:  linear-gradient(135deg, #ffffff 0%, #dbeafe 60%, #60a5fa 100%);
  --brand-gradient:      linear-gradient(135deg, #2563eb, #0ea5e9);
  --brand-glow:          rgba(37,99,235,0.45);
  --brand-gradient-text: linear-gradient(135deg, #2563eb, #0ea5e9);
}

[data-theme="amber"] {
  --color-brand:         #b45309;
  --color-brand-dark:    #78350f;
  --color-accent:        #f59e0b;
  --color-highlight:     #fbbf24;
  --sidebar-gradient:    linear-gradient(180deg, #78350f 0%, #92400e 50%, #b45309 100%);
  --hero-gradient:       linear-gradient(120deg, #78350f 0%, #b45309 40%, #f59e0b 70%, #fef3c7 100%);
  --hero-text-gradient:  linear-gradient(135deg, #ffffff 0%, #fef3c7 60%, #fbbf24 100%);
  --brand-gradient:      linear-gradient(135deg, #b45309, #f59e0b);
  --brand-glow:          rgba(180,83,9,0.45);
  --brand-gradient-text: linear-gradient(135deg, #b45309, #f59e0b);
}

/* ── Layout ─────────────────────────────────────────────────────────── */
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

/* ── Utility: glassmorphism ──────────────────────────────────────────── */
.glass {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
}

/* ── Named gradient utilities ────────────────────────────────────────── */
.sidebar-gradient { background: var(--sidebar-gradient); }

.hero-gradient { background: var(--hero-gradient); }

.gradient-text {
  background: var(--hero-text-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Semantic: income is always green regardless of theme. */
.income-gradient-text {
  background: linear-gradient(135deg, #007836 0%, #1fa32e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Glassmorphism card surface — replaces the former solid green gradient. */
.card-surface {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
npm run build
```

Expected: Build completes with no errors. (Tests may fail on the old hardcoded colors in components — fix in later tasks.)

- [ ] **Step 3: Commit**

```bash
git add src/styles/index.css
git commit -m "feat: add CSS theme variables and glassmorphism utilities"
```

---

## Task 2: Theme Library + Type Updates

**Files:**
- Create: `src/lib/themes.ts`
- Create: `src/lib/themes.test.ts`
- Modify: `src/firestore/types.ts`
- Modify: `src/hooks/useUpdatePreference.ts`

The `Theme` interface includes `chartColor` (hex string for SVG `fill` attributes) and `categoryColors` (hex array for category breakdown bars) because SVG attributes don't resolve CSS `var()`. `getTheme(id)` is a safe lookup helper used by chart components.

- [ ] **Step 1: Write failing test — `src/lib/themes.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { THEMES, DEFAULT_THEME_ID, getTheme } from './themes';

describe('themes', () => {
  it('THEMES has exactly 4 entries', () => {
    expect(THEMES).toHaveLength(4);
  });

  it('every theme has required string fields', () => {
    for (const t of THEMES) {
      expect(typeof t.id).toBe('string');
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.name).toBe('string');
      expect(typeof t.emoji).toBe('string');
      expect(typeof t.swatchGradient).toBe('string');
      expect(typeof t.chartColor).toBe('string');
      expect(t.categoryColors).toHaveLength(5);
    }
  });

  it('DEFAULT_THEME_ID matches an entry in THEMES', () => {
    expect(THEMES.find((t) => t.id === DEFAULT_THEME_ID)).toBeDefined();
  });

  it('getTheme returns the matching theme', () => {
    expect(getTheme('forest').name).toBe('Forest');
  });

  it('getTheme falls back to lime for unknown id', () => {
    expect(getTheme('unknown').id).toBe('lime');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/lib/themes.test.ts
```

Expected: FAIL — "Cannot find module './themes'"

- [ ] **Step 3: Create `src/lib/themes.ts`**

```ts
export interface Theme {
  id: string;
  name: string;
  emoji: string;
  swatchGradient: string;
  /** Literal hex/rgb color for SVG fill attributes (var() doesn't work in SVG attributes). */
  chartColor: string;
  /** 5-element array for category breakdown bar fills. */
  categoryColors: readonly string[];
}

export const THEMES: readonly Theme[] = [
  {
    id: 'lime',
    name: 'Lime',
    emoji: '🍋',
    swatchGradient: 'linear-gradient(135deg, rgb(80,120,0), rgb(150,191,13), #22c55e)',
    chartColor: 'rgb(150,191,13)',
    categoryColors: ['rgb(150,191,13)', '#22c55e', '#16a34a', '#059669', '#0d9488'],
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌲',
    swatchGradient: 'linear-gradient(135deg, #003d1c, #007836, #1fa32e)',
    chartColor: '#007836',
    categoryColors: ['#007836', '#1fa32e', '#96bf0d', '#059669', '#0d9488'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    swatchGradient: 'linear-gradient(135deg, #0c2d5e, #2563eb, #0ea5e9)',
    chartColor: '#2563eb',
    categoryColors: ['#2563eb', '#0ea5e9', '#60a5fa', '#38bdf8', '#7dd3fc'],
  },
  {
    id: 'amber',
    name: 'Amber',
    emoji: '🌅',
    swatchGradient: 'linear-gradient(135deg, #78350f, #b45309, #f59e0b)',
    chartColor: '#b45309',
    categoryColors: ['#b45309', '#f59e0b', '#d97706', '#fbbf24', '#0d9488'],
  },
] as const;

export const DEFAULT_THEME_ID = 'lime';

/** Safe lookup — falls back to Lime if `id` is unknown. */
export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/lib/themes.test.ts
```

Expected: 5 tests PASS

- [ ] **Step 5: Add `theme?: string` to `Preference` in `src/firestore/types.ts`**

Add the field at the end of the interface (after `defaultEntries`):

```ts
// Mirrors iOS Preference (document ID = user uid)
export interface Preference {
  id: string;
  accounts: BudgetData[];
  categories: BudgetData[];
  subCategories: BudgetData[];
  vendors: BudgetData[];
  payments: BudgetData[];
  defaultCurrency: Currency;
  bookmarkedCurrencies: string[];
  defaultEntries: Record<string, string> | null;
  theme?: string;  // theme ID: "lime" | "forest" | "ocean" | "amber"
}
```

- [ ] **Step 6: Add `theme?: string` to `FirestorePreferencePartial` in `src/hooks/useUpdatePreference.ts`**

```ts
export interface FirestorePreferencePartial {
  accounts?: BudgetData[];
  categories?: BudgetData[];
  subCategories?: BudgetData[];
  vendors?: BudgetData[];
  payments?: BudgetData[];
  default_currency?: Currency;
  frequent_currencies?: string[];
  default_entries?: Record<string, string>;
  theme?: string;
}
```

- [ ] **Step 7: Run all tests to verify nothing broke**

```bash
npm run test
```

Expected: All tests pass (same count as before Task 2)

- [ ] **Step 8: Commit**

```bash
git add src/lib/themes.ts src/lib/themes.test.ts src/firestore/types.ts src/hooks/useUpdatePreference.ts
git commit -m "feat: add theme definitions and extend Preference/FirestorePreferencePartial types"
```

---

## Task 3: ThemeContext + ThemeProvider

**Files:**
- Create: `src/context/ThemeContext.tsx`
- Create: `src/context/ThemeProvider.tsx`
- Create: `src/context/ThemeProvider.test.tsx`

`ThemeProvider` reads `preference?.theme` from `usePreferenceContext()` (already available — `PreferenceProvider` wraps everything in `App.tsx`). It applies `document.documentElement.dataset.theme` on mount and on changes. `setTheme(id)` updates the DOM immediately (instant visual feedback) then persists via `useUpdatePreference`.

- [ ] **Step 1: Write failing test — `src/context/ThemeProvider.test.tsx`**

```tsx
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./PreferenceContext', () => ({ usePreferenceContext: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useUpdatePreference', () => ({ useUpdatePreference: vi.fn() }));

import { usePreferenceContext } from './PreferenceContext';
import { useAuth } from '../auth/AuthContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from './ThemeContext';

const mockMutate = vi.fn().mockResolvedValue(undefined);

function setupMocks(theme?: string) {
  vi.mocked(usePreferenceContext).mockReturnValue({
    preference: { theme } as never,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useAuth).mockReturnValue({ status: 'authenticated', user: { uid: 'u1' } } as never);
  vi.mocked(useUpdatePreference).mockReturnValue({ mutate: mockMutate, loading: false, error: null });
}

function ThemeIdDisplay() {
  const { themeId } = useTheme();
  return <span data-testid="id">{themeId}</span>;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    delete document.documentElement.dataset.theme;
  });

  it('defaults to lime when preference has no theme', () => {
    setupMocks(undefined);
    render(<ThemeProvider><ThemeIdDisplay /></ThemeProvider>);
    expect(document.documentElement.dataset.theme).toBe('lime');
  });

  it('applies theme from preference', () => {
    setupMocks('ocean');
    render(<ThemeProvider><ThemeIdDisplay /></ThemeProvider>);
    expect(document.documentElement.dataset.theme).toBe('ocean');
  });

  it('exposes themeId via useTheme', () => {
    setupMocks('forest');
    const { getByTestId } = render(<ThemeProvider><ThemeIdDisplay /></ThemeProvider>);
    expect(getByTestId('id').textContent).toBe('forest');
  });

  it('setTheme updates data-theme immediately and calls mutate', async () => {
    setupMocks(undefined);
    let capturedSetTheme!: (id: string) => Promise<void>;

    function Capture() {
      const { setTheme } = useTheme();
      capturedSetTheme = setTheme;
      return null;
    }

    render(<ThemeProvider><Capture /></ThemeProvider>);

    await act(async () => {
      await capturedSetTheme('amber');
    });

    expect(document.documentElement.dataset.theme).toBe('amber');
    expect(mockMutate).toHaveBeenCalledWith({ theme: 'amber' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/context/ThemeProvider.test.tsx
```

Expected: FAIL — "Cannot find module './ThemeProvider'" and "./ThemeContext"

- [ ] **Step 3: Create `src/context/ThemeContext.tsx`**

```tsx
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';

export interface ThemeContextValue {
  themeId: string;
  setTheme: (id: string) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
```

- [ ] **Step 4: Create `src/context/ThemeProvider.tsx`**

```tsx
import { useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './ThemeContext';
import { usePreferenceContext } from './PreferenceContext';
import { useAuth } from '../auth/AuthContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import { DEFAULT_THEME_ID } from '../lib/themes';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { preference } = usePreferenceContext();
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { mutate } = useUpdatePreference(uid);

  const themeId = preference?.theme ?? DEFAULT_THEME_ID;

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  const setTheme = useCallback(
    async (id: string) => {
      document.documentElement.dataset.theme = id;
      await mutate({ theme: id });
    },
    [mutate],
  );

  return (
    <ThemeContext.Provider value={{ themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test -- src/context/ThemeProvider.test.tsx
```

Expected: 4 tests PASS

- [ ] **Step 6: Run all tests**

```bash
npm run test
```

Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/context/ThemeContext.tsx src/context/ThemeProvider.tsx src/context/ThemeProvider.test.tsx
git commit -m "feat: add ThemeContext and ThemeProvider"
```

---

## Task 4: Wire ThemeProvider into App.tsx

**Files:**
- Modify: `src/App.tsx`

`ThemeProvider` must be inside `PreferenceProvider` (it reads `usePreferenceContext()`) and inside `AuthProvider` (it reads `useAuth()`). The current nesting is `AuthProvider > PreferenceProvider > RouterProvider`, so add `ThemeProvider` between `PreferenceProvider` and `RouterProvider`.

- [ ] **Step 1: Update `src/App.tsx`**

```tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './auth/RequireAuth';
import { PreferenceProvider } from './context/PreferenceContext';
import { ThemeProvider } from './context/ThemeProvider';
import Landing from './routes/Landing';

const SignIn = lazy(() => import('./routes/SignIn'));
const AppShell = lazy(() => import('./routes/AppShell'));
const Dashboard = lazy(() => import('./routes/Dashboard'));
const TransactionList = lazy(() => import('./routes/TransactionList'));
const TransactionForm = lazy(() => import('./routes/TransactionForm'));
const Settings = lazy(() => import('./routes/Settings'));

const RouteFallback = () => (
  <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center text-slate-500">
    Loading…
  </div>
);

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  {
    path: '/signin',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <SignIn />
      </Suspense>
    ),
  },
  {
    path: '/app',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      </Suspense>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: 'transactions',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionList />
          </Suspense>
        ),
      },
      {
        path: 'transactions/new',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionForm mode="add" />
          </Suspense>
        ),
      },
      {
        path: 'transactions/:id/edit',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionForm mode="edit" />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Settings />
          </Suspense>
        ),
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <PreferenceProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </PreferenceProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
npm run test
```

Expected: All tests pass (ThemeProvider is mocked in tests that need it)

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire ThemeProvider into App"
```

---

## Task 5: Mechanical Brand Gradient Refactor

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/TopBar.tsx`
- Modify: `src/routes/Settings.tsx` (tab bar only — Appearance tab wired in Task 8)
- Modify: `src/components/form/TypeToggle.tsx`
- Modify: `src/components/settings/CurrencyTab.tsx`
- Modify: `src/components/settings/BudgetDataTab.tsx`
- Modify: `src/components/settings/SubcategoriesTab.tsx`
- Modify: `src/routes/TransactionForm.tsx`
- Modify: `src/components/transactions/DateRangeFilter.tsx`

All changes in this task are the same mechanical substitution:
- `'linear-gradient(135deg, #007836, #1fa32e)'` → `'var(--brand-gradient)'`
- In Sidebar: `'linear-gradient(180deg, #003d1c 0%, #005c2a 50%, #007836 100%)'` → `'var(--sidebar-gradient)'`

No tests needed — existing tests use RTL which doesn't evaluate inline styles. Run `npm run test` at the end to confirm nothing broke.

- [ ] **Step 1: Update `src/components/layout/Sidebar.tsx`**

Find the inline `style` on the `<aside>` element (line ~13) and change:
```tsx
// Before
style={{
  background: 'linear-gradient(180deg, #003d1c 0%, #005c2a 50%, #007836 100%)',
  position: 'relative',
  overflow: 'hidden',
}}

// After
style={{
  background: 'var(--sidebar-gradient)',
  position: 'relative',
  overflow: 'hidden',
}}
```

- [ ] **Step 2: Update `src/components/layout/TopBar.tsx`**

There are two places: the period selector active button and the "Add Transaction" link. Change both:
```tsx
// Before (both occurrences)
style={
  period === value
    ? { background: 'linear-gradient(135deg, #007836, #1fa32e)' }
    : undefined
}
// ...
style={{ background: 'linear-gradient(135deg, #007836, #1fa32e)' }}

// After (both occurrences)
style={
  period === value
    ? { background: 'var(--brand-gradient)' }
    : undefined
}
// ...
style={{ background: 'var(--brand-gradient)' }}
```

- [ ] **Step 3: Update `src/routes/Settings.tsx` — active tab only**

Find the active tab `style` prop (around line 106):
```tsx
// Before
style={
  activeTab === key
    ? { background: 'linear-gradient(135deg, #007836, #1fa32e)' }
    : undefined
}

// After
style={
  activeTab === key
    ? { background: 'var(--brand-gradient)' }
    : undefined
}
```

- [ ] **Step 4: Update `src/components/form/TypeToggle.tsx`**

```tsx
// Before (line ~26)
? { background: 'linear-gradient(135deg, #007836, #1fa32e)' }

// After
? { background: 'var(--brand-gradient)' }
```

- [ ] **Step 5: Update `src/components/settings/CurrencyTab.tsx`**

```tsx
// Before (line ~127)
style={{ background: 'linear-gradient(135deg, #007836, #1fa32e)' }}

// After
style={{ background: 'var(--brand-gradient)' }}
```

- [ ] **Step 6: Update `src/components/settings/BudgetDataTab.tsx`** (2 occurrences)

```tsx
// Before (lines ~156 and ~223 — both the same pattern)
style={{ background: 'linear-gradient(135deg, #007836, #1fa32e)' }}

// After (both occurrences)
style={{ background: 'var(--brand-gradient)' }}
```

- [ ] **Step 7: Update `src/components/settings/SubcategoriesTab.tsx`** (2 occurrences)

```tsx
// Before (lines ~155 and ~183 — inline on button elements)
style={{ background: 'linear-gradient(135deg, #007836, #1fa32e)' }}

// After (both occurrences)
style={{ background: 'var(--brand-gradient)' }}
```

- [ ] **Step 8: Update `src/routes/TransactionForm.tsx`**

```tsx
// Before (line ~288)
style={{ background: 'linear-gradient(135deg, #007836, #1fa32e)' }}

// After
style={{ background: 'var(--brand-gradient)' }}
```

- [ ] **Step 9: Update `src/components/transactions/DateRangeFilter.tsx`**

```tsx
// Before (line ~32)
? { background: 'linear-gradient(135deg, #007836, #1fa32e)' }

// After
? { background: 'var(--brand-gradient)' }
```

- [ ] **Step 10: Add glassmorphism to AppShell TopBar — `src/components/layout/TopBar.tsx`**

The `<header>` element in TopBar uses `bg-surface border-b border-border` (opaque white). Replace with a frosted glass treatment:

```tsx
// Before
<header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-3">

// After
<header className="flex items-center justify-between gap-4 border-b border-white/50 bg-white/75 backdrop-blur-md px-6 py-3">
```

- [ ] **Step 11: Run all tests**

```bash
npm run test
```

Expected: All tests pass

- [ ] **Step 12: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors

- [ ] **Step 13: Commit**

```bash
git add \
  src/components/layout/Sidebar.tsx \
  src/components/layout/TopBar.tsx \
  src/routes/Settings.tsx \
  src/components/form/TypeToggle.tsx \
  src/components/settings/CurrencyTab.tsx \
  src/components/settings/BudgetDataTab.tsx \
  src/components/settings/SubcategoriesTab.tsx \
  src/routes/TransactionForm.tsx \
  src/components/transactions/DateRangeFilter.tsx
git commit -m "refactor: replace hardcoded brand hex with CSS variable references + topbar glass"
```

---

## Task 6: DailyTransactions CSS Variable Refactor

**Files:**
- Modify: `src/components/dashboard/DailyTransactions.tsx`

Four inline values need updating. The `DailyTransactions.test.tsx` doesn't assert on inline styles, so existing tests should continue to pass unchanged.

- [ ] **Step 1: Update "See all →" gradient text (around line 74)**

```tsx
// Before
<Link
  to="/app/transactions"
  className="text-xs font-medium"
  style={{
    background: 'linear-gradient(135deg, rgb(150,191,13), #22c55e)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }}
>
  See all →
</Link>

// After
<Link
  to="/app/transactions"
  className="text-xs font-medium"
  style={{
    background: 'var(--brand-gradient-text)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }}
>
  See all →
</Link>
```

- [ ] **Step 2: Update selected tile gradient (around line 116)**

```tsx
// Before
style={
  isSelected
    ? {
        background: 'linear-gradient(135deg, rgb(150,191,13), #22c55e)',
        boxShadow: '0 3px 12px rgba(150,191,13,0.45)',
      }
    : undefined
}

// After
style={
  isSelected
    ? {
        background: 'var(--brand-gradient)',
        boxShadow: '0 3px 12px var(--brand-glow)',
      }
    : undefined
}
```

- [ ] **Step 3: Update dot indicator color (around line 139)**

```tsx
// Before
style={{
  background: isSelected ? 'rgba(255,255,255,0.75)' : '#22c55e',
  visibility: hasTxns ? 'visible' : 'hidden',
}}

// After
style={{
  background: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--color-accent)',
  visibility: hasTxns ? 'visible' : 'hidden',
}}
```

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: All tests pass (DailyTransactions tests don't assert on inline styles)

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DailyTransactions.tsx
git commit -m "refactor: DailyTransactions inline gradients → CSS variables"
```

---

## Task 7: Chart Components — Theme-Aware Colors

**Files:**
- Modify: `src/components/dashboard/SpendingChart.tsx`
- Modify: `src/components/dashboard/CategoryBreakdown.tsx`
- Modify: `src/components/dashboard/IncomeExpenseDonut.tsx`

SVG `fill` attributes don't resolve CSS `var()` references — this is a browser limitation (SVG attributes vs CSS properties). These components use `useTheme()` to get the current `themeId` then call `getTheme(themeId).chartColor` for a literal hex/rgb color to pass as a `fill` prop.

- [ ] **Step 1: Update `src/components/dashboard/SpendingChart.tsx`**

Add imports at the top:
```tsx
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';
```

Inside the `SpendingChart` component body (before the `data` useMemo), add:
```tsx
const { themeId } = useTheme();
const theme = getTheme(themeId);
```

Update the `<Bar>` fill prop:
```tsx
// Before
<Bar
  dataKey="amount"
  radius={[4, 4, 0, 0] as [number, number, number, number]}
  fill="#007836"
/>

// After
<Bar
  dataKey="amount"
  radius={[4, 4, 0, 0] as [number, number, number, number]}
  fill={theme.chartColor}
/>
```

- [ ] **Step 2: Update `src/components/dashboard/CategoryBreakdown.tsx`**

Add imports at the top:
```tsx
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';
```

Remove the module-level `CATEGORY_COLORS` constant:
```tsx
// Delete this:
const CATEGORY_COLORS = [
  '#007836', '#1fa32e', '#96bf0d', '#059669', '#0d9488',
];
```

Inside the `CategoryBreakdown` component body (before the `categories` useMemo), add:
```tsx
const { themeId } = useTheme();
const theme = getTheme(themeId);
```

Update the progress bar fill (inside the `.map()` callback). The `!` non-null assertion is required because TypeScript strict mode treats `readonly string[]` index access as `string | undefined`; the bounds are safe (5-element array, `i` ≤ 4 from `.slice(0,5)`):
```tsx
// Before
style={{ width: `${pct}%`, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}

// After
style={{ width: `${pct}%`, background: theme.categoryColors[i % theme.categoryColors.length]! }}
```

- [ ] **Step 3: Update `src/components/dashboard/IncomeExpenseDonut.tsx`**

Add imports at the top:
```tsx
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';
```

Remove the module-level `COLORS` constant:
```tsx
// Delete this:
const COLORS = ['#007836', '#dc2626'];
```

Inside the `IncomeExpenseDonut` component body (before `data` and `savingsRate`), add:
```tsx
const { themeId } = useTheme();
const theme = getTheme(themeId);
// income color from theme; expense is semantically always red
const CHART_COLORS = [theme.chartColor, '#dc2626'] as const;
```

Update the Cell fill (no other changes needed; `CHART_COLORS` replaces `COLORS`):
```tsx
{data.map((_, i) => (
  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
))}
```

- [ ] **Step 4: Add ThemeContext mock to the 3 chart test files**

Since `SpendingChart`, `CategoryBreakdown`, and `IncomeExpenseDonut` now call `useTheme()` internally, their test files need a mock. Add this line near the top of each file (before the component import):

**`src/components/dashboard/SpendingChart.test.tsx`**, **`src/components/dashboard/CategoryBreakdown.test.tsx`**, **`src/components/dashboard/IncomeExpenseDonut.test.tsx`** — add to each:
```tsx
vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'lime', setTheme: vi.fn() }),
}));
```

The `vi.mock()` call must appear before any imports of the mocked module (Vitest hoists it automatically, so placing it before the test file's component import is sufficient).

- [ ] **Step 5: Run all tests**

```bash
npm run test
```

Expected: All tests pass

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add \
  src/components/dashboard/SpendingChart.tsx \
  src/components/dashboard/SpendingChart.test.tsx \
  src/components/dashboard/CategoryBreakdown.tsx \
  src/components/dashboard/CategoryBreakdown.test.tsx \
  src/components/dashboard/IncomeExpenseDonut.tsx \
  src/components/dashboard/IncomeExpenseDonut.test.tsx
git commit -m "refactor: chart components use theme.chartColor for SVG fill"
```

---

## Task 8: AppearanceTab + Settings Wiring

**Files:**
- Create: `src/components/settings/AppearanceTab.tsx`
- Create: `src/components/settings/AppearanceTab.test.tsx`
- Modify: `src/routes/Settings.tsx`

`AppearanceTab` reads `themeId` and `setTheme` from `useTheme()` — no props needed. Settings only needs to render it when `activeTab === 'appearance'`.

- [ ] **Step 1: Write failing test — `src/components/settings/AppearanceTab.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

vi.mock('../../context/ThemeContext', () => ({ useTheme: vi.fn() }));

import { useTheme } from '../../context/ThemeContext';
import AppearanceTab from './AppearanceTab';

function setup(themeId = 'lime') {
  const setTheme = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useTheme).mockReturnValue({ themeId, setTheme });
  return setTheme;
}

describe('AppearanceTab', () => {
  it('renders all 4 theme swatches', () => {
    setup();
    render(<AppearanceTab />);
    expect(screen.getByText(/Lime/)).toBeInTheDocument();
    expect(screen.getByText(/Forest/)).toBeInTheDocument();
    expect(screen.getByText(/Ocean/)).toBeInTheDocument();
    expect(screen.getByText(/Amber/)).toBeInTheDocument();
  });

  it('active theme swatch shows ✓ indicator', () => {
    setup('forest');
    render(<AppearanceTab />);
    const forestBtn = screen.getByText(/Forest/).closest('button')!;
    expect(forestBtn).toHaveTextContent('✓');
  });

  it('inactive theme swatches do not show ✓', () => {
    setup('forest');
    render(<AppearanceTab />);
    const limeBtn = screen.getByText(/Lime/).closest('button')!;
    expect(limeBtn).not.toHaveTextContent('✓');
  });

  it('clicking a swatch calls setTheme with its id', () => {
    const setTheme = setup('lime');
    render(<AppearanceTab />);
    fireEvent.click(screen.getByText(/Ocean/).closest('button')!);
    expect(setTheme).toHaveBeenCalledWith('ocean');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/components/settings/AppearanceTab.test.tsx
```

Expected: FAIL — "Cannot find module './AppearanceTab'"

- [ ] **Step 3: Create `src/components/settings/AppearanceTab.tsx`**

```tsx
import { THEMES } from '../../lib/themes';
import { useTheme } from '../../context/ThemeContext';

export default function AppearanceTab() {
  const { themeId, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6 py-2">
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-text-muted">
          App Theme
        </p>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((theme) => {
            const isActive = themeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => void setTheme(theme.id)}
                className={[
                  'overflow-hidden rounded-xl text-left transition-all',
                  isActive
                    ? 'border-[2px] border-accent shadow-[0_0_0_2px_rgba(34,197,94,0.2)]'
                    : 'border-[1.5px] border-border hover:border-brand/60',
                ].join(' ')}
              >
                <div className="h-10 w-full" style={{ background: theme.swatchGradient }} />
                <div className="flex items-center justify-between bg-surface px-3 py-2">
                  <span className="text-xs font-bold text-text">
                    {theme.emoji} {theme.name}
                  </span>
                  {isActive ? (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                      style={{ background: 'var(--brand-gradient)' }}
                    >
                      ✓
                    </span>
                  ) : (
                    <span className="h-4 w-4 rounded-full border-[1.5px] border-border" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Theme saved to your account — syncs across all devices.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/components/settings/AppearanceTab.test.tsx
```

Expected: 4 tests PASS

- [ ] **Step 5: Wire AppearanceTab into `src/routes/Settings.tsx`**

Add import at the top (with other settings tab imports):
```tsx
import AppearanceTab from '../components/settings/AppearanceTab';
```

Update the `TABS` constant — add `appearance` entry:
```tsx
const TABS = [
  { key: 'accounts',      label: 'Accounts'      },
  { key: 'categories',    label: 'Categories'    },
  { key: 'subcategories', label: 'Subcategories' },
  { key: 'vendors',       label: 'Vendors'       },
  { key: 'payments',      label: 'Payments'      },
  { key: 'currency',      label: 'Currency'      },
  { key: 'defaults',      label: 'Defaults'      },
  { key: 'appearance',    label: 'Appearance'    },
] as const;
```

Add the Appearance tab content inside the tab content `<div className="p-6">` block (after the `defaults` case):
```tsx
{activeTab === 'appearance' && <AppearanceTab />}
```

- [ ] **Step 6: Run all tests**

```bash
npm run test
```

Expected: All tests pass

- [ ] **Step 7: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add \
  src/components/settings/AppearanceTab.tsx \
  src/components/settings/AppearanceTab.test.tsx \
  src/routes/Settings.tsx
git commit -m "feat: add AppearanceTab with theme swatch picker and wire into Settings"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```

Expected: All tests pass with no failures

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No TypeScript errors

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: No lint errors

- [ ] **Step 4: Build for production**

```bash
npm run build
```

Expected: Build succeeds. Check output for any warnings about CSS.

- [ ] **Step 5: Manual smoke test** (requires `npm run dev` and browser)

Navigate to Settings → Appearance tab. Verify:
1. All 4 theme swatches appear with correct gradient previews
2. Lime is selected by default (✓ indicator on Lime swatch)
3. Clicking Forest switches the sidebar gradient and all buttons/active states to forest green
4. Clicking Ocean switches to blue
5. Clicking Amber switches to amber
6. Navigating to Dashboard confirms the sidebar, HeroStatsRow banner, category bars, and spending chart bar all match the active theme
7. Refreshing the page retains the selected theme (Firestore sync working)

- [ ] **Step 6: Commit if any final fixes were made**

```bash
git add -p  # stage only intentional changes
git commit -m "fix: final theme system corrections from smoke test"
```
