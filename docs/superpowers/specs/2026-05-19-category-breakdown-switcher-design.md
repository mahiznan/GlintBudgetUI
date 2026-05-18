# CategoryBreakdown — Income/Expense Switcher & Currency Filter

**Date:** 2026-05-19
**Status:** Approved

## Overview

Enhance the "By Category" dashboard widget with two improvements:
1. Apply the default currency + account filter (consistent with HeroStatsRow)
2. Add an inline Expense / Income toggle so users can view income categories as well as expense categories

## Scope

- `src/components/dashboard/CategoryBreakdown.tsx` — primary changes
- `src/components/dashboard/CategoryBreakdown.test.tsx` — updated and new tests
- `src/routes/Dashboard.tsx` — change prop from `periodTxns` to `heroTxns`

No new shared components. No changes to `TypeToggle` or any other file.

## Design

### Currency / Account Filter

`Dashboard` already computes `heroTxns` = `periodTxns` filtered by `defaultCurrencyCode` and `defaultAccount`. `CategoryBreakdown` currently receives `periodTxns`, bypassing this filter.

**Change:** Pass `heroTxns` to `CategoryBreakdown` (line 86 in Dashboard.tsx).

This is a one-line change. The filtering logic already exists and is tested via HeroStatsRow.

### Income / Expense Switcher

**Local state:** `useState<'expense' | 'income'>('expense')` — defaults to expense, preserving current behavior.

**Header layout:** flex row, space-between.
- Left: "BY CATEGORY" label (existing style — `text-sm font-semibold uppercase tracking-widest text-text-muted`)
- Right: compact pill toggle

**Pill toggle** (inline, no shared component):
```
[Expense] [Income]
```
Container: `inline-flex rounded-lg border border-border bg-surface-alt p-0.5 gap-0.5`

Each button: `rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all`

Active styles:
- Expense: `bg-red-600 text-white shadow-sm`
- Income: `text-white shadow-sm` + `style={{ background: 'var(--brand-gradient)' }}`

Inactive: `text-text-muted hover:text-text`

**Category aggregation:**
- Expense mode: `transactions.filter(t => t.amount < 0)` — amounts displayed as `Math.abs(t.amount)`
- Income mode: `transactions.filter(t => t.amount > 0)` — amounts used as-is

Both modes show top 5 categories sorted descending by total, with percentage bars.

**Empty state:** Mode-aware message:
- Expense: "No expenses for this period"
- Income: "No income for this period"

### Progress bar colors

Progress bars use `theme.categoryColors[i % theme.categoryColors.length]` — no change. Colors are theme-defined and apply equally to income and expense bars.

## Tests

### Updated
- "excludes income transactions" → rename to "expense mode hides income transactions (default)" — asserts Salary is hidden, Food visible when mode is Expense (default)

### New
- **Income tab shows income, hides expenses** — click Income button; Salary visible, Food hidden
- **Empty state is mode-aware** — no transactions: default shows "No expenses…"; after clicking Income shows "No income…"
- **Switcher renders with Expense active by default** — Income button present, Expense button present, Expense visually active (has `bg-red-600` class)

## Out of Scope

- Persisting the selected mode across page navigation
- Sharing the mode state with other widgets
- A reusable compact toggle component (YAGNI — single use case)
