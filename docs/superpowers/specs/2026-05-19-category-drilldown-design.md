# Category Drill-Down Design

**Date:** 2026-05-19
**Status:** Approved

## Overview

Extend the "By Category" widget and the paired "Expense/Income by Category" donut chart to support three-level drill-down: all categories → subcategories of a selected category → transactions of a selected subcategory. The rest of the dashboard (HeroStatsRow, SpendingChart, DailyTransactions, QuickStats) is unaffected.

## Requirements

1. Show **all** categories at level 0 (remove the current `.slice(0, 5)` limit).
2. Clicking a category navigates to level 1: its subcategories rendered in the same bar-list style.
3. Clicking a subcategory navigates to level 2: a transaction list for that subcategory.
4. Each transaction row at level 2 links to `/app/transactions/:id/edit`.
5. The donut chart stays in sync with whatever level is displayed:
   - Level 0 → all category slices.
   - Level 1 → subcategory slices for the selected category.
   - Level 2 → single slice at 100% for the selected subcategory.
6. Every transaction has a subcategory (guaranteed by the iOS app) — no empty-subcategory edge case.
7. Global data (totals, spending chart, daily transactions) is **never affected** by drill state.

## State Shape

Owned by `Dashboard`. A discriminated union keeps the levels explicit:

```typescript
type DrillState =
  | { level: 0 }
  | { level: 1; category: string }
  | { level: 2; category: string; subCategory: string };
```

Initialises as `{ level: 0 }`. Changing the expense/income mode toggle resets drill to level 0.

## Data Computation

All derived from `heroTxns` (the already-filtered, same set used by HeroStatsRow). Only `categoryItems` and `drillTransactions` change — `heroTxns` itself never mutates.

### `categoryItems: CategoryItem[]`

| Level | Filter                                                | Group key       | Notes                                          |
| ----- | ----------------------------------------------------- | --------------- | ---------------------------------------------- |
| 0     | expense or income                                     | `t.category`    | All categories, sorted desc by total           |
| 1     | expense/income + `t.category === drillState.category` | `t.subCategory` | All subcategories, sorted desc                 |
| 2     | expense/income + category + subCategory match         | —               | Single item: `{ name, icon, total, pct: 100 }` |

`pct` at levels 0 and 1: `Math.round((total / periodSum) * 100)` where `periodSum` is the total for that level's filtered set.

### `drillTransactions: Transaction[]`

Only computed at level 2. Filtered from `heroTxns` matching category, subCategory, and current mode, sorted by `t.date` descending. Passed as `transactions` prop to `CategoryBreakdown`.

## Component Changes

### `Dashboard.tsx`

- Add `drillState: DrillState` state, initialised `{ level: 0 }`.
- Replace `categoryItems` memo: switch on `drillState.level` to produce the right list.
- Add `drillTransactions` memo (level 2 only).
- Wrap `setCategoryMode` to also reset `drillState → { level: 0 }`.
- Pass new props to `CategoryBreakdown`:
  - `drillLevel`, `drillLabel`, `backLabel`, `onItemClick`, `onBack`, `transactions`.
- `IncomeExpenseDonut` receives the same `categoryItems` — no prop changes.

### `CategoryBreakdown.tsx`

New optional props (all existing props unchanged):

```typescript
drillLevel?: 0 | 1 | 2           // default 0
drillLabel?: string               // context label shown in header
backLabel?: string                // text for back button e.g. "← Back" / "← Food"
onItemClick?: (name: string) => void  // row click at levels 0 and 1
onBack?: () => void               // back button handler
transactions?: Transaction[]      // level-2 transaction rows
```

**Header rendering:**

| Level | Left side                              | Right side            |
| ----- | -------------------------------------- | --------------------- |
| 0     | "BY CATEGORY" label                    | expense/income toggle |
| 1     | `← Back` button + `drillLabel` chip    | expense/income toggle |
| 2     | `backLabel` button + `drillLabel` chip | hidden                |

**Body rendering:**

- Levels 0 and 1: existing bar-list UI, rows are clickable (cursor-pointer, `onItemClick` callback, chevron `›` on each row).
- Level 2: transaction rows — icon, vendor, date, amount. Each row is a `<Link to="/app/transactions/{id}/edit">`.

### `IncomeExpenseDonut.tsx`

No changes. Receives `categories: CategoryItem[]` as before; at level 2 this is a single-item array.

## Files Changed

| File                                                  | Change                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/routes/Dashboard.tsx`                            | Add `drillState`, recompute `categoryItems`, add `drillTransactions`, pass new props |
| `src/components/dashboard/CategoryBreakdown.tsx`      | Add drill-level header, back button, transaction-row mode                            |
| `src/components/dashboard/CategoryBreakdown.test.tsx` | Update smoke tests for new props                                                     |

## Out of Scope

- Editing or deleting transactions from the drill-down view (link to edit form is sufficient).
- Animating transitions between levels.
- Persisting drill state across page navigation.
