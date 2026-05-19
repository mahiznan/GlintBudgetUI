# Spending Chart — Period-Aware Windowing & Bar/Line Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Spending Chart show period-contextual trend data with zero-filled buckets, add a bar ↔ line toggle persisted in Firestore, apply gradient bars, and filter data by default currency and account.

**Architecture:** SpendingChart owns its own date windowing via `getChartDateRange`; Dashboard passes `chartTxns` (currency+account filtered, no period cutoff); chart type is read from `preference.spendingChartType` in Dashboard and persisted via `useUpdatePreference` with optimistic local state; SpendingChart is a pure rendering component.

**Tech Stack:** React, TypeScript strict, Recharts (BarChart, AreaChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer), Firestore (`setDoc` merge), Vitest + React Testing Library.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/lib/dateUtils.ts` | Modify | Add `getChartDateRange(period, now?)` |
| `src/lib/dateUtils.test.ts` | Modify | Add `getChartDateRange` unit tests |
| `src/firestore/types.ts` | Modify | Add `spendingChartType?: 'bar' \| 'line'` to `Preference` |
| `src/hooks/usePreferences.ts` | Modify | Read `raw['spendingChartType']` in `docToPreference` |
| `src/hooks/useUpdatePreference.ts` | Modify | Add `spendingChartType` to `FirestorePreferencePartial` |
| `src/components/dashboard/SpendingChart.tsx` | Rewrite | New props, toggle UI, gradient bars, line (area) chart, zero-fill bucketing |
| `src/components/dashboard/SpendingChart.test.tsx` | Modify | Update mock, add toggle + line chart tests |
| `src/routes/Dashboard.tsx` | Modify | Add `chartTxns` memo, `chartType` state, `useUpdatePreference` wiring |

---

### Task 1: Add `getChartDateRange` to `dateUtils.ts`

**Files:**
- Modify: `src/lib/dateUtils.ts`
- Modify: `src/lib/dateUtils.test.ts`

- [ ] **Step 1: Write the failing tests**

Open `src/lib/dateUtils.test.ts` and add this block after the existing `getPeriodRange` describe block:

```ts
describe('getChartDateRange', () => {
  const base = new Date('2026-05-19T12:00:00'); // Tuesday

  it('day: start = 14 days ago at 00:00, end = today at 23:59:59.999', () => {
    const { start, end } = getChartDateRange('day', base);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(4); // May
    expect(start.getDate()).toBe(5); // 19 - 14 = 5
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getDate()).toBe(19);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it('day: produces 15 distinct day-keys when bucketed', () => {
    const { start, end } = getChartDateRange('day', base);
    const days: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }
    expect(days).toHaveLength(15);
  });

  it('week: start = Monday of current week, end = Sunday', () => {
    // 2026-05-19 is Tuesday → Monday = May 18
    const { start, end } = getChartDateRange('week', base);
    expect(start.getDate()).toBe(18); // Monday May 18
    expect(start.getDay()).toBe(1);   // 1 = Monday
    expect(end.getDate()).toBe(24);   // Sunday May 24
    expect(end.getDay()).toBe(0);     // 0 = Sunday
    expect(end.getHours()).toBe(23);
  });

  it('week: end is Sunday when today is Sunday', () => {
    const sunday = new Date('2026-05-17T12:00:00'); // Sunday
    const { start, end } = getChartDateRange('week', sunday);
    expect(start.getDate()).toBe(11); // Monday May 11
    expect(end.getDate()).toBe(17);   // Sunday May 17
  });

  it('month: start = 1st of current month, end = today', () => {
    const { start, end } = getChartDateRange('month', base);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(4); // May
    expect(end.getDate()).toBe(19);
    expect(end.getHours()).toBe(23);
  });

  it('quarter: start = first day of Q2 (April 1), end = today', () => {
    // May is Q2 → starts April 1
    const { start, end } = getChartDateRange('quarter', base);
    expect(start.getMonth()).toBe(3); // April
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(19); // today
  });

  it('year: start = Jan 1, end = Dec 31', () => {
    const { start, end } = getChartDateRange('year', base);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(11);
    expect(end.getDate()).toBe(31);
    expect(end.getFullYear()).toBe(2026);
  });
});
```

Also add `getChartDateRange` to the import at the top of the test file:
```ts
import {
  getPeriodRange,
  getChartDateRange,   // ← add this
  formatCurrency,
  // ...rest unchanged
} from './dateUtils';
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- --reporter=verbose src/lib/dateUtils.test.ts
```

Expected: `getChartDateRange` tests fail with "getChartDateRange is not a function" (or similar import error).

- [ ] **Step 3: Implement `getChartDateRange` in `dateUtils.ts`**

Add this function to `src/lib/dateUtils.ts` after the existing `getPeriodRange` function:

```ts
export function getChartDateRange(
  period: Period,
  now = new Date(),
): { start: Date; end: Date } {
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case 'day':
      start.setDate(start.getDate() - 14);
      start.setHours(0, 0, 0, 0);
      break;

    case 'week': {
      const day = start.getDay(); // 0 = Sunday
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      const sunday = new Date(start);
      sunday.setDate(start.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { start, end: sunday };
    }

    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;

    case 'quarter': {
      const q = Math.floor(start.getMonth() / 3);
      start.setMonth(q * 3, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }

    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}
```

- [ ] **Step 4: Run tests — all `getChartDateRange` tests must pass**

```bash
npm run test -- --reporter=verbose src/lib/dateUtils.test.ts
```

Expected: All tests PASS, including existing `getPeriodRange` tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dateUtils.ts src/lib/dateUtils.test.ts
git commit -m "feat: add getChartDateRange for period-aware chart windowing"
```

---

### Task 2: Add `spendingChartType` to Preference types and hooks

**Files:**
- Modify: `src/firestore/types.ts`
- Modify: `src/hooks/usePreferences.ts`
- Modify: `src/hooks/useUpdatePreference.ts`

- [ ] **Step 1: Add `spendingChartType` to `Preference` in `types.ts`**

In `src/firestore/types.ts`, update the `Preference` interface. Find the `theme?: string;` line and add the new field after it:

```ts
export interface Preference {
  id: string;
  accounts: BudgetData[];
  categories: BudgetData[];
  subCategories: BudgetData[];
  vendors: BudgetData[];
  payments: BudgetData[];
  defaultCurrency: Currency;
  bookmarkedCurrencies: string[];
  defaultEntries: Record<string, string> | null;
  theme?: string;
  spendingChartType?: 'bar' | 'line';  // ← add this
}
```

- [ ] **Step 2: Read `spendingChartType` in `docToPreference`**

In `src/hooks/usePreferences.ts`, update the `docToPreference` function. Find where `theme` is read (near the end of the returned object) and add `spendingChartType`:

```ts
function docToPreference(id: string, raw: Record<string, unknown>): Preference {
  return {
    id,
    accounts: mergeWithDefaults(DEFAULT_ACCOUNTS, (raw['accounts'] as BudgetData[]) ?? []),
    categories: mergeWithDefaults(DEFAULT_CATEGORIES, (raw['categories'] as BudgetData[]) ?? []),
    subCategories: mergeWithDefaults(
      DEFAULT_SUBCATEGORIES,
      (raw['subCategories'] as BudgetData[]) ?? [],
    ),
    vendors: (raw['vendors'] as BudgetData[]) ?? [],
    payments: mergeWithDefaults(DEFAULT_PAYMENTS, (raw['payments'] as BudgetData[]) ?? []),
    defaultCurrency: (raw['default_currency'] as Preference['defaultCurrency']) ?? DEFAULT_CURRENCY,
    bookmarkedCurrencies: (raw['frequent_currencies'] as string[]) ?? [],
    defaultEntries: raw['default_entries'] !== undefined
      ? decodeDefaultEntries(raw['default_entries'])
      : DEFAULT_ENTRIES,
    theme: raw['theme'] as string | undefined,
    spendingChartType: raw['spendingChartType'] as 'bar' | 'line' | undefined,  // ← add
  };
}
```

- [ ] **Step 3: Add `spendingChartType` to `FirestorePreferencePartial`**

In `src/hooks/useUpdatePreference.ts`, add the field to the interface:

```ts
export interface FirestorePreferencePartial {
  accounts?: BudgetData[];
  categories?: BudgetData[];
  subCategories?: BudgetData[];
  vendors?: BudgetData[];
  payments?: BudgetData[];
  default_currency?: Currency;
  frequent_currencies?: string[];
  default_entries?: Record<string, string>;
  theme?: string;
  spendingChartType?: 'bar' | 'line';  // ← add this
}
```

- [ ] **Step 4: Run typecheck — no errors**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/firestore/types.ts src/hooks/usePreferences.ts src/hooks/useUpdatePreference.ts
git commit -m "feat: add spendingChartType to Preference type and hooks"
```

---

### Task 3: Rewrite `SpendingChart.tsx` + update tests

**Files:**
- Rewrite: `src/components/dashboard/SpendingChart.tsx`
- Modify: `src/components/dashboard/SpendingChart.test.tsx`

- [ ] **Step 1: Update the test file first (TDD)**

Replace the entire content of `src/components/dashboard/SpendingChart.test.tsx` with:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'lime', setTheme: vi.fn() }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Bar: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import SpendingChart from './SpendingChart';
import type { Transaction } from '../../firestore/types';

const makeTx = (date: string, amount: number): Transaction => ({
  id: date + amount,
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Groceries',
  date: new Date(date),
  account: 'HDFC',
  vendor: 'Zepto',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount,
  icon: '🛒',
});

const baseProps = {
  transactions: [makeTx('2026-05-17', -500), makeTx('2026-05-16', -300)],
  period: 'month' as const,
  currencySymbol: '₹',
  chartType: 'bar' as const,
  onChartTypeChange: vi.fn(),
};

describe('SpendingChart', () => {
  it('renders a bar chart when chartType is bar', () => {
    render(<SpendingChart {...baseProps} chartType="bar" />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
  });

  it('renders an area chart when chartType is line', () => {
    render(<SpendingChart {...baseProps} chartType="line" />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('renders the Spending section heading', () => {
    render(<SpendingChart {...baseProps} />);
    expect(screen.getByText(/spending/i)).toBeInTheDocument();
  });

  it('shows bar and line toggle buttons', () => {
    render(<SpendingChart {...baseProps} />);
    expect(screen.getByRole('button', { name: /bar chart/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /line chart/i })).toBeInTheDocument();
  });

  it('calls onChartTypeChange with "line" when line button clicked', () => {
    const onChartTypeChange = vi.fn();
    render(<SpendingChart {...baseProps} chartType="bar" onChartTypeChange={onChartTypeChange} />);
    fireEvent.click(screen.getByRole('button', { name: /line chart/i }));
    expect(onChartTypeChange).toHaveBeenCalledWith('line');
  });

  it('calls onChartTypeChange with "bar" when bar button clicked', () => {
    const onChartTypeChange = vi.fn();
    render(<SpendingChart {...baseProps} chartType="line" onChartTypeChange={onChartTypeChange} />);
    fireEvent.click(screen.getByRole('button', { name: /bar chart/i }));
    expect(onChartTypeChange).toHaveBeenCalledWith('bar');
  });

  it('excludes income transactions (positive amounts)', () => {
    render(<SpendingChart {...baseProps} transactions={[makeTx('2026-05-17', 50000)]} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders without crash for all periods', () => {
    const periods = ['day', 'week', 'month', 'quarter', 'year'] as const;
    periods.forEach((period) => {
      const { unmount } = render(<SpendingChart {...baseProps} period={period} />);
      expect(screen.getByText(/spending/i)).toBeInTheDocument();
      unmount();
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- --reporter=verbose src/components/dashboard/SpendingChart.test.tsx
```

Expected: Failures on `chartType`, `onChartTypeChange` prop not recognised, and area-chart tests.

- [ ] **Step 3: Rewrite `SpendingChart.tsx`**

Replace the entire content of `src/components/dashboard/SpendingChart.tsx` with:

```tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useMemo } from 'react';
import type { Transaction } from '../../firestore/types';
import type { Period } from '../../lib/dateUtils';
import {
  getChartDateRange,
  groupByDay,
  groupByMonth,
  formatCurrency,
} from '../../lib/dateUtils';
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';

interface SpendingChartProps {
  transactions: Transaction[];
  period: Period;
  currencySymbol: string;
  chartType: 'bar' | 'line';
  onChartTypeChange: (type: 'bar' | 'line') => void;
}

function buildChartData(
  txns: Transaction[],
  period: Period,
  now = new Date(),
): { label: string; amount: number }[] {
  const { start, end } = getChartDateRange(period, now);

  const expenses = txns
    .filter((t) => t.date >= start && t.date <= end && t.amount < 0)
    .map((t) => ({ ...t, amount: Math.abs(t.amount) }));

  if (period === 'day' || period === 'week' || period === 'month') {
    const dayCount =
      period === 'day'
        ? 15
        : period === 'week'
          ? 7
          : Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const buckets = Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const label =
        period === 'week'
          ? d.toLocaleDateString('en-US', { weekday: 'short' })
          : period === 'month'
            ? String(d.getDate())
            : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { label, amount: 0 };
    });

    const grouped = groupByDay(expenses);
    buckets.forEach((b, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      b.amount = grouped[d.toISOString().slice(0, 10)] ?? 0;
    });
    return buckets;
  }

  if (period === 'quarter') {
    const qMonth = start.getMonth();
    const year = start.getFullYear();
    const buckets = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(year, qMonth + i, 1);
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        amount: 0,
      };
    });
    const grouped = groupByMonth(expenses);
    buckets.forEach((b, i) => {
      const key = `${year}-${String(qMonth + i + 1).padStart(2, '0')}`;
      b.amount = grouped[key] ?? 0;
    });
    return buckets;
  }

  // year → 12 monthly buckets
  const year = start.getFullYear();
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, i, 1);
    return { label: d.toLocaleDateString('en-US', { month: 'short' }), amount: 0 };
  });
  const grouped = groupByMonth(expenses);
  buckets.forEach((b, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    b.amount = grouped[key] ?? 0;
  });
  return buckets;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  symbol,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  symbol: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-surface rounded-lg px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-text">{label}</p>
      <p className="text-brand font-mono">{formatCurrency(payload[0]!.value, symbol)}</p>
    </div>
  );
};

export default function SpendingChart({
  transactions,
  period,
  currencySymbol,
  chartType,
  onChartTypeChange,
}: SpendingChartProps) {
  const { themeId } = useTheme();
  const theme = getTheme(themeId);
  const data = useMemo(() => buildChartData(transactions, period), [transactions, period]);

  const tickInterval = period === 'day' ? 4 : period === 'month' ? 4 : 0;

  const axisProps = {
    dataKey: 'label',
    tick: { fontSize: 10, fill: '#475569' },
    axisLine: false,
    tickLine: false,
    interval: tickInterval,
  } as const;

  const yAxisProps = {
    tick: { fontSize: 10, fill: '#475569' },
    axisLine: false,
    tickLine: false,
  } as const;

  const gradientId = 'spendBarGradient';
  const areaGradientId = 'spendAreaGradient';

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
          Spending
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => onChartTypeChange('bar')}
            aria-label="Bar chart"
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              chartType === 'bar'
                ? 'bg-brand text-white'
                : 'bg-surface-alt text-text-muted hover:text-text'
            }`}
          >
            ▬
          </button>
          <button
            onClick={() => onChartTypeChange('line')}
            aria-label="Line chart"
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              chartType === 'line'
                ? 'bg-brand text-white'
                : 'bg-surface-alt text-text-muted hover:text-text'
            }`}
          >
            ∿
          </button>
        </div>
      </div>

      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.chartColor} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={theme.chartColor} stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis {...axisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip content={<CustomTooltip symbol={currencySymbol} />} />
              <Bar
                dataKey="amount"
                radius={[4, 4, 0, 0] as [number, number, number, number]}
                fill={`url(#${gradientId})`}
              />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.chartColor} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={theme.chartColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis {...axisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip content={<CustomTooltip symbol={currencySymbol} />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={theme.chartColor}
                strokeWidth={2}
                fill={`url(#${areaGradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: theme.chartColor }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
npm run test -- --reporter=verbose src/components/dashboard/SpendingChart.test.tsx
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Run typecheck — no errors**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/SpendingChart.tsx src/components/dashboard/SpendingChart.test.tsx
git commit -m "feat: rewrite SpendingChart with period windowing, gradient bars, and line toggle"
```

---

### Task 4: Wire up Dashboard.tsx

**Files:**
- Modify: `src/routes/Dashboard.tsx`

- [ ] **Step 1: Add imports**

In `src/routes/Dashboard.tsx`, find the existing import block and add:
```ts
import { useState, useMemo, useEffect, useRef } from 'react';  // add useRef
import { useUpdatePreference } from '../hooks/useUpdatePreference';  // add this line
```

Also add `getChartDateRange` is NOT needed here — Dashboard delegates windowing to SpendingChart. No dateUtils change needed for Dashboard.

- [ ] **Step 2: Add `useUpdatePreference`, `chartTxns`, and chart type state**

In `src/routes/Dashboard.tsx`, find the block near the top of the `Dashboard` function where hooks are called (after `useDeleteTransaction`). Add these after the existing `const { mutate: deleteTx }` line:

```ts
const { mutate: updatePreference } = useUpdatePreference(uid);

// chartType: seeded from Firestore preference on first load, then managed locally for instant toggle
const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
const chartTypeSynced = useRef(false);

useEffect(() => {
  if (!chartTypeSynced.current && preference) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChartType(preference.spendingChartType ?? 'bar');
    chartTypeSynced.current = true;
  }
}, [preference]);
```

- [ ] **Step 3: Add `chartTxns` memo**

In `src/routes/Dashboard.tsx`, find the `heroTxns` memo (around line 49). Add `chartTxns` right after it:

```ts
const chartTxns = useMemo(
  () =>
    allTxns.filter(
      (t) =>
        t.currency === defaultCurrencyCode &&
        (defaultAccount === '' || t.account === defaultAccount),
    ),
  [allTxns, defaultCurrencyCode, defaultAccount],
);
```

Note: `chartTxns` is identical to `heroTxns` in filtering criteria **but not period-filtered**. This is intentional — SpendingChart applies its own date window via `getChartDateRange`.

- [ ] **Step 4: Add `handleChartTypeChange`**

In `src/routes/Dashboard.tsx`, find the `handleModeChange` function. Add `handleChartTypeChange` after it:

```ts
async function handleChartTypeChange(type: 'bar' | 'line') {
  setChartType(type);
  await updatePreference({ spendingChartType: type });
}
```

- [ ] **Step 5: Update the `SpendingChart` JSX call**

In `src/routes/Dashboard.tsx`, find the `<SpendingChart ... />` call (currently passing `transactions={periodTxns}`). Replace it:

```tsx
<SpendingChart
  transactions={chartTxns}
  period={period}
  currencySymbol={currencySymbol}
  chartType={chartType}
  onChartTypeChange={handleChartTypeChange}
/>
```

- [ ] **Step 6: Run typecheck — no errors**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 7: Run full test suite**

```bash
npm run test
```

Expected: All tests pass.

- [ ] **Step 8: Run lint**

```bash
npm run lint
```

Expected: No errors. If the `eslint-disable` comment on `setChartType` in the effect triggers a lint error, verify it matches the existing suppression pattern used in the codebase (`// eslint-disable-next-line react-hooks/set-state-in-effect`).

- [ ] **Step 9: Commit**

```bash
git add src/routes/Dashboard.tsx
git commit -m "feat: wire SpendingChart chartTxns and bar/line toggle persistence in Dashboard"
```

---

## Done

All four tasks complete. Verify end-to-end in the browser:

1. `npm run dev` — open http://localhost:5173
2. Sign in, navigate to Dashboard
3. Toggle bar/line — chart switches instantly
4. Refresh page — chart type restores from Firestore
5. Switch period selector: Day shows 15 daily bars, Week shows 7 days (Mon-Sun), Month shows days from 1st, Quarter shows 3 months, Year shows 12 months
6. Bars use amber gradient; line chart shows amber area fill
