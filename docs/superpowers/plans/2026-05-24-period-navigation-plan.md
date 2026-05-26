# Period Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ‹ / › navigation to the SpendingChart so users can browse previous periods, with all dashboard widgets (HeroStatsRow, CategoryBreakdown, IncomeExpenseDonut, QuickStats) updating to reflect the selected period instance.

**Architecture:** A `periodOffset: number` state (0 = current, negative = past) lives in Dashboard. A `referenceDate` derived via `shiftPeriodDate(period, offset)` is passed to `filterByPeriod` and `getPeriodRange`. SpendingChart computes its own `referenceDate` internally from its `offset` prop to drive `buildChartData`. The `‹ label ›` navigator sits between the period pills and the chart-type toggle in the SpendingChart header (Option C layout).

**Tech Stack:** React + TypeScript, Vitest + React Testing Library, existing `dateUtils.ts` utilities.

---

### Task 1: Add `shiftPeriodDate` and `getPeriodLabel` to dateUtils

**Files:**

- Modify: `src/lib/dateUtils.ts`
- Modify: `src/lib/dateUtils.test.ts`

- [ ] **Step 1: Add the new function names to the test import**

Open `src/lib/dateUtils.test.ts`. Replace the import block at the top:

```ts
import { describe, expect, it } from 'vitest';
import {
  getPeriodRange,
  getChartDateRange,
  formatCurrency,
  groupByDay,
  groupByMonth,
  getMondayOf,
  getWeekDays,
  isSameDay,
  isCurrentWeek,
  formatDayHeading,
  dayOfWeekOffset,
  shiftPeriodDate,
  getPeriodLabel,
} from './dateUtils';
```

- [ ] **Step 2: Write failing tests for `shiftPeriodDate`**

Append to the bottom of `src/lib/dateUtils.test.ts`:

```ts
describe('shiftPeriodDate', () => {
  // May 15, 2026 is a Friday (confirmed: May 17 is Sunday per existing tests)
  const base = new Date(2026, 4, 15, 12, 0, 0);

  it('shifts day by -3', () => {
    const r = shiftPeriodDate('day', -3, base);
    expect(r.getFullYear()).toBe(2026);
    expect(r.getMonth()).toBe(4);
    expect(r.getDate()).toBe(12);
  });

  it('shifts week by -1 (subtracts 7 days)', () => {
    const r = shiftPeriodDate('week', -1, base);
    expect(r.getMonth()).toBe(4);
    expect(r.getDate()).toBe(8); // May 15 - 7 = May 8
  });

  it('shifts month by -1', () => {
    const r = shiftPeriodDate('month', -1, base);
    expect(r.getMonth()).toBe(3); // April
    expect(r.getFullYear()).toBe(2026);
  });

  it('shifts quarter by -1 (subtracts 3 months)', () => {
    const r = shiftPeriodDate('quarter', -1, base);
    expect(r.getMonth()).toBe(1); // February (May - 3 = Feb)
    expect(r.getFullYear()).toBe(2026);
  });

  it('shifts year by -1', () => {
    const r = shiftPeriodDate('year', -1, base);
    expect(r.getFullYear()).toBe(2025);
    expect(r.getMonth()).toBe(4); // still May
  });

  it('returns a copy at offset 0 (not the same object)', () => {
    const r = shiftPeriodDate('month', 0, base);
    expect(r.getMonth()).toBe(4); // May
    expect(r).not.toBe(base);
  });
});
```

- [ ] **Step 3: Write failing tests for `getPeriodLabel`**

Append immediately after the `shiftPeriodDate` block:

```ts
describe('getPeriodLabel', () => {
  // May 15, 2026 is a Friday → ISO week Mon May 11 – Sun May 17
  const ref = new Date(2026, 4, 15, 12, 0, 0);

  it('formats day', () => {
    expect(getPeriodLabel('day', ref)).toBe('May 15, 2026');
  });

  it('formats week as Mon – Sun range using en dash', () => {
    // getMondayOf(May 15 Fri) = May 11; Sunday = May 17
    expect(getPeriodLabel('week', ref)).toBe('May 11 – May 17');
  });

  it('formats month', () => {
    expect(getPeriodLabel('month', ref)).toBe('May 2026');
  });

  it('formats quarter', () => {
    // May (month index 4): floor(4/3)+1 = 2
    expect(getPeriodLabel('quarter', ref)).toBe('Q2 2026');
  });

  it('formats year', () => {
    expect(getPeriodLabel('year', ref)).toBe('2026');
  });
});
```

- [ ] **Step 4: Run tests to confirm they fail**

```bash
npm run test -- --reporter=verbose src/lib/dateUtils.test.ts
```

