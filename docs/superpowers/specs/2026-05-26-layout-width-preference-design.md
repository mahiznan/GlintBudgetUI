# Layout Width Preference — Design Spec

**Date:** 2026-05-26
**Status:** Approved

## Overview

Allow users to choose between a fixed-width (centred, `max-w-5xl`) and full-width content layout. The preference persists to Firestore and syncs across devices, following the exact same pattern as the theme preference.

---

## 1. Data Model

Add one field to the `Preference` Firestore document:

```
layoutWidth: 'fixed' | 'full'   // default: 'fixed'
```

- Stored under the user's preferences document (same path as `theme`, `spendingChartType`, etc.)
- Missing field treated as `'fixed'` — no migration required.
- Written via the existing `useUpdatePreference` hook: `mutate({ layoutWidth: '...' })`.

The `Preference` TypeScript type in `src/firestore/types.ts` gains an optional field:

```ts
layoutWidth?: 'fixed' | 'full';
```

---

## 2. New Files

### `src/context/LayoutContext.tsx`

```ts
export interface LayoutContextValue {
  layoutWidth: 'fixed' | 'full';
  setLayoutWidth: (w: 'fixed' | 'full') => Promise<void>;
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayout(): LayoutContextValue { ... }
```

### `src/context/LayoutProvider.tsx`

- Reads `preference.layoutWidth` from `usePreferenceContext()`; falls back to `'fixed'`.
- Local state for immediate UI response (no Firestore round-trip delay).
- `setLayoutWidth` updates local state then calls `mutate({ layoutWidth: w })`.
- Provides `LayoutContext`.

---

## 3. App.tsx Integration

`LayoutProvider` is added alongside `ThemeProvider` inside the provider tree:

```tsx
<AuthProvider>
  <PreferenceProvider>
    <TransactionProvider>
      <ThemeProvider>
        <LayoutProvider>
          <RouterProvider router={router} />
        </LayoutProvider>
      </ThemeProvider>
    </TransactionProvider>
  </PreferenceProvider>
</AuthProvider>
```

`LayoutProvider` must be inside `PreferenceProvider` (reads preference) and `AuthProvider` (needs uid for writes).

---

## 4. AppShell Layout Application

In `AppShell.tsx`, the content wrapper reads `useLayout()`:

```tsx
const { layoutWidth } = useLayout();

<main className="flex-1 overflow-y-auto bg-surface-alt">
  <div className={layoutWidth === 'fixed' ? 'max-w-5xl mx-auto w-full' : 'w-full'}>
    <Outlet ... />
  </div>
</main>
```

The nav bar (`Sidebar.tsx`) already uses `max-w-5xl mx-auto` on its inner div — no change needed. In fixed mode, content margins align perfectly with the nav bar.

---

## 5. Settings UI — AppearanceTab

Add a "Layout Width" section **below** the existing "App Theme" section in `src/components/settings/AppearanceTab.tsx`.

Two option cards using the same card style as theme cards:

| Card        | Icon / Illustration                         | Label       |
| ----------- | ------------------------------------------- | ----------- |
| Fixed width | `▐█████▌` (centred block with side margins) | Fixed width |
| Full width  | `████████` (edge-to-edge block)             | Full width  |

- Active card: accent border + green checkmark (same as theme cards).
- Subtext below both cards: "Layout saved to your account — syncs across all devices."

The illustrations are rendered as small inline SVGs or simple styled divs — no external assets.

---

## 6. Firestore Rules

No change. The `layoutWidth` field falls within the existing user-preferences write rule (`request.auth.uid == userId`).

---

## 7. Testing

- `LayoutProvider.test.tsx` — unit tests: default value, seeding from preference, `setLayoutWidth` calls mutate, optimistic local state.
- `AppearanceTab.test.tsx` — existing file gets a new smoke test asserting both width cards render and the active card reflects the current `layoutWidth`.
- `AppShell.test.tsx` — existing file gets a test asserting `max-w-5xl` class present in fixed mode and absent in full mode.

---

## 8. Non-Goals

- No nav bar toggle (toggle lives in Settings → Appearance only).
- No per-route width override.
- No custom pixel-width input.
