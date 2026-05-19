# Category Drill-Down Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the "By Category" widget to show all categories and support three-level drill-down (categories → subcategories → transactions), with the donut chart staying in sync at every level.

**Architecture:** Drill state (`DrillState` discriminated union) lives in `Dashboard` alongside `categoryMode`. `categoryItems` is recomputed from `heroTxns` based on the current drill level. `CategoryBreakdown` receives new optional props for header navigation and transaction rendering; `IncomeExpenseDonut` needs no changes.

**Tech Stack:** React, TypeScript strict, Tailwind CSS v4, React Router v7, Vitest + React Testing Library.

---

## File Map

| File | Change |
|------|--------|
| `src/components/dashboard/CategoryBreakdown.tsx` | Add drill-level header, back button, transaction-row rendering mode |
| `src/components/dashboard/CategoryBreakdown.test.tsx` | Add tests for onItemClick, back button, level-2 transactions |
| `src/routes/Dashboard.tsx` | Add `DrillState`, rewrite `categoryItems` memo, add `drillTransactions` memo, pass new props |

---

## Task 1: Write failing tests for CategoryBreakdown drill-down

**Files:**
- Modify: `src/components/dashboard/CategoryBreakdown.test.tsx`

- [ ] **Step 1.1: Add drill-down tests to the existing test file**

Append the following `describe` block at the bottom of `src/components/dashboard/CategoryBreakdown.test.tsx`, after the existing `describe('CategoryBreakdown', ...)` block. The top of the file already has `vi.mock('../../context/ThemeContext', ...)` — keep it as-is.

Add this import at the top of the file (after the existing imports):

```typescript
import { MemoryRouter } from 'react-router-dom';
import type { Transaction } from '../../firestore/types';
```

Then add this block at the bottom of the file:

```typescript
const makeTxn = (id: string, vendor: string, date: Date): Transaction => ({
  id,
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Dining Out',
  date,
  account: 'HDFC',
  vendor,
  payment: 'Card',
  currency: 'INR',
  notes: '',
  amount: -500,
  icon: '🍕',
});

describe('CategoryBreakdown — drill-down', () => {
  it('calls onItemClick with category name when a row is clicked', async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    const cats = [makeCategory('Food', 1500, 60)];
    render(
      <CategoryBreakdown
        categories={cats}
        mode="expense"
        onModeChange={vi.fn()}
        currencySymbol="₹"
        onItemClick={onItemClick}
      />
    );
    await user.click(screen.getByText('Food'));
    expect(onItemClick).toHaveBeenCalledWith('Food');
  });

  it('shows back button with backLabel at level 1', () => {
    render(
      <CategoryBreakdown
        categories={[makeCategory('Dining Out', 2700, 60)]}
        mode="expense"
        onModeChange={vi.fn()}
        currencySymbol="₹"
        drillLevel={1}
        drillLabel="Food"
        backLabel="← Back"
        onBack={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /← Back/i })).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked at level 1', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <CategoryBreakdown
        categories={[makeCategory('Dining Out', 2700, 60)]}
        mode="expense"
        onModeChange={vi.fn()}
        currencySymbol="₹"
        drillLevel={1}
        drillLabel="Food"
        backLabel="← Back"
        onBack={onBack}
      />
    );
    await user.click(screen.getByRole('button', { name: /← Back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('hides mode toggle at level 2', () => {
    const txns = [makeTxn('t1', 'Pizza Hut', new Date())];
    render(
      <MemoryRouter>
        <CategoryBreakdown
          categories={[makeCategory('Dining Out', 500, 100)]}
          mode="expense"
          onModeChange={vi.fn()}
          currencySymbol="₹"
          drillLevel={2}
          drillLabel="Dining Out"
          backLabel="← Food"
          onBack={vi.fn()}
          transactions={txns}
        />
      </MemoryRouter>
    );
    expect(screen.queryByRole('button', { name: /expense/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /income/i })).not.toBeInTheDocument();
  });

  it('renders transaction vendor names at level 2', () => {
    const txns = [
      makeTxn('t1', 'Pizza Hut', new Date('2026-05-18')),
      makeTxn('t2', "Domino's", new Date('2026-05-15')),
    ];
    render(
      <MemoryRouter>
        <CategoryBreakdown
          categories={[makeCategory('Dining Out', 1000, 100)]}
          mode="expense"
          onModeChange={vi.fn()}
          currencySymbol="₹"
          drillLevel={2}
          drillLabel="Dining Out"
          backLabel="← Food"
          onBack={vi.fn()}
          transactions={txns}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Pizza Hut')).toBeInTheDocument();
    expect(screen.getByText("Domino's")).toBeInTheDocument();
  });

  it('transaction rows link to the edit form at level 2', () => {
    const txns = [makeTxn('txn-abc', 'Pizza Hut', new Date())];
    render(
      <MemoryRouter>
        <CategoryBreakdown
          categories={[makeCategory('Dining Out', 500, 100)]}
          mode="expense"
          onModeChange={vi.fn()}
          currencySymbol="₹"
          drillLevel={2}
          drillLabel="Dining Out"
          backLabel="← Food"
          onBack={vi.fn()}
          transactions={txns}
        />
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: /Pizza Hut/i });
    expect(link).toHaveAttribute('href', '/app/transactions/txn-abc/edit');
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
npm run test -- CategoryBreakdown
```

