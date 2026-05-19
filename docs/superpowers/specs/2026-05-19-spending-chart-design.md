# Spending Chart — Period-Aware Windowing & Bar/Line Toggle

**Date:** 2026-05-19
**Status:** Approved

## Overview

Improve the dashboard SpendingChart to:
1. Show period-contextual trend data with the correct date window per period selector choice.
2. Add a bar ↔ line chart toggle persisted in Firestore so the user's preference survives across sessions.
3. Apply a gradient fill to bar chart bars.
4. Filter chart data by default currency and account (matching the hero stats filter).

## Period → Chart Window Mapping

The chart uses its own date window that differs from the period filter used by hero stats. This provides trend context (e.g., "day" selected = last 15 days of daily spending, not today's hourly breakdown).

| Period selected | Chart window | Buckets | Zero-filled |
|---|---|---|---|
| Day | Today − 14 days → today | 15 daily | Yes |
| Week | Monday → Sunday of current week | 7 daily | Yes |
| Month | 1st of current month → today | N daily (1–31) | Yes |
| Quarter | Q-start → today | 3 monthly | Yes |
| Year | Jan 1 → Dec 31 of current year | 12 monthly | Yes |

All buckets are zero-filled so empty days/months appear as zero bars rather than being absent.

## Data Source

`SpendingChart` receives `chartTxns`: all transactions filtered by **default currency code** and **default account** (same filter as `heroTxns`), but **not** period-filtered. The component applies its own date window internally via `getChartDateRange`.

Dashboard adds a `chartTxns` memo:
```ts
const chartTxns = useMemo(
  () => allTxns.filter(
    t => t.currency === defaultCurrencyCode &&
         (defaultAccount === '' || t.account === defaultAccount)
  ),
  [allTxns, defaultCurrencyCode, defaultAccount],
);
```

Only expenses (`amount < 0`) are plotted (absolute values shown). Income is already covered by other widgets.

## Chart Type Toggle

A bar ↔ line toggle appears in the **top-right of the "SPENDING" card header**, inline with the title — two small pill buttons:
- Active: brand-amber background, white text
- Inactive: muted gray background, muted text

Icons: `▬` for bar, `∿` for line (or equivalent accessible labels).

### Bar chart
- Recharts `BarChart` + `Bar`
- Vertical `<linearGradient>` from amber-500 (top, 80% opacity) → amber-200 (bottom, 30% opacity)
- Rounded top corners `radius={[4, 4, 0, 0]}`

### Line chart
- Recharts `LineChart` + `Line` (monotone curve, amber stroke)
- Subtle `Area` fill underneath (amber, 10–15% opacity) for readability
- Dot shown on hover only (`dot={false}`, `activeDot={{ r: 4 }}`)

## Persistence

`chartType: 'bar' | 'line'` is managed in **Dashboard**, not inside SpendingChart.

- Dashboard reads `preference?.spendingChartType ?? 'bar'` from `usePreferenceContext`
- On toggle, Dashboard calls `mutate({ spendingChartType: newType })` — optimistic local state update immediately, Firestore write in background (fire-and-forget; no loading spinner)
- SpendingChart receives `chartType` and `onChartTypeChange` as props — it is a pure rendering component

### Firestore field
Field name: `spendingChartType` (camelCase, consistent with `accounts`, `subCategories`).
Added as an optional field; old documents without it default to `'bar'`.

## Component Interface

```ts
interface SpendingChartProps {
  transactions: Transaction[];        // chartTxns — currency+account filtered, no period cutoff
  period: Period;
  currencySymbol: string;
  chartType: 'bar' | 'line';
  onChartTypeChange: (type: 'bar' | 'line') => void;
}
```

## Files Changed

| File | Change |
|---|---|
| `src/firestore/types.ts` | Add `spendingChartType?: 'bar' \| 'line'` to `Preference` |
| `src/hooks/usePreferences.ts` | Read `raw['spendingChartType']` in `docToPreference` |
| `src/hooks/useUpdatePreference.ts` | Add `spendingChartType` to `FirestorePreferencePartial` |
| `src/lib/dateUtils.ts` | Add `getChartDateRange(period, now?)` returning `{start, end}` |
| `src/components/dashboard/SpendingChart.tsx` | Rewrite: new props, toggle UI, gradient bars, line chart, zero-fill |
| `src/routes/Dashboard.tsx` | Add `chartTxns` memo, `chartType` state, `useUpdatePreference` wiring |

## New Utility: `getChartDateRange`

```ts
export function getChartDateRange(period: Period, now = new Date()): { start: Date; end: Date }
```

Returns the chart's own date window for `buildChartData`. Separate from `getPeriodRange` (which drives hero stats).

- `'day'` → start = today minus 14 days at 00:00, end = today at 23:59:59
- `'week'` → start = Monday of current week at 00:00, end = Sunday at 23:59:59
- `'month'` → start = 1st of current month at 00:00, end = today at 23:59:59
- `'quarter'` → start = first day of current quarter at 00:00, end = today at 23:59:59
- `'year'` → start = Jan 1 at 00:00, end = Dec 31 at 23:59:59

## Tests

- **`dateUtils.test.ts`** — unit tests for `getChartDateRange` covering all 5 periods: correct start, correct end, correct bucket count when passed to `buildChartData`
- **`SpendingChart.test.tsx`** — smoke test renders without crash for `chartType='bar'` and `chartType='line'`; toggle buttons present with correct labels; `onChartTypeChange` called with correct value on click

## What This Does NOT Change

- Hero stats, QuickStats, CategoryBreakdown, IncomeExpenseDonut — unaffected
- `getPeriodRange` — unchanged; still drives hero stats period filter
- Firestore rules — no change; `spendingChartType` is a web-only field added to the existing preference document (iOS ignores unknown fields)
- The `periodTxns` memo in Dashboard — unchanged; still used by all other widgets
