# Light & Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an app-wide light/dark appearance axis (System/Light/Dark, default light) that is saved to Firestore, cached in localStorage, applied with no flash, and supported by both the authenticated app and the login/onboarding screen.

**Architecture:** A second axis orthogonal to the existing color theme. A `data-mode` attribute on `<html>` (set by a pre-paint inline script and by a React `ColorModeProvider`) drives CSS-variable overrides under `[data-mode='dark']`, flipping the semantic tokens the app already uses. The stored value (`system`/`light`/`dark`) lives in a new web-only `colorMode` field on the Firestore Preference doc and is mirrored to localStorage.

**Tech Stack:** React + TypeScript, Vite, Tailwind CSS v4 (semantic tokens in `src/styles/index.css`), Firestore, Vitest + React Testing Library.

**Reference spec:** `docs/superpowers/specs/2026-06-12-light-dark-mode-design.md`

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/colorMode.ts` | **new** — `ColorMode`/`ResolvedMode` types, constants, and pure-ish helpers: resolve, apply-to-DOM, localStorage read/write, system query |
| `src/firestore/types.ts` | add `colorMode?` to the web `Preference` interface |
| `src/hooks/useUpdatePreference.ts` | add `colorMode?` to `FirestorePreferencePartial` so it can be persisted |
| `src/context/ColorModeContext.tsx` | **new** — context object + `useColorMode` hook |
| `src/context/ColorModeProvider.tsx` | **new** — provider: localStorage seed, Firestore reconcile, matchMedia subscription, `setMode` |
| `src/App.tsx` | mount `ColorModeProvider` around the router |
| `index.html` | inline pre-paint script that sets `data-mode` before first paint |
| `src/styles/index.css` | `[data-mode='dark']` token overrides, dark `.glass`/`.card-surface`, mode-scoped login palette (light default) |
| `src/components/settings/AppearanceTab.tsx` | add System/Light/Dark control |
| `src/components/settings/AppearanceTab.test.tsx` | extend for the new control |

---

## Task 1: Add `colorMode` to the Preference types

**Files:**
- Modify: `src/firestore/types.ts:47-50`
- Modify: `src/hooks/useUpdatePreference.ts:17-20`

- [ ] **Step 1: Add the field to the read model**

In `src/firestore/types.ts`, inside `interface Preference`, add the field right after the existing `theme?` line:

```ts
  theme?: string; // theme ID: "lime" | "forest" | "ocean" | "amber"
  colorMode?: 'system' | 'light' | 'dark'; // web-only appearance; default 'light'; iOS ignores
  spendingChartType?: 'bar' | 'line';
```

- [ ] **Step 2: Add the field to the write model**

In `src/hooks/useUpdatePreference.ts`, inside `interface FirestorePreferencePartial`, add after the `theme?` line:

```ts
  theme?: string;
  colorMode?: 'system' | 'light' | 'dark';
  spendingChartType?: 'bar' | 'line';
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 4: Commit**

```bash
git add src/firestore/types.ts src/hooks/useUpdatePreference.ts
git commit -m "feat: add colorMode field to Preference types"
```

---

## Task 2: `colorMode` resolution helper (TDD)

**Files:**
- Create: `src/lib/colorMode.ts`
- Test: `src/lib/colorMode.test.ts`

Note: jsdom does not implement `window.matchMedia`, so `systemPrefersDark` must guard for it (mirroring `src/hooks/useReducedMotion.ts`). Tests stub `window.matchMedia` explicitly.

- [ ] **Step 1: Write the failing test**