Expected: 11 new test failures. All existing tests continue to pass.

- [ ] **Step 5: Implement `shiftPeriodDate` and `getPeriodLabel` in dateUtils.ts**

Append both functions to the end of `src/lib/dateUtils.ts`:

```ts
export function shiftPeriodDate(period: Period, offset: number, now = new Date()): Date {
  const d = new Date(now);
  switch (period) {
    case 'day':
      d.setDate(d.getDate() + offset);
      break;
    case 'week':
      d.setDate(d.getDate() + offset * 7);
      break;
    case 'month':
      d.setMonth(d.getMonth() + offset);
      break;
    case 'quarter':
      d.setMonth(d.getMonth() + offset * 3);
      break;
    case 'year':
      d.setFullYear(d.getFullYear() + offset);
      break;
  }
  return d;
}

export function getPeriodLabel(period: Period, referenceDate: Date): string {
  switch (period) {
    case 'day':
      return referenceDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case 'week': {
      const monday = getMondayOf(referenceDate);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${fmt(monday)} – ${fmt(sunday)}`;
    }
    case 'month':
      return referenceDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    case 'quarter': {
      const q = Math.floor(referenceDate.getMonth() / 3) + 1;
      return `Q${q} ${referenceDate.getFullYear()}`;
    }
    case 'year':
      return String(referenceDate.getFullYear());
  }
}
```

- [ ] **Step 6: Run tests to confirm all pass**

```bash
npm run test -- --reporter=verbose src/lib/dateUtils.test.ts
```

Expected: all tests pass including the 11 new ones.

- [ ] **Step 7: Commit**

```bash
git add src/lib/dateUtils.ts src/lib/dateUtils.test.ts
git commit -m "feat: add shiftPeriodDate and getPeriodLabel utilities"
```

---

### Task 2: Update SpendingChart with offset props and navigator UI

**Files:**

- Modify: `src/components/dashboard/SpendingChart.tsx`
- Modify: `src/components/dashboard/SpendingChart.test.tsx`

- [ ] **Step 1: Add new props to `baseProps` in the test file**

Open `src/components/dashboard/SpendingChart.test.tsx`. The existing `baseProps` object (lines 43–50) is missing `offset` and `onOffsetChange`. Replace it:

```ts
const baseProps = {
  transactions: [makeTx('2026-05-17', -500), makeTx('2026-05-16', -300)],
  period: 'month' as const,
  onPeriodChange: vi.fn(),
  currencySymbol: '₹',
  chartType: 'bar' as const,
  onChartTypeChange: vi.fn(),
  offset: 0,
  onOffsetChange: vi.fn(),
};
```

- [ ] **Step 2: Write failing tests for the navigator**

Append inside the `describe('SpendingChart', ...)` block before its closing `}`:

```ts
  it('renders previous and next period buttons', () => {
    render(<SpendingChart {...baseProps} />);
    expect(screen.getByRole('button', { name: /previous period/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next period/i })).toBeInTheDocument();
  });

  it('disables the next period button when offset is 0', () => {
    render(<SpendingChart {...baseProps} offset={0} />);
    expect(screen.getByRole('button', { name: /next period/i })).toBeDisabled();
  });

  it('enables the next period button when offset is negative', () => {
    render(<SpendingChart {...baseProps} offset={-1} />);
    expect(screen.getByRole('button', { name: /next period/i })).not.toBeDisabled();
  });

  it('calls onOffsetChange(-1) when previous button is clicked', () => {
    const onOffsetChange = vi.fn();
    render(<SpendingChart {...baseProps} onOffsetChange={onOffsetChange} />);
    fireEvent.click(screen.getByRole('button', { name: /previous period/i }));
    expect(onOffsetChange).toHaveBeenCalledWith(-1);
  });