Expected: The 6 new tests fail with errors like `TypeError: onItemClick is not a function` or unexpected missing elements. The existing 7 tests still pass.

---

## Task 2: Implement drill-down UI in CategoryBreakdown

**Files:**
- Modify: `src/components/dashboard/CategoryBreakdown.tsx`

- [ ] **Step 2.1: Replace the full contents of CategoryBreakdown.tsx**

```typescript
import { Link } from 'react-router-dom';
import { formatCurrency, formatDateShort } from '../../lib/dateUtils';
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';
import type { Transaction } from '../../firestore/types';

export interface CategoryItem {
  name: string;
  icon: string;
  total: number;
  pct: number;
}

export type Mode = 'expense' | 'income';

interface CategoryBreakdownProps {
  categories: CategoryItem[];
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  currencySymbol: string;
  drillLevel?: 0 | 1 | 2;
  drillLabel?: string;
  backLabel?: string;
  onItemClick?: (name: string) => void;
  onBack?: () => void;
  transactions?: Transaction[];
}

export default function CategoryBreakdown({
  categories,
  mode,
  onModeChange,
  currencySymbol,
  drillLevel = 0,
  drillLabel,
  backLabel,
  onItemClick,
  onBack,
  transactions,
}: CategoryBreakdownProps) {
  const { themeId } = useTheme();
  const theme = getTheme(themeId);

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {drillLevel > 0 ? (
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-text-muted hover:text-text transition-colors flex-shrink-0"
            >
              {backLabel}
            </button>
            <span className="text-sm font-semibold text-text truncate">{drillLabel}</span>
          </div>
        ) : (
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">By Category</h2>
        )}
        {drillLevel < 2 && (
          <div className="inline-flex rounded-lg border border-border bg-surface-alt p-0.5 gap-0.5 flex-shrink-0">
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
        )}
      </div>

      {drillLevel === 2 && transactions ? (
        transactions.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No transactions</p>
        ) : (
          <div className="flex flex-col gap-1">
            {transactions.map((t) => (
              <Link
                key={t.id}
                to={`/app/transactions/${t.id}/edit`}
                className="flex items-center gap-3 px-1 py-2 rounded-xl hover:bg-surface-alt transition-colors"
              >
                <span className="text-lg w-6 text-center">{t.icon || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-text truncate block">{t.vendor}</span>
                  <span className="text-xs text-text-muted">{formatDateShort(t.date)}</span>
                </div>
                <span
                  className={`text-xs font-mono font-semibold flex-shrink-0 ${
                    t.amount < 0 ? 'text-red-500' : 'text-green-600'
                  }`}
                >
                  {t.amount < 0 ? '-' : '+'}
                  {formatCurrency(Math.abs(t.amount), currencySymbol)}
                </span>
              </Link>
            ))}
          </div>
        )
      ) : categories.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">
          No {mode === 'expense' ? 'expenses' : 'income'} for this period
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map(({ name, icon, total, pct }, i) => (
            <div
              key={name}
              className={`flex items-center gap-3 ${
                onItemClick
                  ? 'cursor-pointer rounded-xl px-1 py-0.5 hover:bg-surface-alt transition-colors'
                  : ''
              }`}
              onClick={() => onItemClick?.(name)}
            >
              <span className="text-lg w-6 text-center">{icon || '📦'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-text truncate">{name}</span>
                  <span className="text-xs text-text-muted ml-2 flex-shrink-0">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: theme.categoryColors[i % theme.categoryColors.length]!,
                    }}
                  />
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-text flex-shrink-0">
                {formatCurrency(total, currencySymbol)}
              </span>
              {onItemClick && <span className="text-text-muted text-xs flex-shrink-0">›</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2.2: Run tests to verify all pass**

```bash
npm run test -- CategoryBreakdown
```

Expected: All 13 tests pass (7 existing + 6 new).

- [ ] **Step 2.3: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 2.4: Commit**

```bash
git add src/components/dashboard/CategoryBreakdown.tsx src/components/dashboard/CategoryBreakdown.test.tsx
git commit -m "feat: add drill-down props and transaction-row mode to CategoryBreakdown"
```

---

## Task 3: Wire drill state and data computation in Dashboard

**Files:**
- Modify: `src/routes/Dashboard.tsx`

- [ ] **Step 3.1: Replace the full contents of Dashboard.tsx**

```typescript
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
import CategoryBreakdown, { type Mode as CategoryMode } from '../components/dashboard/CategoryBreakdown';
import IncomeExpenseDonut from '../components/dashboard/IncomeExpenseDonut';
import DailyTransactions from '../components/dashboard/DailyTransactions';
import QuickStats from '../components/dashboard/QuickStats';
import DeleteConfirmDialog from '../components/transactions/DeleteConfirmDialog';

