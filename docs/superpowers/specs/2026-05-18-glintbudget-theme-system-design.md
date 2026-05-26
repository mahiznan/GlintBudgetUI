# GlintBudget Theme System + Glassmorphism Design

**Date:** 2026-05-18
**Status:** Approved

---

## Overview

A switchable 4-theme color system applied app-wide via CSS custom properties, with glassmorphism effects on key surfaces. The active theme is stored in the user's Firestore preference document and syncs across devices. An Appearance tab in Settings lets users switch themes.

---

## Themes

Four built-in themes. **Lime** is the new default (replaces the current Forest default).

| ID       | Name   | Emoji | Description                                                                         |
| -------- | ------ | ----- | ----------------------------------------------------------------------------------- |
| `lime`   | Lime   | 🍋    | `rgb(150,191,13)` → `#22c55e` — energetic lime-to-green; matches transaction widget |
| `forest` | Forest | 🌲    | `#005c2a` → `#007836` — deep forest green; the current app theme                    |
| `ocean`  | Ocean  | 🌊    | `#1e4d9b` → `#2563eb` — deep blue to sky; classic finance feel                      |
| `amber`  | Amber  | 🌅    | `#92400e` → `#b45309` — warm amber-gold; earthy and distinctive                     |

---

## CSS Architecture

### Layer 1: `@theme {}` — Tailwind design tokens (Lime defaults)

`@theme` creates Tailwind utility classes (`bg-brand`, `text-brand`, `border-brand`, etc.) AND CSS custom properties on `:root`. Updated to Lime as the new default.

| Token                | Lime value        | Forest value | Ocean value | Amber value |
| -------------------- | ----------------- | ------------ | ----------- | ----------- |
| `--color-brand`      | `rgb(150,191,13)` | `#007836`    | `#2563eb`   | `#b45309`   |
| `--color-brand-dark` | `rgb(80,120,0)`   | `#003d1c`    | `#0c2d5e`   | `#78350f`   |
| `--color-accent`     | `#22c55e`         | `#1fa32e`    | `#0ea5e9`   | `#f59e0b`   |
| `--color-highlight`  | `rgb(150,191,13)` | `#96bf0d`    | `#60a5fa`   | `#fbbf24`   |

### Layer 2: Runtime CSS variables on `:root` (gradient strings — cannot live in `@theme`)

