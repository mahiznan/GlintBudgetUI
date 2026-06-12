# Light & Dark Mode — Design Spec

**Date:** 2026-06-12
**Status:** Approved (pending implementation plan)
**Branch:** `feat/login-onboarding-screen`

## Goal

Add a light/dark appearance axis across the entire GlintBudget web app. The
unauthenticated login/onboarding screen defaults to **light**. Once logged in,
the user can switch between **System / Light / Dark** beside the existing App
Theme picker. The choice is saved to Firestore (synced across web devices) and
mirrored into `localStorage` so the very next login screen renders in the
remembered mode with no flash. iOS is unaffected.

## Context & Constraints

- The app already has a **color-theme** axis (lime / forest / ocean / amber)
  applied via `data-theme` on `<html>`, synced through the Firestore
  `Preference` doc and driven by CSS custom properties in
  `src/styles/index.css`. Light/dark is a **second, orthogonal axis** —
  `data-theme` controls brand color, the new `data-mode` controls light/dark.
  They compose.
- Almost the whole UI already uses **semantic tokens** (`bg-surface`,
  `text-text`, `text-text-muted`, `border-border`, `bg-surface-alt`) rather than
  hardcoded colors. Overriding those token variables under `[data-mode='dark']`
  flips ~90% of the app with no component edits.
- **iOS does not sync appearance to Firestore.** iOS stores appearance
  device-local in `UserDefaults` via `@AppStorage` (`AppearanceMode.swift`:
  System/Light/Dark). The Firestore `Preference` doc has **no** appearance
  field. The web app's existing `theme` / `layoutWidth` fields are already
  web-only additions to that same doc that iOS ignores. The new appearance field
  follows the same web-only pattern — iOS keeps its own device-local setting,
  unchanged.
- Performance budgets must not regress: initial payload < 50 KB gzipped,
  Lighthouse ≥ 95. The chosen approach adds effectively zero JS to component
  render paths.

## Decisions

- **Modes offered:** `System / Light / Dark` (three options, matching iOS).
- **Default (new user, no stored value):** `light`.
- **Login screen:** real light **and** dark variants. Light by default; on
  return, the last-used resolved mode is applied from `localStorage`.
- **Persistence:** Firestore `Preference` doc (web-synced) **and** `localStorage`
  (pre-paint application).
- **Control location:** Settings → Appearance tab, beside the App Theme picker.

## Architecture

### 1. Data model

Add a web-only field to the web `Preference` type (`src/firestore/types.ts`):

```ts
colorMode?: 'system' | 'light' | 'dark'; // web-only; default 'light'; iOS ignores
```

- Stored in the same Firestore Preference document as `theme` / `layoutWidth`.
- Persisted via the existing `useUpdatePreference(uid)` mutate path
  (`mutate({ colorMode })`), the same way `theme` and `layoutWidth` are written.
- Mirrored into `localStorage` under key `glint:color-mode`.

### 2. Resolution helper — `src/lib/colorMode.ts`

```ts
export type ColorMode = 'system' | 'light' | 'dark';     // stored value
export type ResolvedMode = 'light' | 'dark';             // what gets applied

export const COLOR_MODE_STORAGE_KEY = 'glint:color-mode';
export const DEFAULT_COLOR_MODE: ColorMode = 'light';

export function systemPrefersDark(): boolean;            // matchMedia query
export function resolveMode(mode: ColorMode): ResolvedMode;
export function applyMode(resolved: ResolvedMode): void; // sets html data-mode
export function readStoredMode(): ColorMode;             // localStorage, falls back to default
export function writeStoredMode(mode: ColorMode): void;  // localStorage
```

- `resolveMode('system')` → `systemPrefersDark() ? 'dark' : 'light'`.
- `applyMode(resolved)` sets `document.documentElement.dataset.mode = resolved`.
- All localStorage access is wrapped in try/catch (private-mode / disabled
  storage must not crash the app; falls back to the default).

### 3. No-flash inline script (FOUC prevention)

A small inline `<script>` in `index.html` `<head>`, running **before first
paint**, mirrors `readStoredMode` + `resolveMode` + `applyMode`:

```html
<script>
  (function () {
    try {
      var m = localStorage.getItem('glint:color-mode') || 'light';
      var dark = m === 'dark' || (m === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.mode = dark ? 'dark' : 'light';
    } catch (e) {
      document.documentElement.dataset.mode = 'light';
    }
  })();
</script>
```

- ~15 lines of inline HTML; no impact on the JS bundle / 50 KB budget.
- Guarantees the login screen (and every reload) paints in the correct mode
  with no light↔dark flash.

### 4. State — `ColorModeProvider`

New `src/context/ColorModeContext.tsx` + `src/context/ColorModeProvider.tsx`,
mirroring the existing `ThemeProvider` / `LayoutProvider` pattern:

- Local state seeded **synchronously from `localStorage`** (`readStoredMode()`),
  so it is already correct on the login screen before Firestore loads.
