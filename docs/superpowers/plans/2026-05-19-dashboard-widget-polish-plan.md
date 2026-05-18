# Dashboard Widget Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a red gradient to the Expense toggle button, replace the Income vs Expenses donut with a category-breakdown donut that syncs with the BY CATEGORY mode switcher, and apply the default currency+account filter to QuickStats.

**Architecture:** `categoryMode` state and `categoryItems` computation lift from CategoryBreakdown into Dashboard, making both CategoryBreakdown (bar chart) and IncomeExpenseDonut (pie chart) pure display components fed by the same data. QuickStats switches from `periodTxns` to the already-computed `heroTxns`. All three changes are independent commits.

**Tech Stack:** React + TypeScript, Vite, Tailwind CSS v4, Recharts, Vitest + React Testing Library

---

### Task 1: Add `--expense-gradient` CSS variable

**Files:**
- Modify: `src/styles/index.css`

- [ ] **Step 1: Add the gradient variable to `:root`**

In `src/styles/index.css`, find the `:root` block and add `--expense-gradient` after `--brand-gradient` (around line 27):

```css
:root {
  --sidebar-gradient:    linear-gradient(180deg, rgb(80,120,0) 0%, rgb(150,191,13) 60%, #22c55e 100%);
  --hero-gradient:       linear-gradient(120deg, rgb(80,120,0) 0%, rgb(150,191,13) 40%, #22c55e 70%, #ecfccb 100%);
  --hero-text-gradient:  linear-gradient(135deg, #ffffff 0%, #ecfccb 60%, rgb(150,191,13) 100%);
  --brand-gradient:      linear-gradient(135deg, rgb(150,191,13), #22c55e);
  --expense-gradient:    linear-gradient(135deg, #f87171, #dc2626);
  --brand-glow:          rgba(150,191,13,0.45);
  --brand-gradient-text: linear-gradient(135deg, rgb(150,191,13), #22c55e);
}
```

The `--expense-gradient` line is the only addition. All other `:root` lines remain unchanged.

- [ ] **Step 2: Commit**

```bash
git add src/styles/index.css
git commit -m "feat: add expense-gradient CSS variable"
```

---

### Task 2: Refactor CategoryBreakdown to accept props + lift state to Dashboard

**Files:**
- Modify: `src/components/dashboard/CategoryBreakdown.tsx`
- Modify: `src/components/dashboard/CategoryBreakdown.test.tsx`
- Modify: `src/routes/Dashboard.tsx`

- [ ] **Step 1: Replace CategoryBreakdown.test.tsx with failing tests for the new interface**

Replace the entire contents of `src/components/dashboard/CategoryBreakdown.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'lime', setTheme: vi.fn() }),
}));

import CategoryBreakdown from './CategoryBreakdown';
import type { CategoryItem } from './CategoryBreakdown';

const makeCategory = (name: string, total: number, pct: number): CategoryItem => ({
  name,
  icon: '🛒',
  total,
  pct,
});

describe('CategoryBreakdown', () => {
  it('renders By Category heading', () => {
    render(
      <CategoryBreakdown categories={[]} mode="expense" onModeChange={vi.fn()} currencySymbol="₹" />
    );
    expect(screen.getByText(/by category/i)).toBeInTheDocument();
  });

  it('renders Expense and Income toggle buttons', () => {
    render(
      <CategoryBreakdown categories={[]} mode="expense" onModeChange={vi.fn()} currencySymbol="₹" />
    );
    expect(screen.getByRole('button', { name: /expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument();
  });

  it('active expense button uses expense gradient, not bg-red-600', () => {
    render(
      <CategoryBreakdown categories={[]} mode="expense" onModeChange={vi.fn()} currencySymbol="₹" />
    );
    const btn = screen.getByRole('button', { name: /expense/i });
    expect(btn).not.toHaveClass('bg-red-600');
    expect(btn.style.background).toBe('var(--expense-gradient)');
  });

  it('active income button uses brand gradient', () => {
    render(
      <CategoryBreakdown categories={[]} mode="income" onModeChange={vi.fn()} currencySymbol="₹" />
    );
    const btn = screen.getByRole('button', { name: /income/i });
    expect(btn.style.background).toBe('var(--brand-gradient)');
  });

  it('renders provided categories', () => {
    const cats = [makeCategory('Food', 1500, 60), makeCategory('Transport', 600, 24)];
    render(
      <CategoryBreakdown categories={cats} mode="expense" onModeChange={vi.fn()} currencySymbol="₹" />
    );
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('calls onModeChange with "income" when Income button is clicked', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(
      <CategoryBreakdown categories={[]} mode="expense" onModeChange={onModeChange} currencySymbol="₹" />
    );
    await user.click(screen.getByRole('button', { name: /income/i }));
    expect(onModeChange).toHaveBeenCalledWith('income');
  });

  it('shows expense empty state when mode is expense and categories is empty', () => {
    render(
      <CategoryBreakdown categories={[]} mode="expense" onModeChange={vi.fn()} currencySymbol="₹" />
    );
    expect(screen.getByText(/no expenses for this period/i)).toBeInTheDocument();
  });

  it('shows income empty state when mode is income and categories is empty', () => {
    render(
      <CategoryBreakdown categories={[]} mode="income" onModeChange={vi.fn()} currencySymbol="₹" />
    );
    expect(screen.getByText(/no income for this period/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm failures**

```bash
npm test -- --reporter=verbose src/components/dashboard/CategoryBreakdown.test.tsx
```

Expected: multiple FAIL — the new tests use `CategoryItem` type and `mode`/`onModeChange` props that don't exist yet.

- [ ] **Step 3: Replace CategoryBreakdown.tsx with the new implementation**

Replace the entire contents of `src/components/dashboard/CategoryBreakdown.tsx`:

```tsx
import { formatCurrency } from '../../lib/dateUtils';
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';

