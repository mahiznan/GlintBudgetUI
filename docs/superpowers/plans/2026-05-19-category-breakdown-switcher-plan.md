# CategoryBreakdown Income/Expense Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inline Expense/Income toggle to the "By Category" widget and ensure it only counts transactions matching the user's default currency and account.

**Architecture:** Two isolated changes — (1) `CategoryBreakdown` gains local `mode` state and a compact pill toggle that re-filters the category aggregation, (2) `Dashboard` passes `heroTxns` (already filtered by currency+account) instead of `periodTxns`. No new shared components; tests are TDD-first.

**Tech Stack:** React + TypeScript, Vitest + React Testing Library + @testing-library/user-event, Tailwind CSS v4

---

### Task 1: Write failing tests

**Files:**

- Modify: `src/components/dashboard/CategoryBreakdown.test.tsx`

- [ ] **Step 1: Replace the test file with the updated + new tests**

Replace the entire contents of `src/components/dashboard/CategoryBreakdown.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'lime', setTheme: vi.fn() }),
}));

import CategoryBreakdown from './CategoryBreakdown';
import type { Transaction } from '../../firestore/types';

const makeTx = (category: string, amount: number): Transaction => ({
  id: category + amount,
  user_id: 'u1',
  category,
  subCategory: '',
  date: new Date(),
  account: 'HDFC',
  vendor: 'V',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount,
  icon: '🛒',
});

describe('CategoryBreakdown', () => {
  it('renders top categories heading', () => {
    render(<CategoryBreakdown transactions={[]} currencySymbol="₹" />);
    expect(screen.getByText(/category/i)).toBeInTheDocument();
  });

  it('renders Expense and Income toggle buttons', () => {
    render(<CategoryBreakdown transactions={[]} currencySymbol="₹" />);
    expect(screen.getByRole('button', { name: /expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument();
  });

  it('shows expense mode active by default (bg-red-600 class)', () => {
    render(<CategoryBreakdown transactions={[]} currencySymbol="₹" />);
    expect(screen.getByRole('button', { name: /expense/i })).toHaveClass('bg-red-600');
  });

  it('shows top categories by expense spend (negative amounts)', () => {
    const txns = [
      ...Array(3)
        .fill(null)
        .map(() => makeTx('Food', -500)),
      ...Array(2)
        .fill(null)
        .map(() => makeTx('Transport', -200)),
      makeTx('Health', -100),
    ];
    render(<CategoryBreakdown transactions={txns} currencySymbol="₹" />);
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('hides income categories in default expense mode', () => {
    const txns = [makeTx('Salary', 50000), makeTx('Food', -500)];
    render(<CategoryBreakdown transactions={txns} currencySymbol="₹" />);
    expect(screen.queryByText('Salary')).not.toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
  });

  it('income mode shows income categories and hides expense categories', async () => {
    const user = userEvent.setup();
    const txns = [makeTx('Salary', 50000), makeTx('Food', -500)];
    render(<CategoryBreakdown transactions={txns} currencySymbol="₹" />);
    await user.click(screen.getByRole('button', { name: /income/i }));
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.queryByText('Food')).not.toBeInTheDocument();
  });

  it('shows mode-aware empty state message', async () => {
    const user = userEvent.setup();
    render(<CategoryBreakdown transactions={[]} currencySymbol="₹" />);
    expect(screen.getByText(/no expenses for this period/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /income/i }));
    expect(screen.getByText(/no income for this period/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

```bash
npm test -- --reporter=verbose src/components/dashboard/CategoryBreakdown.test.tsx
```

Expected: Several FAIL entries including "renders Expense and Income toggle buttons", "shows expense mode active by default", "income mode shows income categories", "shows mode-aware empty state message". The two existing tests ("renders top categories heading", "shows top categories by expense spend") may still pass — that is fine.

---

### Task 2: Implement the switcher in CategoryBreakdown

**Files:**

- Modify: `src/components/dashboard/CategoryBreakdown.tsx`

- [ ] **Step 1: Replace CategoryBreakdown.tsx with the new implementation**

Replace the entire contents of `src/components/dashboard/CategoryBreakdown.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { Transaction } from '../../firestore/types';
import { formatCurrency } from '../../lib/dateUtils';
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';

type Mode = 'expense' | 'income';

interface CategoryBreakdownProps {
  transactions: Transaction[];
  currencySymbol: string;
}

export default function CategoryBreakdown({
  transactions,
  currencySymbol,
}: CategoryBreakdownProps) {
  const { themeId } = useTheme();
  const theme = getTheme(themeId);
  const [mode, setMode] = useState<Mode>('expense');

  const categories = useMemo(() => {
    const filtered =
      mode === 'expense'
        ? transactions.filter((t) => t.amount < 0)
        : transactions.filter((t) => t.amount > 0);
    const totals = filtered.reduce<Record<string, { total: number; icon: string }>>((acc, t) => {
      if (!acc[t.category]) acc[t.category] = { total: 0, icon: t.icon };
      acc[t.category]!.total += Math.abs(t.amount);
      return acc;
    }, {});
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
  }, [transactions, mode]);

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
          By Category
        </h2>
        <div className="inline-flex rounded-lg border border-border bg-surface-alt p-0.5 gap-0.5">
          {(['expense', 'income'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={[
                'rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all',
                mode === m
                  ? m === 'expense'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-white shadow-sm'
                  : 'text-text-muted hover:text-text',
              ].join(' ')}
              style={
                mode === m && m === 'income' ? { background: 'var(--brand-gradient)' } : undefined
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run the tests and verify they all pass**

```bash
npm test -- --reporter=verbose src/components/dashboard/CategoryBreakdown.test.tsx
```

Expected: All 7 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/CategoryBreakdown.tsx src/components/dashboard/CategoryBreakdown.test.tsx
git commit -m "feat: add income/expense switcher to CategoryBreakdown widget"
```

---

### Task 3: Pass heroTxns from Dashboard

**Files:**

- Modify: `src/routes/Dashboard.tsx:86`

- [ ] **Step 1: Update the CategoryBreakdown prop in Dashboard.tsx**

In `src/routes/Dashboard.tsx`, find line 86:

```tsx
<CategoryBreakdown transactions={periodTxns} currencySymbol={currencySymbol} />
```

Change it to:

```tsx
<CategoryBreakdown transactions={heroTxns} currencySymbol={currencySymbol} />
```

No other changes needed — `heroTxns` is already computed on lines 32–40 of Dashboard.tsx.

- [ ] **Step 2: Run typecheck and full test suite**

```bash
npm run typecheck && npm test
```

Expected: No type errors. All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Dashboard.tsx
git commit -m "fix: apply default currency and account filter to CategoryBreakdown"
```