type DrillState =
  | { level: 0 }
  | { level: 1; category: string }
  | { level: 2; category: string; subCategory: string };

export default function Dashboard() {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { period } = useOutletContext<AppShellOutletContext>();
  const { preference } = usePreferenceContext();
  const { data: allTxns, loading, error, refetch } = useTransactions({ uid, limit: 200 });
  const { mutate: deleteTx } = useDeleteTransaction();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categoryMode, setCategoryMode] = useState<CategoryMode>('expense');
  const [drillState, setDrillState] = useState<DrillState>({ level: 0 });

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

  function handleModeChange(mode: CategoryMode) {
    setCategoryMode(mode);
    setDrillState({ level: 0 });
  }

  const categoryItems = useMemo(() => {
    const filtered =
      categoryMode === 'expense'
        ? heroTxns.filter((t) => t.amount < 0)
        : heroTxns.filter((t) => t.amount > 0);

    if (drillState.level === 0) {
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
        .map(([name, { total, icon }]) => ({
          name,
          icon,
          total,
          pct: sum > 0 ? Math.round((total / sum) * 100) : 0,
        }));
    }

    if (drillState.level === 1) {
      const catTxns = filtered.filter((t) => t.category === drillState.category);
      const totals = catTxns.reduce<Record<string, { total: number; icon: string }>>(
        (acc, t) => {
          if (!acc[t.subCategory]) acc[t.subCategory] = { total: 0, icon: t.icon };
          acc[t.subCategory]!.total += Math.abs(t.amount);
          return acc;
        },
        {},
      );
      const sum = Object.values(totals).reduce((s, { total }) => s + total, 0);
      return Object.entries(totals)
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([name, { total, icon }]) => ({
          name,
          icon,
          total,
          pct: sum > 0 ? Math.round((total / sum) * 100) : 0,
        }));
    }

    // level 2: single item at 100% for the donut
    const subcatTxns = filtered.filter(
      (t) => t.category === drillState.category && t.subCategory === drillState.subCategory,
    );
    const total = subcatTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
    const icon = subcatTxns[0]?.icon ?? '📦';
    return [{ name: drillState.subCategory, icon, total, pct: 100 }];
  }, [heroTxns, categoryMode, drillState]);

  const drillTransactions = useMemo(() => {
    if (drillState.level !== 2) return [];
    const filtered =
      categoryMode === 'expense'
        ? heroTxns.filter((t) => t.amount < 0)
        : heroTxns.filter((t) => t.amount > 0);
    return filtered
      .filter(
        (t) => t.category === drillState.category && t.subCategory === drillState.subCategory,
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [heroTxns, categoryMode, drillState]);

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
          onModeChange={handleModeChange}
          currencySymbol={currencySymbol}
          drillLevel={drillState.level}
          drillLabel={
            drillState.level === 1
              ? drillState.category
              : drillState.level === 2
                ? drillState.subCategory
                : undefined
          }
          backLabel={
            drillState.level === 1
              ? '← Back'
              : drillState.level === 2
                ? `← ${drillState.category}`
                : undefined
          }
          onBack={
            drillState.level === 1
              ? () => setDrillState({ level: 0 })
              : drillState.level === 2
                ? () => setDrillState({ level: 1, category: drillState.category })
                : undefined
          }
          onItemClick={(name) => {
            if (drillState.level === 0) {
              setDrillState({ level: 1, category: name });
            } else if (drillState.level === 1) {
              setDrillState({ level: 2, category: drillState.category, subCategory: name });
            }
          }}
          transactions={drillState.level === 2 ? drillTransactions : undefined}
        />

        <div className="col-span-2 flex flex-col gap-4">
          <DailyTransactions
            transactions={allTxns}
            currencySymbol={currencySymbol}
            onDelete={(id) => setDeletingId(id)}
          />
        </div>
        <div className="flex flex-col gap-4">
          <IncomeExpenseDonut categories={categoryItems} mode={categoryMode} currencySymbol={currencySymbol} />
          <QuickStats transactions={heroTxns} currencySymbol={currencySymbol} />
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

- [ ] **Step 3.2: Run all tests**

```bash
npm run test
```

Expected: All tests pass. No failures.

- [ ] **Step 3.3: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors. TypeScript narrowing on `drillState.level` in JSX expressions is valid because each branch of the discriminated union is checked before accessing `drillState.category` or `drillState.subCategory`.

- [ ] **Step 3.4: Commit**

```bash
git add src/routes/Dashboard.tsx
git commit -m "feat: add category drill-down with subcategories and transaction list"
```

---

## Task 4: Manual verification

- [ ] **Step 4.1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:5173` and sign in.

- [ ] **Step 4.2: Verify level 0 — all categories shown**

Navigate to Dashboard. Confirm the "By Category" widget shows **all** expense categories (previously capped at 5). Donut shows all category slices.

- [ ] **Step 4.3: Verify level 1 — subcategory drill-down**

Click any category row. Confirm:
- Header now shows `← Back` button and the category name
- Bar list switches to subcategories of that category
- Donut updates to show subcategory slices
- Mode toggle still visible

- [ ] **Step 4.4: Verify level 1 → level 0 back navigation**

Click `← Back`. Confirm the widget returns to the full category list and donut shows all categories again.

- [ ] **Step 4.5: Verify level 2 — transaction list**

From level 1, click a subcategory. Confirm:
- Header shows `← Food` (parent category name) and the subcategory name
- Body shows transaction rows (icon, vendor, date, amount)
- Mode toggle is hidden
- Donut shows a single slice at 100%

- [ ] **Step 4.6: Verify transaction navigation**

Click a transaction row. Confirm it navigates to the edit form pre-populated with that transaction's data.

- [ ] **Step 4.7: Verify HeroStatsRow is unaffected**

While at level 2, confirm the hero totals (income/expense) remain unchanged — they always reflect the full period.

- [ ] **Step 4.8: Verify mode toggle resets drill**

Drill into a category (level 1), then click the "income" toggle. Confirm the widget resets to level 0 and shows income categories.