Create `src/lib/colorMode.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  resolveMode,
  applyMode,
  readStoredMode,
  writeStoredMode,
  COLOR_MODE_STORAGE_KEY,
  DEFAULT_COLOR_MODE,
} from './colorMode';

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('resolveMode', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns light for light', () => {
    expect(resolveMode('light')).toBe('light');
  });

  it('returns dark for dark', () => {
    expect(resolveMode('dark')).toBe('dark');
  });

  it('returns dark for system when OS prefers dark', () => {
    stubMatchMedia(true);
    expect(resolveMode('system')).toBe('dark');
  });

  it('returns light for system when OS prefers light', () => {
    stubMatchMedia(false);
    expect(resolveMode('system')).toBe('light');
  });
});

describe('applyMode', () => {
  it('writes data-mode on the document element', () => {
    applyMode('dark');
    expect(document.documentElement.dataset.mode).toBe('dark');
    applyMode('light');
    expect(document.documentElement.dataset.mode).toBe('light');
  });
});

describe('storage helpers', () => {
  beforeEach(() => localStorage.clear());

  it('readStoredMode falls back to the default when unset', () => {
    expect(readStoredMode()).toBe(DEFAULT_COLOR_MODE);
  });

  it('round-trips a stored value', () => {
    writeStoredMode('dark');
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('dark');
    expect(readStoredMode()).toBe('dark');
  });

  it('ignores an invalid stored value and returns the default', () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'bogus');
    expect(readStoredMode()).toBe(DEFAULT_COLOR_MODE);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/colorMode.test.ts`
Expected: FAIL — cannot resolve module `./colorMode`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/colorMode.ts`:

```ts
export type ColorMode = 'system' | 'light' | 'dark';
export type ResolvedMode = 'light' | 'dark';

export const COLOR_MODE_STORAGE_KEY = 'glint:color-mode';
export const DEFAULT_COLOR_MODE: ColorMode = 'light';

const VALID_MODES: readonly ColorMode[] = ['system', 'light', 'dark'];

/** True when the OS currently prefers a dark color scheme. Safe in non-browser/jsdom. */
export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

