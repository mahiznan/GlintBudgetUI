# Period Navigation — Design Spec

**Date:** 2026-05-24  
**Status:** Approved

## Summary

Add ‹ / › navigation to the SpendingChart duration selector so users can browse previous periods (day, week, month, quarter, year). All six dashboard widgets — HeroStatsRow, SpendingChart, CategoryBreakdown, IncomeExpenseDonut, QuickStats, and DailyTransactions — update to reflect the selected period instance.

## Layout

**Option C selected:** Period type pills on the left, `‹ label ›` navigator on the right, all in one horizontal row inside the SpendingChart header. Chart-type toggle (`▬ ∿`) stays to the right of the navigator.

```
[Day  Week  Month  Quarter  Year]      ‹  May 2026  ›   ▬  ∿
```

On mobile the header already uses `flex-wrap`, so the navigator wraps naturally beneath the pills.

## Section 1 — State & Data Flow

### New state in Dashboard

```ts
const [periodOffset, setPeriodOffset] = useState<number>(0);
```

- `0` = current period, `-1` = one period back, `-2` = two periods back, etc.
- Resets to `0` whenever the `period` type changes (added to the existing `useEffect` that resets `drillState`).
- Cannot go above `0` — the `›` button is disabled when `periodOffset === 0`.

### Derived reference date

```ts
const referenceDate = useMemo(() => shiftPeriodDate(period, periodOffset), [period, periodOffset]);
```

### Consumers updated to use `referenceDate`

| Computation        | Before                                        | After                                                   |
| ------------------ | --------------------------------------------- | ------------------------------------------------------- |
| `periodTxns`       | `filterByPeriod(allTxns, period)`             | `filterByPeriod(allTxns, period, referenceDate)`        |
| `periodDays`       | `getPeriodRange(period)`                      | `getPeriodRange(period, referenceDate)`                 |
| SpendingChart data | `getChartDateRange(period, now)` inside chart | `getChartDateRange(period, referenceDate)` inside chart |

`heroTxns`, `categoryItems`, `totalIncome`, `totalExpenses` all derive from `periodTxns` — they update automatically.

`chartTxns` is currently all transactions filtered only by currency/account (not period) — SpendingChart handles its own date windowing internally via `buildChartData`. SpendingChart receives the new `offset` prop and recomputes its range using `shiftPeriodDate` internally.

## Section 2 — New `dateUtils` Utilities

### `shiftPeriodDate(period, offset, now?)`

Returns a `Date` shifted from `now` by `offset` period-units. Used to derive the reference date.

```ts
export function shiftPeriodDate(period: Period, offset: number, now = new Date()): Date;
```

| Period    | Shift logic                               |
| --------- | ----------------------------------------- |
| `day`     | `d.setDate(d.getDate() + offset)`         |
| `week`    | `d.setDate(d.getDate() + offset * 7)`     |
| `month`   | `d.setMonth(d.getMonth() + offset)`       |
| `quarter` | `d.setMonth(d.getMonth() + offset * 3)`   |
| `year`    | `d.setFullYear(d.getFullYear() + offset)` |

### `getPeriodLabel(period, referenceDate)`

Returns a human-readable label for the navigator.

```ts
export function getPeriodLabel(period: Period, referenceDate: Date): string;
```

| Period    | Example output                                |
| --------- | --------------------------------------------- |
| `day`     | `"May 24, 2026"`                              |
| `week`    | `"Apr 28 – May 4"` (ISO Mon–Sun of that week) |
| `month`   | `"May 2026"`                                  |
| `quarter` | `"Q2 2026"`                                   |
| `year`    | `"2026"`                                      |

### Existing functions updated

`getPeriodRange`, `getChartDateRange`, and `filterByPeriod` each gain an optional `referenceDate` parameter (defaults to `new Date()`). All existing callers are unaffected.

```ts
export function getPeriodRange(
  period: Period,
  referenceDate = new Date(),
): { start: Date; end: Date };
export function getChartDateRange(
  period: Period,
  referenceDate = new Date(),
): { start: Date; end: Date };
export function filterByPeriod(
  txns: Transaction[],
  period: Period,
  referenceDate = new Date(),
): Transaction[];
```

## Section 3 — SpendingChart UI Changes

### New props

```ts
interface SpendingChartProps {
  // existing...
  offset: number;
  onOffsetChange: (delta: -1 | 1) => void;
}
```

### Navigator rendering

The label and disabled state are computed inside `SpendingChart`:

```ts
const referenceDate = useMemo(() => shiftPeriodDate(period, offset), [period, offset]);
const periodLabel = getPeriodLabel(period, referenceDate);
const atCurrent = offset === 0;
```

The header right side becomes:

```tsx
{
  /* Period navigator */
}
<div className="flex items-center gap-1">
  <button onClick={() => onOffsetChange(-1)} aria-label="Previous period">
    ‹
  </button>
  <span className="min-w-[72px] text-center text-[11px] font-mono font-semibold">
    {periodLabel}
  </span>
  <button onClick={() => onOffsetChange(1)} disabled={atCurrent} aria-label="Next period">
    ›
  </button>
</div>;

{
  /* Chart type toggle — unchanged */
}
```

- `›` gets `opacity-30 cursor-not-allowed` when disabled
- `‹` is always enabled

`buildChartData` already accepts `now` as second arg — it is called with `referenceDate` instead.

## Section 4 — Testing

### `src/lib/dateUtils.test.ts` additions

- `shiftPeriodDate` — all 5 period types at offset `-1`, offset `0`, offset `-3`; month-end boundary (e.g. Jan 31 → Feb 28)
- `getPeriodLabel` — all 5 period types with a fixed reference date

### `src/components/dashboard/SpendingChart.test.tsx` updates

- Pass `offset={0}` and `onOffsetChange={vi.fn()}` in all existing render calls
- Assert `‹` button renders
- Assert `›` button renders and has `disabled` attribute when `offset === 0`
- Assert `›` button does not have `disabled` when `offset === -1`

## Out of Scope

- DailyTransactions widget — it shows today's transactions for quick entry and is intentionally anchored to today regardless of period navigation.
- Persisting `periodOffset` across sessions — offset always starts at `0` on page load.
- Forward navigation past today — right arrow disabled at `offset === 0`.