export interface CategoryItem {
  name: string;
  icon: string;
  total: number;
  pct: number;
}

type Mode = 'expense' | 'income';

interface CategoryBreakdownProps {
  categories: CategoryItem[];
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  currencySymbol: string;
}

export default function CategoryBreakdown({ categories, mode, onModeChange, currencySymbol }: CategoryBreakdownProps) {
  const { themeId } = useTheme();
  const theme = getTheme(themeId);

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">By Category</h2>
        <div className="inline-flex rounded-lg border border-border bg-surface-alt p-0.5 gap-0.5">
          {(['expense', 'income'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={[
                'rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all',
                mode === m ? 'text-white shadow-sm' : 'text-text-muted hover:text-text',
              ].join(' ')}
              style={
                mode === m
                  ? { background: m === 'expense' ? 'var(--expense-gradient)' : 'var(--brand-gradient)' }
                  : undefined
              }
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      {categories.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">
          No {mode === 'expense' ? 'expenses' : 'income'} for this period
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map(({ name, icon, total, pct }, i) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-lg w-6 text-center">{icon || '📦'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-text truncate">{name}</span>
                  <span className="text-xs text-text-muted ml-2 flex-shrink-0">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: theme.categoryColors[i % theme.categoryColors.length]! }}
                  />
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-text flex-shrink-0">
                {formatCurrency(total, currencySymbol)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update Dashboard.tsx to own categoryMode state and categoryItems computation**

Replace the entire contents of `src/routes/Dashboard.tsx`:

```tsx
import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useTransactions } from '../hooks/useTransactions';
import { useDeleteTransaction } from '../hooks/useMutateTransaction';
import { filterByPeriod } from '../lib/dateUtils';
import type { AppShellOutletContext } from './AppShell';
import HeroStatsRow from '../components/dashboard/HeroStatsRow';
import SpendingChart from '../components/dashboard/SpendingChart';
import CategoryBreakdown from '../components/dashboard/CategoryBreakdown';
import IncomeExpenseDonut from '../components/dashboard/IncomeExpenseDonut';
import DailyTransactions from '../components/dashboard/DailyTransactions';
import QuickStats from '../components/dashboard/QuickStats';
import DeleteConfirmDialog from '../components/transactions/DeleteConfirmDialog';

export default function Dashboard() {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { period } = useOutletContext<AppShellOutletContext>();
  const { preference } = usePreferenceContext();
  const { data: allTxns, loading, error, refetch } = useTransactions({ uid, limit: 200 });
  const { mutate: deleteTx } = useDeleteTransaction();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categoryMode, setCategoryMode] = useState<'expense' | 'income'>('expense');

  const currencySymbol = preference?.defaultCurrency.symbol ?? '₹';
  const defaultCurrencyCode = preference?.defaultCurrency.code ?? '';
  const defaultAccount = preference?.defaultEntries?.['account'] ?? '';

  const periodTxns = useMemo(() => filterByPeriod(allTxns, period), [allTxns, period]);

  const heroTxns = useMemo(
    () =>
      periodTxns.filter(
        (t) =>
          t.currency === defaultCurrencyCode &&
          (defaultAccount === '' || t.account === defaultAccount),
      ),
    [periodTxns, defaultCurrencyCode, defaultAccount],
  );

  const totalIncome = useMemo(
    () => heroTxns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [heroTxns],
  );
  const totalExpenses = useMemo(
    () => Math.abs(heroTxns.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
    [heroTxns],
  );

  const categoryItems = useMemo(() => {
    const filtered =
      categoryMode === 'expense'
        ? heroTxns.filter((t) => t.amount < 0)
        : heroTxns.filter((t) => t.amount > 0);
    const totals = filtered.reduce<Record<string, { total: number; icon: string }>>(
      (acc, t) => {
        if (!acc[t.category]) acc[t.category] = { total: 0, icon: t.icon };
        acc[t.category]!.total += Math.abs(t.amount);
        return acc;
      },
      {},
    );
    const sum = Object.values(totals).reduce((s, { total }) => s + total, 0);
    return Object.entries(totals)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5)
      .map(([name, { total, icon }]) => ({
        name,
        icon,
        total,
        pct: sum > 0 ? Math.round((total / sum) * 100) : 0,
      }));
  }, [heroTxns, categoryMode]);

  async function handleDelete(id: string) {
    setDeletingId(null);
    await deleteTx(id);
    refetch();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted" role="status">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700" role="alert">
        Couldn't load transactions.{' '}
        <button className="underline ml-1" onClick={refetch}>Retry</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <HeroStatsRow
        totalExpenses={totalExpenses}
        totalIncome={totalIncome}
        currencySymbol={currencySymbol}
      />

      <div className="p-6 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <SpendingChart transactions={periodTxns} period={period} currencySymbol={currencySymbol} />
        </div>
        <CategoryBreakdown
          categories={categoryItems}
          mode={categoryMode}
          onModeChange={setCategoryMode}
          currencySymbol={currencySymbol}
        />

        <div className="col-span-2 flex flex-col gap-4">
          <DailyTransactions
            transactions={allTxns}
            currencySymbol={currencySymbol}
            onDelete={(id) => setDeletingId(id)}
          />
        </div>
        <div className="flex flex-col gap-4">
          <IncomeExpenseDonut income={totalIncome} expenses={totalExpenses} currencySymbol={currencySymbol} />
          <QuickStats transactions={periodTxns} currencySymbol={currencySymbol} />
        </div>
      </div>

      {deletingId && (
        <DeleteConfirmDialog
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
```

Note: `IncomeExpenseDonut` still uses the old `income`/`expenses` props here — Task 3 will update it.

- [ ] **Step 5: Run tests and verify they all pass**

```bash
npm test -- --reporter=verbose src/components/dashboard/CategoryBreakdown.test.tsx
```

Expected: all 8 tests PASS.

Then run the full suite:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/CategoryBreakdown.tsx src/components/dashboard/CategoryBreakdown.test.tsx src/routes/Dashboard.tsx
git commit -m "feat: refactor CategoryBreakdown to accept categories as props with gradient toggle"
```

---

### Task 3: IncomeExpenseDonut category slices

**Files:**
- Modify: `src/components/dashboard/IncomeExpenseDonut.tsx`
- Modify: `src/components/dashboard/IncomeExpenseDonut.test.tsx`
- Modify: `src/routes/Dashboard.tsx`

- [ ] **Step 1: Replace IncomeExpenseDonut.test.tsx with failing tests for the new interface**

Replace the entire contents of `src/components/dashboard/IncomeExpenseDonut.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'lime', setTheme: vi.fn() }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
}));

import IncomeExpenseDonut from './IncomeExpenseDonut';
import type { CategoryItem } from './CategoryBreakdown';

const makeCategory = (name: string, total: number, pct: number): CategoryItem => ({
  name,
  icon: '🛒',
  total,
  pct,
});

describe('IncomeExpenseDonut', () => {
  it('renders the pie chart', () => {
    render(
      <IncomeExpenseDonut categories={[makeCategory('Food', 1500, 100)]} mode="expense" currencySymbol="₹" />
    );
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('shows "Expense by Category" title in expense mode', () => {
    render(
      <IncomeExpenseDonut categories={[]} mode="expense" currencySymbol="₹" />
    );
    expect(screen.getByText(/expense by category/i)).toBeInTheDocument();
  });

  it('shows "Income by Category" title in income mode', () => {
    render(
      <IncomeExpenseDonut categories={[]} mode="income" currencySymbol="₹" />
    );
    expect(screen.getByText(/income by category/i)).toBeInTheDocument();
  });

  it('renders a legend entry for each category', () => {
    const cats = [makeCategory('Food', 1500, 60), makeCategory('Transport', 600, 24)];
    render(
      <IncomeExpenseDonut categories={cats} mode="expense" currencySymbol="₹" />
    );
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('shows expense empty state when no categories and mode is expense', () => {
    render(
      <IncomeExpenseDonut categories={[]} mode="expense" currencySymbol="₹" />
    );
    expect(screen.getByText(/no expenses for this period/i)).toBeInTheDocument();
  });

  it('shows income empty state when no categories and mode is income', () => {
    render(
      <IncomeExpenseDonut categories={[]} mode="income" currencySymbol="₹" />
    );
    expect(screen.getByText(/no income for this period/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm failures**

```bash
npm test -- --reporter=verbose src/components/dashboard/IncomeExpenseDonut.test.tsx
```

Expected: multiple FAIL — `IncomeExpenseDonut` still accepts `income`/`expenses` props, not `categories`/`mode`.

- [ ] **Step 3: Replace IncomeExpenseDonut.tsx with the new implementation**

Replace the entire contents of `src/components/dashboard/IncomeExpenseDonut.tsx`:

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../lib/dateUtils';
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';
import type { CategoryItem } from './CategoryBreakdown';

interface IncomeExpenseDonutProps {
  categories: CategoryItem[];
  mode: 'expense' | 'income';
  currencySymbol: string;
}

export default function IncomeExpenseDonut({ categories, mode, currencySymbol }: IncomeExpenseDonutProps) {
  const { themeId } = useTheme();
  const theme = getTheme(themeId);
  const total = categories.reduce((s, c) => s + c.total, 0);
  const title = mode === 'expense' ? 'Expense by Category' : 'Income by Category';

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
        {title}
      </h2>
      {categories.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">
          No {mode === 'expense' ? 'expenses' : 'income'} for this period
        </p>
      ) : (
        <>
          <div className="relative" style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="total"
                  nameKey="name"
                  strokeWidth={0}
                >
                  {categories.map((_, i) => (
                    <Cell key={i} fill={theme.categoryColors[i % theme.categoryColors.length]!} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: unknown) => formatCurrency(v as number, currencySymbol)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xl font-bold text-text">{formatCurrency(total, currencySymbol)}</p>
                <p className="text-xs text-text-muted">{mode === 'expense' ? 'expenses' : 'income'}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
            {categories.map(({ name }, i) => (
              <span key={name} className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: theme.categoryColors[i % theme.categoryColors.length] }}
                />
                <span className="font-semibold text-text">{name}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update the IncomeExpenseDonut call in Dashboard.tsx**

In `src/routes/Dashboard.tsx`, find this line:

```tsx
          <IncomeExpenseDonut income={totalIncome} expenses={totalExpenses} currencySymbol={currencySymbol} />
```

Replace it with:

```tsx
          <IncomeExpenseDonut categories={categoryItems} mode={categoryMode} currencySymbol={currencySymbol} />
```

No other changes to Dashboard.tsx.

- [ ] **Step 5: Run IncomeExpenseDonut tests and verify they pass**

```bash
npm test -- --reporter=verbose src/components/dashboard/IncomeExpenseDonut.test.tsx
```

Expected: all 6 tests PASS.

- [ ] **Step 6: Run typecheck and full suite**

```bash
npm run typecheck && npm test
```

Expected: no type errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/IncomeExpenseDonut.tsx src/components/dashboard/IncomeExpenseDonut.test.tsx src/routes/Dashboard.tsx
git commit -m "feat: IncomeExpenseDonut now shows category breakdown synced with mode switcher"
```

---

### Task 4: QuickStats currency and account filter

**Files:**
- Modify: `src/routes/Dashboard.tsx` (one line)

- [ ] **Step 1: Update the QuickStats prop in Dashboard.tsx**

In `src/routes/Dashboard.tsx`, find:

```tsx
          <QuickStats transactions={periodTxns} currencySymbol={currencySymbol} />
```

Change it to:

```tsx
          <QuickStats transactions={heroTxns} currencySymbol={currencySymbol} />
```

No other changes. `heroTxns` is already computed earlier in the file.

- [ ] **Step 2: Run typecheck and full test suite**

```bash
npm run typecheck && npm test
```

Expected: no type errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Dashboard.tsx
git commit -m "fix: apply default currency and account filter to QuickStats"
```