These cannot live in `@theme` (Tailwind doesn't support gradient strings as design tokens). Defined on `:root` with Lime values; overridden by `[data-theme]` attribute blocks.

| Variable                | Lime value                                                                     | Purpose                                   |
| ----------------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| `--sidebar-gradient`    | `linear-gradient(180deg, rgb(80,120,0) 0%, rgb(150,191,13) 60%, #22c55e 100%)` | Sidebar background                        |
| `--brand-gradient`      | `linear-gradient(135deg, rgb(150,191,13), #22c55e)`                            | Selected tiles, active tab pills, buttons |
| `--brand-glow`          | `rgba(150,191,13,0.45)`                                                        | Box-shadow glow for selected state        |
| `--brand-gradient-text` | `linear-gradient(135deg, rgb(150,191,13), #22c55e)`                            | Gradient text (e.g. "See all →")          |

### Layer 3: `[data-theme]` override blocks

`[data-theme="forest"]`, `[data-theme="ocean"]`, `[data-theme="amber"]` on `<html>` override both `@theme` tokens and runtime variables. CSS attribute selector specificity beats `:root`, so this works without `!important`.

No `[data-theme="lime"]` block is needed — Lime is the `@theme` default.

**Runtime variable values per theme:**

| Variable                | Forest                                                           | Ocean                                                            | Amber                                                            |
| ----------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `--sidebar-gradient`    | `linear-gradient(180deg, #003d1c 0%, #005c2a 50%, #007836 100%)` | `linear-gradient(180deg, #0c2d5e 0%, #1e4d9b 50%, #2563eb 100%)` | `linear-gradient(180deg, #78350f 0%, #92400e 50%, #b45309 100%)` |
| `--brand-gradient`      | `linear-gradient(135deg, #007836, #1fa32e)`                      | `linear-gradient(135deg, #2563eb, #0ea5e9)`                      | `linear-gradient(135deg, #b45309, #f59e0b)`                      |
| `--brand-glow`          | `rgba(0,120,54,0.45)`                                            | `rgba(37,99,235,0.45)`                                           | `rgba(180,83,9,0.45)`                                            |
| `--brand-gradient-text` | `linear-gradient(135deg, #007836, #1fa32e)`                      | `linear-gradient(135deg, #2563eb, #0ea5e9)`                      | `linear-gradient(135deg, #b45309, #f59e0b)`                      |

---

## Glassmorphism

A new `.glass` utility class in `index.css`. Applied where a frosted surface is needed.

```css
.glass {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
}
```

Applied to these surfaces:

| Surface                                                 | Treatment                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Sidebar active nav item                                 | Already uses `bg-white/20 backdrop-blur-sm border border-white/30` — keep as-is |
| AppShell topbar                                         | Add `.glass` + `border-b border-white/50` (replaces opaque white)               |
| Settings tab bar pill container                         | `bg-slate-100/70 backdrop-blur-sm border border-white/80`                       |
| `DeleteConfirmDialog`                                   | `bg-white/90 backdrop-blur-md`                                                  |
| Dashboard cards (HeroStatsRow panels, QuickStats, etc.) | `.glass` replaces current `.card-surface`                                       |

---

## New Files

### `src/lib/themes.ts`

```ts
export interface Theme {
  id: string;
  name: string;
  emoji: string;
  swatchGradient: string;
}

export const THEMES: Theme[] = [
  {
    id: 'lime',
    name: 'Lime',
    emoji: '🍋',
    swatchGradient: 'linear-gradient(135deg, rgb(80,120,0), rgb(150,191,13), #22c55e)',
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌲',
    swatchGradient: 'linear-gradient(135deg, #003d1c, #007836, #1fa32e)',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    swatchGradient: 'linear-gradient(135deg, #0c2d5e, #2563eb, #0ea5e9)',
  },
  {
    id: 'amber',
    name: 'Amber',
    emoji: '🌅',
    swatchGradient: 'linear-gradient(135deg, #78350f, #b45309, #f59e0b)',
  },
];

export const DEFAULT_THEME_ID = 'lime';
```

### `src/context/ThemeContext.tsx`

```ts
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

### `src/context/ThemeProvider.tsx`

Responsibilities:

- Reads `preference?.theme` from `usePreferenceContext()` (falls back to `DEFAULT_THEME_ID` while loading or unset)
- Reads uid from `useAuth()`
- On mount and whenever `themeId` changes: sets `document.documentElement.dataset.theme = themeId`
- `setTheme(id)`: applies `data-theme` immediately (instant visual feedback), then persists via `useUpdatePreference`
- Does NOT call `refetch()` — the DOM is already updated, no re-render needed

```ts
import { useEffect, useCallback } from 'react';
import { ThemeContext } from './ThemeContext';
import { usePreferenceContext } from './PreferenceContext';
import { useAuth } from '../auth/AuthContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import { DEFAULT_THEME_ID } from '../lib/themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
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

### `src/components/settings/AppearanceTab.tsx`

2×2 grid of theme swatches. Clicking a swatch calls `setTheme()` from `useTheme()`.

```tsx
import { THEMES } from '../../lib/themes';
import { useTheme } from '../../context/ThemeContext';

export default function AppearanceTab() {
  const { themeId, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6 py-4">
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
                onClick={() => setTheme(theme.id)}
                className={[
                  'overflow-hidden rounded-xl border-2 text-left transition-all',
                  isActive
                    ? 'border-accent shadow-[0_0_0_2px_rgba(34,197,94,0.25)]'
                    : 'border-border hover:border-brand/50',
                ].join(' ')}
              >
                <div className="h-10 w-full" style={{ background: theme.swatchGradient }} />
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-bold">
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
      <p className="text-[11px] text-text-muted">
        Theme synced to your account — applies across all devices.
      </p>
    </div>
  );
}
```

---

## Modified Files

### `src/firestore/types.ts`

Add to `Preference` interface:

```ts
theme?: string;  // theme ID: "lime" | "forest" | "ocean" | "amber". Optional — defaults to "lime" on client.
```

### `src/styles/index.css`

1. **Update `@theme {}`** — swap `--color-brand`, `--color-brand-dark`, `--color-accent`, `--color-highlight` to Lime values.
2. **Add `:root {}` block** below `@theme` with the 4 runtime gradient CSS variables (Lime defaults).
3. **Add `[data-theme="forest"]`, `[data-theme="ocean"]`, `[data-theme="amber"]` blocks** overriding both `@theme` tokens and runtime variables.
4. **Replace `.sidebar-gradient` class** body with `background: var(--sidebar-gradient);`.
5. **Leave `.gradient-text` unchanged** — landing-page-only white-to-lime gradient on dark backgrounds; not themed.
6. **Leave `.income-gradient-text` unchanged** — semantic income indicator (always green); not themed.
7. **Replace `.card-surface`** body with `.glass` styles (or just add `.glass` and update component imports).
8. **Add `.glass` utility class**.

### `src/App.tsx`

Wrap with `ThemeProvider` (inside `PreferenceProvider`, since `ThemeProvider` reads preference):

```tsx
<AuthProvider>
  <PreferenceProvider>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </PreferenceProvider>
</AuthProvider>
```

Import `ThemeProvider` from `'./context/ThemeProvider'`.

### `src/components/layout/Sidebar.tsx`

Change inline style:

```tsx
// Before
style={{ background: 'linear-gradient(180deg, #003d1c 0%, #005c2a 50%, #007836 100%)' }}

// After
style={{ background: 'var(--sidebar-gradient)' }}
```

### `src/routes/Settings.tsx`

1. Add to `TABS`:
   ```ts
   { key: 'appearance', label: 'Appearance' }
   ```
2. Update `TabKey` type (inferred automatically from `TABS`).
3. Import `AppearanceTab` from `'../components/settings/AppearanceTab'`.
4. Add `appearance` case to the tab content render switch.

### `src/components/dashboard/DailyTransactions.tsx`

Replace three hardcoded inline color values:

| Before                                                            | After                                         |
| ----------------------------------------------------------------- | --------------------------------------------- |
| `background: 'linear-gradient(135deg, rgb(150,191,13), #22c55e)'` | `background: 'var(--brand-gradient)'`         |
| `boxShadow: '0 3px 12px rgba(150,191,13,0.45)'`                   | `boxShadow: \`0 3px 12px var(--brand-glow)\`` |
| `background: '#22c55e'` (dot indicator)                           | `background: 'var(--color-accent)'`           |
| gradient text on "See all →"                                      | use `var(--brand-gradient-text)`              |

### Dashboard card components

Add `.glass` class (or equivalent Tailwind `bg-white/60 backdrop-blur-md border border-white/80`) to the card wrapper `<div>` in:

- `src/components/dashboard/HeroStatsRow.tsx` — each stat panel
- `src/components/dashboard/QuickStats.tsx` — card wrapper
- `src/components/dashboard/SpendingChart.tsx` — card wrapper
- `src/components/dashboard/CategoryBreakdown.tsx` — card wrapper
- `src/components/dashboard/IncomeExpenseDonut.tsx` — card wrapper
- `src/components/dashboard/TodayTransactions.tsx` — replaced by DailyTransactions, already updated

### AppShell topbar

In `src/routes/AppShell.tsx`, update the topbar `<header>` to add glassmorphism:

- Replace opaque `bg-white` with `bg-white/75 backdrop-blur-md border-b border-white/50`

### `src/components/transactions/DeleteConfirmDialog.tsx`

Update dialog panel background:

- Add `backdrop-blur-md bg-white/90` to the modal inner container

---

## Data Flow

```
Firestore preference.theme
       ↓
PreferenceProvider (preference?.theme)
       ↓
ThemeProvider (reads preference, writes via useUpdatePreference)
       ↓
document.documentElement.dataset.theme = themeId
       ↓
CSS [data-theme] selectors override CSS variables
       ↓
All components using var(--brand-gradient) etc. update automatically
```

---

## Appearance Tab Integration (Settings)

The Appearance tab is the 8th tab in Settings, added after "Defaults". The tab content is entirely self-contained in `AppearanceTab.tsx` — it calls `useTheme()` internally, so `Settings.tsx` only needs to import and render it with no prop passing.

---

## Tests

### `src/lib/themes.test.ts`

- `THEMES` array has exactly 4 entries
- Each theme has non-empty `id`, `name`, `emoji`, `swatchGradient`
- `DEFAULT_THEME_ID` matches an entry in `THEMES`

### `src/context/ThemeProvider.test.tsx`

- When `preference?.theme` is undefined, `data-theme` is set to `"lime"`
- When `preference?.theme` is `"ocean"`, `data-theme` is set to `"ocean"`
- Calling `setTheme("forest")` updates `data-theme` immediately and calls `mutate`

### `src/components/settings/AppearanceTab.test.tsx`

- Renders 4 theme swatches
- Active theme has a check indicator; others have an empty circle
- Clicking an inactive swatch calls `setTheme` with that theme's id

---

## Out of Scope

- No custom theme / color picker — only the 4 built-in themes
- No dark mode — all 4 themes are light
- Income and expense indicator colors remain semantically fixed (`text-green-600` / `text-red-600`) regardless of theme — only brand/accent elements switch
- The landing page (`/`) hero gradient is not themed — it remains Forest green (it's brand-facing content, not user-facing chrome)
- No transition animation when switching themes — the change is instant via CSS variable swap