- Reconciles when `preference.colorMode` arrives from Firestore (an effect
  watching `preference?.colorMode`), and writes that value back to localStorage
  so the cache stays in sync across devices.
- An effect applies `applyMode(resolveMode(mode))` whenever `mode` changes.
- When `mode === 'system'`, subscribes to
  `matchMedia('(prefers-color-scheme: dark)')` `change` events and re-applies
  live; unsubscribes when mode is not `system`.
- `setMode(mode)`: `setState` → `writeStoredMode` → `applyMode(resolveMode(...))`
  → `mutate({ colorMode })`.
- Works unauthenticated (uid `''`, no Firestore write — same graceful handling
  as the existing `ThemeProvider`); the login screen has no toggle anyway.

Context value:

```ts
interface ColorModeContextValue {
  mode: ColorMode;            // stored selection (system | light | dark)
  resolvedMode: ResolvedMode; // currently-applied (light | dark)
  setMode: (mode: ColorMode) => void;
}
```

Mounted in `App.tsx` wrapping `RouterProvider` (alongside `ThemeProvider` /
`LayoutProvider`) so both `/` (login) and `/app` respect it.

### 5. CSS — `src/styles/index.css`

- Add a single `[data-mode='dark']` block overriding the semantic token
  variables:
  - `--color-surface`, `--color-surface-alt`, `--color-text`,
    `--color-text-muted`, `--color-border` → dark-palette values.
- Dark variants for the only hardcoded-white surfaces: `.glass` and
  `.card-surface` (dark translucent background, adjusted border + shadow).
- Audit and fix the small set of hardcoded literals found in components/routes
  (`bg-white`, `slate-*`, the `RouteFallback`'s `text-slate-500`, the Settings
  error card's `bg-red-50`-style fixed colors are acceptable as-is). Most
  `text-white` usages sit on brand gradients and are correct in both modes.
- **Login screen:** refactor `.login-root`'s currently-hardcoded dark palette
  into mode-scoped variables. The **default (no `[data-mode='dark']`)**
  `.login-root` renders a light treatment (light background, light glass,
  adjusted orb opacity, dark-on-light text); `[data-mode='dark'] .login-root`
  restores today's dark design. Both the 75% carousel column and the 25% login
  panel are covered. The fixed login green/lime/teal accent colors remain in
  both modes.

### 6. UI — Appearance tab

In `src/components/settings/AppearanceTab.tsx`, add an **Appearance** section
(a 3-way segmented control: System / Light / Dark) beside the existing App Theme
picker, wired to `useColorMode()`. Selecting a mode calls `setMode`, which
updates instantly and persists. Follows the existing visual style of the tab
(active state uses `--brand-gradient`, etc.).

## Component / file summary

| File | Change |
| --- | --- |
| `src/firestore/types.ts` | add `colorMode?` to `Preference` |
| `src/lib/colorMode.ts` | **new** — types, constants, resolve/apply/storage helpers |
| `src/context/ColorModeContext.tsx` | **new** — context + `useColorMode` hook |
| `src/context/ColorModeProvider.tsx` | **new** — provider (localStorage seed, Firestore reconcile, matchMedia, setMode) |
| `src/App.tsx` | mount `ColorModeProvider` |
| `index.html` | inline pre-paint mode script |
| `src/styles/index.css` | `[data-mode='dark']` token overrides; dark `.glass`/`.card-surface`; mode-scoped login palette (light default) |
| `src/components/settings/AppearanceTab.tsx` | add System/Light/Dark control |

## Testing

Co-located tests following repo convention:

- `src/lib/colorMode.test.ts` — `resolveMode` for each input incl. system→dark
  via mocked `matchMedia`; storage read/write incl. fallback when storage throws.
- `src/context/ColorModeProvider.test.tsx` — defaults to `light` with no stored
  value; seeds from `localStorage`; reconciles from `preference.colorMode`;
  `system` follows mocked `matchMedia` and reacts to a `change` event; `setMode`
  writes localStorage + sets `data-mode` + calls `mutate({ colorMode })`.
- `src/components/settings/AppearanceTab.test.tsx` — renders the 3 options,
  marks the active one, calls `setMode` on click.

## Out of scope (YAGNI)

- TopBar quick-toggle (settings-only, "aside the app theme").
- Cross-tab live sync via the `storage` event.
- Any change to the iOS app or Firestore rules.
- Caching the color *theme* (brand) in localStorage — the login screen uses its
  own fixed accent colors, so there is no brand flash to prevent.

## Performance notes

- The variable-override approach adds **zero** per-component JS; switching modes
  is a single attribute write on `<html>` — no React re-render storm.
- The inline pre-paint script is a few hundred bytes of inline HTML, outside the
  bundle.
- The `matchMedia` listener is only attached while `mode === 'system'`.
- No new dependencies; reuses the existing provider + mutate patterns.