```

- [ ] **Step 3: Run tests to confirm new tests fail**

```bash
npm run test -- --reporter=verbose src/components/dashboard/SpendingChart.test.tsx
```

Expected: 4 new failures (existing tests also fail due to missing required props — that's expected and will be fixed next).

- [ ] **Step 4: Update `SpendingChartProps` interface**

In `src/components/dashboard/SpendingChart.tsx`, replace the interface (lines 33–40):

```ts
interface SpendingChartProps {
  transactions: Transaction[];
  period: Period;
  onPeriodChange: (p: Period) => void;
  currencySymbol: string;
  chartType: 'bar' | 'line';
  onChartTypeChange: (type: 'bar' | 'line') => void;
  offset: number;
  onOffsetChange: (delta: -1 | 1) => void;
}
```

- [ ] **Step 5: Add new imports**

Replace the dateUtils import block (lines 14–21) with:

```ts
import {
  getChartDateRange,
  groupByDay,
  groupByMonth,
  localDateStr,
  formatCurrency,
  shiftPeriodDate,
  getPeriodLabel,
} from '../../lib/dateUtils';
```

- [ ] **Step 6: Update component signature and memos**

Replace the component signature and the `data` useMemo (lines 134–144):

```ts
export default function SpendingChart({
  transactions,
  period,
  onPeriodChange,
  currencySymbol,
  chartType,
  onChartTypeChange,
  offset,
  onOffsetChange,
}: SpendingChartProps) {
  const { themeId } = useTheme();
  const theme = getTheme(themeId);
  const referenceDate = useMemo(() => shiftPeriodDate(period, offset), [period, offset]);
  const periodLabel = getPeriodLabel(period, referenceDate);
  const data = useMemo(
    () => buildChartData(transactions, period, referenceDate),
    [transactions, period, referenceDate],
  );
```

- [ ] **Step 7: Insert the period navigator into the header JSX**

Locate the comment `{/* Chart type switcher */}` in the JSX (around line 193). Insert the navigator block immediately before it:

```tsx
{
  /* Period navigator */
}
<div className="flex items-center gap-1">
  <button
    type="button"
    onClick={() => onOffsetChange(-1)}
    aria-label="Previous period"
    className="w-6 h-6 flex items-center justify-center rounded text-sm text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
  >
    ‹
  </button>
  <span className="min-w-[72px] text-center text-[11px] font-mono font-semibold text-text">
    {periodLabel}
  </span>
  <button
    type="button"
    onClick={() => onOffsetChange(1)}
    disabled={offset === 0}
    aria-label="Next period"
    className={`w-6 h-6 flex items-center justify-center rounded text-sm transition-colors ${
      offset === 0
        ? 'text-border cursor-not-allowed'
        : 'text-text-muted hover:text-text hover:bg-surface-alt'
    }`}
  >
    ›
  </button>
</div>;

{
  /* Chart type switcher */
}
```

- [ ] **Step 8: Run tests to confirm all pass**

```bash
npm run test -- --reporter=verbose src/components/dashboard/SpendingChart.test.tsx
```

Expected: all tests pass.

- [ ] **Step 9: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/components/dashboard/SpendingChart.tsx src/components/dashboard/SpendingChart.test.tsx
git commit -m "feat: add period navigator UI to SpendingChart"
```

---

### Task 3: Wire `periodOffset` into Dashboard

**Files:**

- Modify: `src/routes/Dashboard.tsx`

- [ ] **Step 1: Add `shiftPeriodDate` to the dateUtils import**

In `src/routes/Dashboard.tsx`, replace line 8:

```ts
import { filterByPeriod, getPeriodRange, shiftPeriodDate } from '../lib/dateUtils';
```

- [ ] **Step 2: Add `periodOffset` state**

After the `drillState` declaration (line 42 — `const [drillState, setDrillState] = useState<DrillState>({ level: 0 });`), add:

```ts
const [periodOffset, setPeriodOffset] = useState<number>(0);
```

- [ ] **Step 3: Reset `periodOffset` when the period type changes**

Replace the existing period-change `useEffect` (lines 44–47):

```ts
useEffect(() => {
  setDrillState({ level: 0 });
  setPeriodOffset(0);
}, [period]);
```

- [ ] **Step 4: Derive `referenceDate` and update the period-filtered memos**

Replace the `periodTxns` and `periodDays` useMemo blocks (lines 53–58):

```ts
const referenceDate = useMemo(() => shiftPeriodDate(period, periodOffset), [period, periodOffset]);

const periodTxns = useMemo(
  () => filterByPeriod(allTxns, period, referenceDate),
  [allTxns, period, referenceDate],
);

const periodDays = useMemo(() => {
  const { start, end } = getPeriodRange(period, referenceDate);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}, [period, referenceDate]);
```

- [ ] **Step 5: Pass `offset` and `onOffsetChange` to SpendingChart**

Replace the `<SpendingChart ... />` JSX (around lines 202–209):

```tsx
<SpendingChart
  transactions={chartTxns}
  period={period}
  onPeriodChange={setPeriod}
  currencySymbol={currencySymbol}
  chartType={chartType}
  onChartTypeChange={handleChartTypeChange}
  offset={periodOffset}
  onOffsetChange={(delta) => setPeriodOffset((o) => Math.min(0, o + delta))}
/>
```

Note: `Math.min(0, o + delta)` prevents the offset from going above 0 (no future periods), acting as a guard even if the disabled button is somehow clicked.

- [ ] **Step 6: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 7: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/routes/Dashboard.tsx
git commit -m "feat: wire period navigation into Dashboard — all widgets follow offset"
```