/** Collapse a stored mode into the concrete light/dark value to apply. */
export function resolveMode(mode: ColorMode): ResolvedMode {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

/** Apply the resolved mode to <html> via the data-mode attribute. */
export function applyMode(resolved: ResolvedMode): void {
  document.documentElement.dataset.mode = resolved;
}

/** Read the stored mode, falling back to the default on missing/invalid/unavailable storage. */
export function readStoredMode(): ColorMode {
  try {
    const raw = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (raw && (VALID_MODES as readonly string[]).includes(raw)) {
      return raw as ColorMode;
    }
  } catch {
    /* storage unavailable (private mode / disabled) — use default */
  }
  return DEFAULT_COLOR_MODE;
}

/** Persist the stored mode; silently no-op if storage is unavailable. */
export function writeStoredMode(mode: ColorMode): void {
  try {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    /* storage unavailable — ignore */
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/colorMode.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/colorMode.ts src/lib/colorMode.test.ts
git commit -m "feat: add colorMode resolution helper"
```

---

## Task 3: `ColorModeContext` + `useColorMode` hook

**Files:**
- Create: `src/context/ColorModeContext.tsx`

- [ ] **Step 1: Write the context**

Create `src/context/ColorModeContext.tsx`:

```tsx
import { createContext, useContext } from 'react';
import type { ColorMode, ResolvedMode } from '../lib/colorMode';

export interface ColorModeContextValue {
  /** The user's stored selection. */
  mode: ColorMode;
  /** The concrete mode currently applied (system collapsed to light/dark). */
  resolvedMode: ResolvedMode;
  setMode: (mode: ColorMode) => void;
}

export const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error('useColorMode must be used inside ColorModeProvider');
  return ctx;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/context/ColorModeContext.tsx
git commit -m "feat: add ColorModeContext and useColorMode hook"
```

---

## Task 4: `ColorModeProvider` (TDD) + mount in App

**Files:**
- Create: `src/context/ColorModeProvider.tsx`
- Test: `src/context/ColorModeProvider.test.tsx`
- Modify: `src/App.tsx:9-10,91-109`

- [ ] **Step 1: Write the failing test**

Create `src/context/ColorModeProvider.test.tsx`:

```tsx
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('./PreferenceContext', () => ({ usePreferenceContext: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useUpdatePreference', () => ({ useUpdatePreference: vi.fn() }));

import { usePreferenceContext } from './PreferenceContext';
import { useAuth } from '../auth/AuthContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import { ColorModeProvider } from './ColorModeProvider';
import { useColorMode } from './ColorModeContext';
import { COLOR_MODE_STORAGE_KEY } from '../lib/colorMode';
import type { ColorMode } from '../lib/colorMode';

const mockMutate = vi.fn();

function setupMocks(colorMode?: ColorMode) {
  vi.mocked(usePreferenceContext).mockReturnValue({
    preference: { colorMode } as never,
    loading: false,
    error: null,
  });
  vi.mocked(useAuth).mockReturnValue({ status: 'authenticated', user: { uid: 'u1' } } as never);
  vi.mocked(useUpdatePreference).mockReturnValue({ mutate: mockMutate });
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

function Display() {
  const { mode, resolvedMode } = useColorMode();
  return <span data-testid="v">{`${mode}:${resolvedMode}`}</span>;
}

describe('ColorModeProvider', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    localStorage.clear();
    delete document.documentElement.dataset.mode;
    stubMatchMedia(false);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('defaults to light when nothing is stored', () => {
    setupMocks(undefined);
    const { getByTestId } = render(
      <ColorModeProvider>
        <Display />
      </ColorModeProvider>,
    );
    expect(getByTestId('v').textContent).toBe('light:light');
    expect(document.documentElement.dataset.mode).toBe('light');
  });

  it('seeds from localStorage before Firestore loads', () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'dark');
    setupMocks(undefined);
    const { getByTestId } = render(
      <ColorModeProvider>
        <Display />
      </ColorModeProvider>,
    );
    expect(getByTestId('v').textContent).toBe('dark:dark');
    expect(document.documentElement.dataset.mode).toBe('dark');
  });

  it('reconciles from the Firestore preference', () => {
    setupMocks('dark');
    const { getByTestId } = render(
      <ColorModeProvider>
        <Display />
      </ColorModeProvider>,
    );
    expect(getByTestId('v').textContent).toBe('dark:dark');
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('dark');
  });

  it('resolves system against matchMedia', () => {
    stubMatchMedia(true);
    setupMocks('system');
    const { getByTestId } = render(
      <ColorModeProvider>
        <Display />
      </ColorModeProvider>,
    );
    expect(getByTestId('v').textContent).toBe('system:dark');
    expect(document.documentElement.dataset.mode).toBe('dark');
  });

  it('setMode updates state, localStorage, data-mode, and Firestore', () => {
    setupMocks(undefined);
    let setMode!: (m: ColorMode) => void;
    function Capture() {
      setMode = useColorMode().setMode;
      return null;
    }
    render(
      <ColorModeProvider>
        <Capture />
      </ColorModeProvider>,
    );

    act(() => setMode('dark'));

    expect(document.documentElement.dataset.mode).toBe('dark');
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('dark');
    expect(mockMutate).toHaveBeenCalledWith({ colorMode: 'dark' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/context/ColorModeProvider.test.tsx`
Expected: FAIL — cannot resolve module `./ColorModeProvider`.

- [ ] **Step 3: Write the provider**

Create `src/context/ColorModeProvider.tsx`:

```tsx
import { useEffect, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { ColorModeContext } from './ColorModeContext';
import { usePreferenceContext } from './PreferenceContext';
import { useAuth } from '../auth/AuthContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import {
  resolveMode,
  applyMode,
  readStoredMode,
  writeStoredMode,
} from '../lib/colorMode';
import type { ColorMode, ResolvedMode } from '../lib/colorMode';

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const { preference } = usePreferenceContext();
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { mutate } = useUpdatePreference(uid);

  // Seed synchronously from localStorage so the value is already correct on the
  // login screen, before the Firestore preference loads.
  const [mode, setModeState] = useState<ColorMode>(() => readStoredMode());
  const [resolvedMode, setResolvedMode] = useState<ResolvedMode>(() =>
    resolveMode(readStoredMode()),
  );

  // Reconcile from Firestore once the preference arrives; keep localStorage in sync.
  useEffect(() => {
    if (preference?.colorMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModeState(preference.colorMode);
      writeStoredMode(preference.colorMode);
    }
  }, [preference?.colorMode]);

  // Apply to <html> whenever the mode changes, and follow the OS while on system.
  useEffect(() => {
    const apply = () => {
      const r = resolveMode(mode);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResolvedMode(r);
      applyMode(r);
    };
    apply();
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  const setMode = useCallback(
    (next: ColorMode) => {
      setModeState(next);
      writeStoredMode(next);
      applyMode(resolveMode(next));
      mutate({ colorMode: next });
    },
    [mutate],
  );

  return (
    <ColorModeContext.Provider value={{ mode, resolvedMode, setMode }}>
      {children}
    </ColorModeContext.Provider>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/context/ColorModeProvider.test.tsx`
Expected: PASS (all 5 cases).

- [ ] **Step 5: Mount the provider in App**

In `src/App.tsx`, add the import alongside the other context imports (after the `ThemeProvider` import on line 9):

```tsx
import { ThemeProvider } from './context/ThemeProvider';
import { ColorModeProvider } from './context/ColorModeProvider';
import { LayoutProvider } from './context/LayoutProvider';
```

Then wrap the router. Replace the existing provider nesting:

```tsx
            <ThemeProvider>
              <LayoutProvider>
                <RouterProvider router={router} />
              </LayoutProvider>
            </ThemeProvider>
```

with:

```tsx
            <ThemeProvider>
              <ColorModeProvider>
                <LayoutProvider>
                  <RouterProvider router={router} />
                </LayoutProvider>
              </ColorModeProvider>
            </ThemeProvider>
```

- [ ] **Step 6: Verify the app still compiles and the existing App test passes**

Run: `npm run typecheck && npx vitest run src/App.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/context/ColorModeProvider.tsx src/context/ColorModeProvider.test.tsx src/App.tsx
git commit -m "feat: add ColorModeProvider and mount it in App"
```

---

## Task 5: Pre-paint inline script (no-flash)

**Files:**
- Modify: `index.html:2-3`

CSS/HTML-only; verified by build + manual check (inline `<head>` scripts are not unit-tested here).

- [ ] **Step 1: Add the inline script**

In `index.html`, insert the script as the first child of `<head>`, immediately after the opening `<head>` tag (before `<meta charset>`):

```html
  <head>
    <script>
      (function () {
        try {
          var m = localStorage.getItem('glint:color-mode') || 'light';
          var dark =
            m === 'dark' ||
            (m === 'system' &&
              window.matchMedia('(prefers-color-scheme: dark)').matches);
          document.documentElement.dataset.mode = dark ? 'dark' : 'light';
        } catch (e) {
          document.documentElement.dataset.mode = 'light';
        }
      })();
    </script>
    <meta charset="UTF-8" />
```

- [ ] **Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: PASS — `dist/index.html` contains the inline script and `data-mode` logic.

- [ ] **Step 3: Manual no-flash check**

Run: `npm run dev`, open `http://localhost:5173`. In DevTools, set `localStorage['glint:color-mode'] = 'dark'`, reload. Expected: the page paints dark with no light flash; `<html>` has `data-mode="dark"` before React mounts. (CSS that consumes this lands in Tasks 6–7; at this step only the attribute is verified via the Elements panel.)

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: apply saved color mode before first paint"
```

---

## Task 6: Dark-mode CSS — semantic tokens + glass surfaces

**Files:**
- Modify: `src/styles/index.css` (after the `[data-theme='amber']` block, ~line 79; and the `.glass` / `.card-surface` rules, lines 97-104 and 130-137)

CSS-only; verified by build + manual check.

- [ ] **Step 1: Add the dark token-override block**

In `src/styles/index.css`, immediately after the closing `}` of the `[data-theme='amber']` block (line 79), add:

```css
/* ── Dark mode ───────────────────────────────────────────────────────── */
/* Overrides the semantic surface/text/border tokens. Orthogonal to        */
/* [data-theme]; brand/accent colors continue to come from the theme.       */
[data-mode='dark'] {
  --color-text: #f1f5f9; /* slate-100 */
  --color-text-muted: #94a3b8; /* slate-400 */
  --color-surface: #0f172a; /* slate-900 */
  --color-surface-alt: #1e293b; /* slate-800 */
  --color-border: #334155; /* slate-700 */
}
```

- [ ] **Step 2: Add a dark variant for `.glass` and `.card-surface`**

In `src/styles/index.css`, immediately after the existing `.card-surface { … }` rule (ends ~line 137), add:

```css
/* Dark variants of the only hardcoded-white surfaces. */
[data-mode='dark'] .glass,
[data-mode='dark'] .card-surface {
  background: rgba(30, 41, 59, 0.6); /* slate-800 translucent */
  border: 1px solid rgba(148, 163, 184, 0.15);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.45);
}
```

- [ ] **Step 3: Verify the build succeeds**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Manual check**

Run `npm run dev`, sign in (or open `/app`), set `data-mode="dark"` on `<html>` via DevTools. Expected: dashboard background/text/borders invert to the dark palette; glass cards become dark translucent and remain legible. Set back to `light`: returns to the current light look unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/styles/index.css
git commit -m "feat: dark-mode token and glass-surface styles"
```

---

## Task 7: Login screen — light default + dark variant

**Files:**
- Modify: `src/styles/index.css` (the login section, lines 165-446)

The login screen is currently hardcoded dark. This task moves its surface/text colors into mode-scoped variables: the **default** (no `data-mode='dark'`) is a light treatment; `[data-mode='dark'] .login-root` restores today's dark design. The green/lime/teal accents are unchanged in both modes. CSS-only; verified by build + manual check.

- [ ] **Step 1: Replace the `.login-root` variable + base block**

In `src/styles/index.css`, replace the existing `.login-root { … }` rule (lines 165-177) with:

```css
.login-root {
  /* Fixed brand accents (identical in both modes) */
  --login-green: #4caf50;
  --login-lime: #8bc34a;
  --login-teal: #4ecdc4;

  /* Mode-scoped surfaces/text — LIGHT defaults (overridden for dark below) */
  --login-bg: #f8fafc; /* slate-50 */
  --login-fg: #0f172a; /* slate-900 */
  --login-muted: #475569; /* slate-600 */
  --login-surface: rgba(15, 23, 42, 0.04);
  --login-surface-strong: rgba(15, 23, 42, 0.06);
  --login-border: rgba(15, 23, 42, 0.1);
  --login-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
  --login-track: rgba(15, 23, 42, 0.08);
  --login-dot: rgba(15, 23, 42, 0.2);
  --login-panel-bg: rgba(255, 255, 255, 0.55);
  --login-panel-border: rgba(15, 23, 42, 0.08);
  --login-orb-opacity: 0.22;

  position: relative;
  display: flex;
  min-height: 100vh;
  overflow: hidden;
  background: var(--login-bg);
  color: var(--login-fg);
}

/* Dark variant restores the original onboarding look. */
[data-mode='dark'] .login-root {
  --login-bg: #0b0f0d;
  --login-fg: #f8fafc;
  --login-muted: #94a3b8;
  --login-surface: rgba(255, 255, 255, 0.07);
  --login-surface-strong: rgba(255, 255, 255, 0.08);
  --login-border: rgba(255, 255, 255, 0.15);
  --login-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  --login-track: rgba(255, 255, 255, 0.08);
  --login-dot: rgba(255, 255, 255, 0.25);
  --login-panel-bg: rgba(255, 255, 255, 0.04);
  --login-panel-border: rgba(255, 255, 255, 0.08);
  --login-orb-opacity: 0.45;
}
```

- [ ] **Step 2: Make the orb opacity mode-scoped**

In the `.login-orb` rule (~line 180), change `opacity: 0.45;` to:

```css
  opacity: var(--login-orb-opacity);
```

- [ ] **Step 3: Make `.login-glass` mode-scoped**

Replace the `.login-glass { … }` rule (~lines 289-296) with:

```css
.login-glass {
  background: var(--login-surface);
  border: 1px solid var(--login-border);
  border-radius: 20px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: var(--login-shadow);
}
```

- [ ] **Step 4: Make `.login-chip` mode-scoped**

In the `.login-chip` rule (~lines 297-308), change the `background` and `border` lines to:

```css
  background: var(--login-surface-strong);
  border: 1px solid var(--login-border);
```

- [ ] **Step 5: Make `.login-bar-track` mode-scoped**

In the `.login-bar-track` rule (~lines 345-351), change `background: rgba(255, 255, 255, 0.08);` to:

```css
  background: var(--login-track);
```

- [ ] **Step 6: Make `.login-dot` mode-scoped**

In the `.login-dot` rule (~lines 368-377), change `background: rgba(255, 255, 255, 0.25);` to:

```css
  background: var(--login-dot);
```

- [ ] **Step 7: Make `.login-panel` mode-scoped**

In the `.login-panel` rule (~lines 385-399), change the `background` and `border-left` lines to:

```css
  background: var(--login-panel-bg);
  border-left: 1px solid var(--login-panel-border);
```

- [ ] **Step 8: Make the mobile `.login-panel` border mode-scoped**

In the mobile media query (~line 435), change `border-bottom: 1px solid rgba(255, 255, 255, 0.08);` to:

```css
    border-bottom: 1px solid var(--login-panel-border);
```

- [ ] **Step 9: Verify the build succeeds**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 10: Manual check — both modes**

Run `npm run dev`, open `/` (login). With `localStorage['glint:color-mode']` unset or `'light'`: the login screen renders light (light background, dark text, light glass) and is legible. Set it to `'dark'`, reload: the original dark onboarding look returns. Confirm carousel slides, dots, chips, donut/bars, and the right-hand login panel all read correctly in both modes.

- [ ] **Step 11: Commit**

```bash
git add src/styles/index.css
git commit -m "feat: light/dark variants for the login screen (light default)"
```

---

## Task 8: Appearance control (System / Light / Dark)

**Files:**
- Modify: `src/components/settings/AppearanceTab.tsx`
- Modify: `src/components/settings/AppearanceTab.test.tsx`

- [ ] **Step 1: Extend the test (failing)**

In `src/components/settings/AppearanceTab.test.tsx`, add the `ColorModeContext` mock alongside the existing mocks (after line 5):

```tsx
vi.mock('../../context/ColorModeContext', () => ({ useColorMode: vi.fn() }));
```

Add to the imports (after line 8):

```tsx
import { useColorMode } from '../../context/ColorModeContext';
```

Replace the existing `setup` function with one that also wires `useColorMode` (default `light`) and returns its spy:

```tsx
function setup(
  themeId = 'lime',
  layoutWidth: 'fixed' | 'full' = 'fixed',
  mode: 'system' | 'light' | 'dark' = 'light',
) {
  const setTheme = vi.fn().mockResolvedValue(undefined);
  const setLayoutWidth = vi.fn().mockResolvedValue(undefined);
  const setMode = vi.fn();
  vi.mocked(useTheme).mockReturnValue({ themeId, setTheme });
  vi.mocked(useLayout).mockReturnValue({ layoutWidth, setLayoutWidth });
  vi.mocked(useColorMode).mockReturnValue({
    mode,
    resolvedMode: mode === 'dark' ? 'dark' : 'light',
    setMode,
  });
  return { setTheme, setLayoutWidth, setMode };
}
```

Then add a new describe block at the end of the file:

```tsx
describe('AppearanceTab — color mode', () => {
  it('renders System, Light, and Dark options', () => {
    setup();
    render(<AppearanceTab />);
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });

  it('marks the active mode with the ✓ indicator', () => {
    setup('lime', 'fixed', 'dark');
    render(<AppearanceTab />);
    const darkBtn = screen.getByText('Dark').closest('button')!;
    expect(darkBtn).toHaveTextContent('✓');
    const lightBtn = screen.getByText('Light').closest('button')!;
    expect(lightBtn).not.toHaveTextContent('✓');
  });

  it('clicking a mode calls setMode with its id', () => {
    const { setMode } = setup('lime', 'fixed', 'light');
    render(<AppearanceTab />);
    fireEvent.click(screen.getByText('Dark').closest('button')!);
    expect(setMode).toHaveBeenCalledWith('dark');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/settings/AppearanceTab.test.tsx`
Expected: FAIL — `useColorMode` mock unused by component / "System" text not found.

- [ ] **Step 3: Add the control to the component**

In `src/components/settings/AppearanceTab.tsx`, add the import (after line 4):

```tsx
import { useColorMode } from '../../context/ColorModeContext';
import type { ColorMode } from '../../lib/colorMode';
```

Add the options constant after the existing `LAYOUT_OPTIONS` (after line 21):

```tsx
const MODE_OPTIONS: { id: ColorMode; label: string; emoji: string }[] = [
  { id: 'system', label: 'System', emoji: '🖥️' },
  { id: 'light', label: 'Light', emoji: '☀️' },
  { id: 'dark', label: 'Dark', emoji: '🌙' },
];
```

Inside the component, read the hook next to the existing ones (after line 25):

```tsx
  const { mode, setMode } = useColorMode();
```

Add the Appearance section as the first child inside the outer wrapper, immediately after `<div className="flex flex-col gap-6 py-2">` (before the `App Theme` block):

```tsx
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-text-muted">
          Appearance
        </p>
        <div className="grid grid-cols-3 gap-3">
          {MODE_OPTIONS.map(({ id, label, emoji }) => {
            const isActive = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={[
                  'flex items-center justify-between rounded-xl px-3 py-2 text-left transition-all',
                  isActive
                    ? 'border-[2px] border-accent shadow-[0_0_0_2px_rgba(34,197,94,0.2)]'
                    : 'border-[1.5px] border-border hover:border-brand/60',
                ].join(' ')}
              >
                <span className="text-xs font-bold text-text">
                  {emoji} {label}
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
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-text-muted">
          Appearance saved to your account — syncs across all devices.
        </p>
      </div>

```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/settings/AppearanceTab.test.tsx`
Expected: PASS (existing theme/layout tests + the 3 new color-mode tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/AppearanceTab.tsx src/components/settings/AppearanceTab.test.tsx
git commit -m "feat: add System/Light/Dark control to Appearance settings"
```

---

## Task 9: Full verification

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS (no errors).

- [ ] **Step 3: Full test suite**

Run: `npm run test`
Expected: PASS — all suites green, including the new `colorMode`, `ColorModeProvider`, and `AppearanceTab` tests.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: End-to-end manual smoke**

Run `npm run dev`:
1. First visit `/` with empty localStorage → login screen is **light**.
2. Sign in → Settings → Appearance → choose **Dark** → app switches to dark immediately; reload `/app` → stays dark (Firestore + localStorage).
3. Sign out / open `/` → login screen now renders **dark** (remembered from localStorage), no flash.
4. Back in Settings, choose **System** → app follows the OS setting; toggle OS dark/light → app follows live.
5. Choose **Light** → app + next login are light again.

- [ ] **Step 6: Final commit (if any docs/cleanup remain)**

```bash
git add -A
git commit -m "chore: light/dark mode verification pass" --allow-empty
```

---

## Self-Review notes (already reconciled)

- **Spec coverage:** data model (Task 1), resolution + storage (Task 2), no-flash script (Task 5), provider/state incl. system live-follow (Task 4), CSS token overrides + glass (Task 6), login light/dark (Task 7), Appearance UI (Task 8), tests throughout, full verification (Task 9).
- **Type consistency:** `ColorMode`/`ResolvedMode`, `COLOR_MODE_STORAGE_KEY`, `DEFAULT_COLOR_MODE`, `resolveMode`/`applyMode`/`readStoredMode`/`writeStoredMode`/`systemPrefersDark`, and `{ mode, resolvedMode, setMode }` are used identically across Tasks 2–8. The Firestore field `colorMode` matches between `Preference`, `FirestorePreferencePartial`, the provider's `mutate({ colorMode })`, and the provider test.
- **No placeholders:** every code/CSS step contains the full content to apply.
