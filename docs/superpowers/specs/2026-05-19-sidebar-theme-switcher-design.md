# Sidebar Theme Switcher — Design Spec

**Date:** 2026-05-19

## Overview

Add a compact theme-switcher row to the Sidebar, placed between the nav links and the Sign Out button. Shows four gradient dot swatches (one per theme). Clicking a dot switches the active theme immediately. No text labels — icons only.

## Placement

Inside `Sidebar.tsx`, between the `<nav>` block and the Sign Out `<div>`. A `<div role="group" aria-label="Theme">` wrapping a horizontal flex row of buttons.

## Swatch Appearance

- Size: `20 × 20 px` circles (`w-5 h-5 rounded-full`)
- Fill: each theme's `swatchGradient` from `src/lib/themes.ts`
- Active indicator: `ring-2 ring-white ring-offset-1 ring-offset-transparent` (white ring against the dark sidebar)
- Inactive hover: `opacity-70 hover:opacity-100 transition-opacity`
- Each `<button>` gets `aria-label={theme.name}` for accessibility

## Behavior

- Reads `themeId` and `setTheme` from `useTheme()` (already reactive — live-updates charts)
- All four themes from `THEMES` array rendered in order (lime, forest, ocean, amber)
- No new component file — added inline in `Sidebar.tsx` (~20 extra lines)

## Out of Scope

- No theme name tooltip (can add later if needed)
- No re-ordering of themes
- No new Firestore fields (theme is already persisted via `setTheme`)
