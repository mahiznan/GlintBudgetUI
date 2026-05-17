# GlintBudget Web — Dashboard & Form Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the web app with the iOS amount sign convention (negative = expense, positive = income), fix all dashboard derived values, scope the period switch to Dashboard only, and make every dashboard widget period-aware — with page-based pagination for Month/Quarter/Year periods.

**Architecture:** Surgical in-place edits across existing files — no new hooks, no new Firestore reads. Derived values (totalIncome, totalExpenses) are computed in Dashboard.tsx from the already-fetched `periodTxns`. Period context already flows via React Router outlet context. `TodayTransactions` is replaced by `PeriodTransactions` (new file, same location).

**Tech Stack:** React 18, TypeScript strict, Vite, Tailwind CSS v4, Vitest + React Testing Library

---

## File Map

| File | Change |
|------|--------|
| `src/routes/TransactionForm.tsx` | Apply sign on save; infer type from sign on load |
| `src/routes/TransactionForm.test.tsx` | Add sign-convention tests |
| `src/components/dashboard/HeroStatsRow.tsx` | Rename prop `totalSpent` → `totalExpenses` |
| `src/components/dashboard/HeroStatsRow.test.tsx` | Update to `totalExpenses` |
| `src/components/layout/TopBar.tsx` | Add optional `showPeriodSwitch` prop |
| `src/components/layout/TopBar.test.tsx` | Add visibility tests; update existing tests |
| `src/routes/AppShell.tsx` | Pass `showPeriodSwitch` based on pathname |
| `src/routes/AppShell.test.tsx` | Add period switch visibility integration test |
| `src/components/dashboard/CategoryBreakdown.tsx` | Filter to `amount < 0` only |
| `src/components/dashboard/CategoryBreakdown.test.tsx` | Use negative amounts; add income-exclusion test |
| `src/components/dashboard/SpendingChart.tsx` | Fix `> 0` → `< 0`; use `Math.abs` |
| `src/components/dashboard/SpendingChart.test.tsx` | Use negative amounts |
| `src/components/dashboard/QuickStats.tsx` | Fix `> 0` → `< 0`; use `Math.abs` |
| `src/components/dashboard/QuickStats.test.tsx` | Use negative amounts |
| `src/components/dashboard/PeriodTransactions.tsx` | NEW — replaces TodayTransactions; period-aware + pagination |
| `src/components/dashboard/PeriodTransactions.test.tsx` | NEW — full test suite |
| `src/components/dashboard/TodayTransactions.tsx` | DELETE |
| `src/components/dashboard/TodayTransactions.test.tsx` | DELETE |
| `src/components/transactions/TransactionRow.tsx` | Fix amount display for sign convention |
| `src/components/transactions/TransactionRow.test.tsx` | Update to negative expense amount |
| `src/routes/Dashboard.tsx` | Wire totalIncome/totalExpenses; use PeriodTransactions |

---

## Task 1: TransactionForm — amount sign convention

**Files:**
- Modify: `src/routes/TransactionForm.tsx`
- Modify: `src/routes/TransactionForm.test.tsx`

- [ ] **Step 1: Add `userEvent` import and write two failing tests**

Add to `src/routes/TransactionForm.test.tsx` (after existing imports, before the `vi.mock` block — update the mock's `amount` to `-500` to represent a stored expense, and add `userEvent` import and two new tests at the bottom of the file):

```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import { PreferenceContext } from '../context/PreferenceContext';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  doc: vi.fn(() => 'doc-ref'),
  getDoc: vi.fn(() =>
    Promise.resolve({
      exists: () => true,
      id: 'tx1',
      data: () => ({
        user_id: 'u1', category: 'Food', sub_category: 'Groceries',
        date: { toDate: () => new Date('2026-05-17') },
        account: 'HDFC', vendor: 'Zepto', payment: 'UPI',
        currency: 'INR', notes: '', amount: -500, icon: '🛒',  // ← negative expense
      }),
    }),
  ),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
}));

import { addDoc } from 'firebase/firestore';
import TransactionForm from './TransactionForm';

const authedCtx = {
  status: 'authenticated' as const,
  user: { uid: 'u1', name: 'Test', email: 't@e.com', photoUrl: null },
};

const prefCtx = {
  preference: {
    id: 'u1',
    accounts: [{ name: 'HDFC', emoji: '🏦', type: 'account', parent: null }],
    categories: [{ name: 'Food', emoji: '🍔', type: 'category', parent: null }],
    subCategories: [],
    vendors: [{ name: 'Zepto', emoji: null, type: 'vendor', parent: null }],
    payments: [{ name: 'UPI', emoji: null, type: 'payment', parent: null }],
    defaultCurrency: { name: 'Indian Rupee', code: 'INR', symbol: '₹' },
    bookmarkedCurrencies: ['INR'],
    defaultEntries: null,
  },
  loading: false,
  error: null,
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={authedCtx}>
      <PreferenceContext.Provider value={prefCtx}>
        <MemoryRouter initialEntries={['/app/transactions/new']}>
          <Routes>
            <Route path="/app/transactions/new" element={children} />
          </Routes>
        </MemoryRouter>
      </PreferenceContext.Provider>
    </AuthContext.Provider>
  );
}

function EditWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={authedCtx}>
      <PreferenceContext.Provider value={prefCtx}>
        <MemoryRouter initialEntries={['/app/transactions/tx1/edit']}>
          <Routes>
            <Route path="/app/transactions/:id/edit" element={children} />
          </Routes>
        </MemoryRouter>
      </PreferenceContext.Provider>
    </AuthContext.Provider>
  );
}

describe('TransactionForm (add mode)', () => {
  it('renders Amount and Category fields', async () => {
    render(<TransactionForm mode="add" />, { wrapper: Wrapper as React.ComponentType });
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  it('shows validation error when amount is empty on submit', async () => {
    const { getByRole, findByText } = render(<TransactionForm mode="add" />, { wrapper: Wrapper as React.ComponentType });
    getByRole('button', { name: /save/i }).click();
    expect(await findByText(/amount.*required/i)).toBeInTheDocument();
  });

  it('saves expense as a negative amount', async () => {
    vi.mocked(addDoc).mockClear();
    const user = userEvent.setup();
    render(<TransactionForm mode="add" />, { wrapper: Wrapper as React.ComponentType });

    await user.type(screen.getByLabelText(/amount/i), '500');
    await user.selectOptions(screen.getByLabelText(/currency/i), 'INR');
    await user.selectOptions(screen.getByLabelText(/category/i), 'Food');
    await user.type(screen.getByLabelText(/vendor/i), 'Zepto');
    await user.selectOptions(screen.getByLabelText(/account/i), 'HDFC');
    await user.selectOptions(screen.getByLabelText(/payment/i), 'UPI');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(vi.mocked(addDoc)).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ amount: -500 }),
      );
    });
  });
});

describe('TransactionForm (edit mode)', () => {
  it('displays absolute amount and infers expense type from negative stored amount', async () => {
    render(<TransactionForm mode="edit" />, { wrapper: EditWrapper as React.ComponentType });
    const amountInput = await screen.findByLabelText(/amount/i);
    expect(amountInput).toHaveValue(500);
    // Expense toggle button is visually active (has red background class)
    expect(screen.getByRole('button', { name: /expense/i })).toHaveClass('bg-red-600');
  });
});
```

- [ ] **Step 2: Run tests to confirm new tests fail**

```bash
npx vitest run src/routes/TransactionForm.test.tsx
```

Expected: the two new tests fail — `saves expense as a negative amount` fails because amount is saved as `500` not `-500`; `displays absolute amount…` fails because `amountInput` has value `-500` not `500`.

- [ ] **Step 3: Implement sign convention in TransactionForm**

In `src/routes/TransactionForm.tsx`, make two changes:

**Change A — `handleSubmit`: apply sign based on type**
```tsx
// Replace:
amount: parseFloat(form.amount),

// With:
amount: form.type === 'expense'
  ? -Math.abs(parseFloat(form.amount))
  : Math.abs(parseFloat(form.amount)),
```

**Change B — edit mode `useEffect`: infer type from sign, display absolute value**
```tsx
// Replace:
type: (d['type'] as 'expense' | 'income') ?? 'expense',
amount: String(d['amount']),

// With:
type: (d['amount'] as number) < 0 ? 'expense' : 'income',
amount: String(Math.abs(d['amount'] as number)),
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/routes/TransactionForm.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/routes/TransactionForm.tsx src/routes/TransactionForm.test.tsx
git commit -m "feat: apply amount sign convention in TransactionForm (expense=negative)"
```

---

## Task 2: HeroStatsRow — rename `totalSpent` → `totalExpenses`

**Files:**
- Modify: `src/components/dashboard/HeroStatsRow.tsx`
- Modify: `src/components/dashboard/HeroStatsRow.test.tsx`

- [ ] **Step 1: Write failing test**

Replace `src/components/dashboard/HeroStatsRow.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HeroStatsRow from './HeroStatsRow';

const stats = {
  totalExpenses: 12500,
  totalIncome: 50000,
  netBalance: 37500,
  txCount: 24,
  currencySymbol: '₹',
};

describe('HeroStatsRow', () => {
  it('renders all four stat labels', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.getByText(/expenses/i)).toBeInTheDocument();
    expect(screen.getByText(/income/i)).toBeInTheDocument();
    expect(screen.getByText(/net balance/i)).toBeInTheDocument();
    expect(screen.getByText(/transactions/i)).toBeInTheDocument();
  });

  it('formats amounts with currency symbol', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.getByText(/₹12,500/)).toBeInTheDocument();
    expect(screen.getByText(/₹50,000/)).toBeInTheDocument();
  });

  it('shows transaction count', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.getByText('24')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/components/dashboard/HeroStatsRow.test.tsx
```

Expected: FAIL — `totalExpenses` prop doesn't exist yet.

- [ ] **Step 3: Update HeroStatsRow component**

Replace `src/components/dashboard/HeroStatsRow.tsx` with:

```tsx
import { formatCurrency } from '../../lib/dateUtils';

interface HeroStatsRowProps {
  totalExpenses: number;
  totalIncome: number;
  netBalance: number;
  txCount: number;
  currencySymbol: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
  highlight?: boolean;
}

function StatCard({ label, value, accent, highlight }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-widest text-white/60">
        {label}
      </span>
      <span
        className={[
          'text-3xl font-bold leading-none',
          highlight ? 'gradient-text' : accent ? 'income-gradient-text' : 'text-white',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}

export default function HeroStatsRow({
  totalExpenses,
  totalIncome,
  netBalance,
  txCount,
  currencySymbol,
}: HeroStatsRowProps) {
  return (
    <div
      className="hero-gradient w-full px-8 py-8"
      style={{ borderRadius: '0 0 24px 24px' }}
    >
      <div className="flex items-center gap-12 flex-wrap">
        <StatCard
          label="Net Balance"
          value={formatCurrency(netBalance, currencySymbol)}
          highlight
        />
        <div className="w-px h-12 bg-white/20" aria-hidden="true" />
        <StatCard
          label="Income"
          value={formatCurrency(totalIncome, currencySymbol)}
          accent
        />
        <div className="w-px h-12 bg-white/20" aria-hidden="true" />
        <StatCard
          label="Expenses"
          value={formatCurrency(totalExpenses, currencySymbol)}
        />
        <div className="w-px h-12 bg-white/20" aria-hidden="true" />
        <StatCard label="Transactions" value={txCount} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/components/dashboard/HeroStatsRow.test.tsx
```

Expected: 3 tests pass. (Dashboard.tsx will temporarily break — fixed in Task 10.)

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/HeroStatsRow.tsx src/components/dashboard/HeroStatsRow.test.tsx
git commit -m "feat: rename HeroStatsRow totalSpent→totalExpenses, update label"
```

---

## Task 3: TopBar — `showPeriodSwitch` prop

**Files:**
- Modify: `src/components/layout/TopBar.tsx`
- Modify: `src/components/layout/TopBar.test.tsx`

- [ ] **Step 1: Write failing test (period switch hidden by default)**

Replace `src/components/layout/TopBar.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TopBar from './TopBar';
import type { Period } from '../../lib/dateUtils';

describe('TopBar', () => {
  it('renders the page title', () => {
    render(
      <MemoryRouter>
        <TopBar title="Dashboard" period="month" onPeriodChange={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('hides period tabs when showPeriodSwitch is omitted', () => {
    render(
      <MemoryRouter>
        <TopBar title="Transactions" period="month" onPeriodChange={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /month/i })).not.toBeInTheDocument();
  });

  it('shows period tabs when showPeriodSwitch is true', () => {
    render(
      <MemoryRouter>
        <TopBar title="Dashboard" period="month" onPeriodChange={vi.fn()} showPeriodSwitch />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /week/i })).toBeInTheDocument();
  });

  it('calls onPeriodChange when a tab is clicked', async () => {
    const onChange = vi.fn();
    render(
      <MemoryRouter>
        <TopBar title="Dashboard" period="month" onPeriodChange={onChange} showPeriodSwitch />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /week/i }));
    expect(onChange).toHaveBeenCalledWith('week' as Period);
  });

  it('renders + Add Transaction link regardless of showPeriodSwitch', () => {
    render(
      <MemoryRouter>
        <TopBar title="Transactions" period="month" onPeriodChange={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /add transaction/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm new tests fail**

```bash
npx vitest run src/components/layout/TopBar.test.tsx
```

Expected: `hides period tabs when showPeriodSwitch is omitted` FAILS (tabs currently always render).

- [ ] **Step 3: Update TopBar component**

Replace `src/components/layout/TopBar.tsx` with:

```tsx
import { Link } from 'react-router-dom';
import type { Period } from '../../lib/dateUtils';

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Year', value: 'year' },
];

interface TopBarProps {
  title: string;
  period: Period;
  onPeriodChange: (p: Period) => void;
  showPeriodSwitch?: boolean;
}

export default function TopBar({ title, period, onPeriodChange, showPeriodSwitch = false }: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-3">
      <h1 className="text-lg font-semibold text-text">{title}</h1>

      {showPeriodSwitch && (
        <div className="flex items-center rounded-lg border border-border bg-surface-alt p-0.5 gap-0.5">
          {PERIODS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => onPeriodChange(value)}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                period === value
                  ? 'text-white shadow-sm'
                  : 'text-text-muted hover:text-text',
              ].join(' ')}
              style={
                period === value
                  ? { background: 'linear-gradient(135deg, #007836, #1fa32e)' }
                  : undefined
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <Link
        to="/app/transactions/new"
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #007836, #1fa32e)' }}
        aria-label="Add transaction"
      >
        <span aria-hidden="true">+</span> Add Transaction
      </Link>
    </header>
  );
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/components/layout/TopBar.test.tsx
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/TopBar.tsx src/components/layout/TopBar.test.tsx
git commit -m "feat: hide period switch on non-dashboard routes via showPeriodSwitch prop"
```

---

## Task 4: AppShell — pass `showPeriodSwitch` from pathname

**Files:**
- Modify: `src/routes/AppShell.tsx`
- Modify: `src/routes/AppShell.test.tsx`

- [ ] **Step 1: Write failing integration test**

Add to the bottom of `src/routes/AppShell.test.tsx`:

```tsx
describe('AppShell period switch visibility', () => {
  it('shows period switch on /app/dashboard', () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('button', { name: /month/i })).toBeInTheDocument();
  });

  it('hides period switch on /app/transactions', () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/transactions']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.queryByRole('button', { name: /month/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm new tests fail**

```bash
npx vitest run src/routes/AppShell.test.tsx
```

Expected: both new tests fail — period switch always hidden now (since TopBar defaults `showPeriodSwitch=false`).

- [ ] **Step 3: Update AppShell**

In `src/routes/AppShell.tsx`, update the `<TopBar>` usage to:

```tsx
<TopBar
  title={getTitle(location.pathname)}
  period={period}
  onPeriodChange={setPeriod}
  showPeriodSwitch={location.pathname === '/app/dashboard'}
/>
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/routes/AppShell.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/routes/AppShell.tsx src/routes/AppShell.test.tsx
git commit -m "feat: show period switch only on /app/dashboard"
```

---

## Task 5: CategoryBreakdown — expense-only filter

**Files:**
- Modify: `src/components/dashboard/CategoryBreakdown.tsx`
- Modify: `src/components/dashboard/CategoryBreakdown.test.tsx`

- [ ] **Step 1: Write failing tests**

Replace `src/components/dashboard/CategoryBreakdown.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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

  it('shows top categories by expense spend (negative amounts)', () => {
    const txns = [
      ...Array(3).fill(null).map(() => makeTx('Food', -500)),
      ...Array(2).fill(null).map(() => makeTx('Transport', -200)),
      makeTx('Health', -100),
    ];
    render(<CategoryBreakdown transactions={txns} currencySymbol="₹" />);
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('excludes income transactions (positive amounts) from breakdown', () => {
    const txns = [
      makeTx('Salary', 50000),    // income — should NOT appear
      makeTx('Food', -500),       // expense — should appear
    ];
    render(<CategoryBreakdown transactions={txns} currencySymbol="₹" />);
    expect(screen.queryByText('Salary')).not.toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
  });

  it('shows empty state when no transactions', () => {
    render(<CategoryBreakdown transactions={[]} currencySymbol="₹" />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/components/dashboard/CategoryBreakdown.test.tsx
```

Expected: `excludes income transactions` FAILS (positive-amount income currently included).

- [ ] **Step 3: Update CategoryBreakdown**

Replace the `useMemo` block in `src/components/dashboard/CategoryBreakdown.tsx`:

```tsx
const categories = useMemo(() => {
  const expenseTxns = transactions.filter((t) => t.amount < 0);
  const totals = expenseTxns.reduce<Record<string, { total: number; icon: string }>>(
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
}, [transactions]);
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/components/dashboard/CategoryBreakdown.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/CategoryBreakdown.tsx src/components/dashboard/CategoryBreakdown.test.tsx
git commit -m "feat: CategoryBreakdown filters expense-only (amount < 0)"
```

---

## Task 6: SpendingChart — fix expense filter direction

**Files:**
- Modify: `src/components/dashboard/SpendingChart.tsx`
- Modify: `src/components/dashboard/SpendingChart.test.tsx`

- [ ] **Step 1: Write failing test**

Replace `src/components/dashboard/SpendingChart.test.tsx` with:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
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

describe('SpendingChart', () => {
  it('renders a bar chart', () => {
    render(
      <SpendingChart
        transactions={[makeTx('2026-05-17', -500), makeTx('2026-05-16', -300)]}
        period="month"
        currencySymbol="₹"
      />,
    );
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders the Spending section heading', () => {
    render(
      <SpendingChart transactions={[]} period="week" currencySymbol="₹" />,
    );
    expect(screen.getByText(/spending/i)).toBeInTheDocument();
  });

  it('excludes income transactions (positive amounts) from chart data', () => {
    // With only income transactions, buildChartData should produce zero-amount buckets
    // The chart still renders (no crash)
    render(
      <SpendingChart
        transactions={[makeTx('2026-05-17', 50000)]}
        period="month"
        currencySymbol="₹"
      />,
    );
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm existing tests still pass (new test is smoke-level)**

```bash
npx vitest run src/components/dashboard/SpendingChart.test.tsx
```

Expected: All 3 pass. (The fix is needed for correctness but doesn't break the chart render. Next step confirms the filter direction.)

- [ ] **Step 3: Update SpendingChart — fix filter and use Math.abs**

In `src/components/dashboard/SpendingChart.tsx`, update the `buildChartData` function:

```tsx
function buildChartData(
  txns: Transaction[],
  period: Period,
): { label: string; amount: number }[] {
  const expenses = txns
    .filter((t) => t.amount < 0)
    .map((t) => ({ ...t, amount: Math.abs(t.amount) }));

  if (period === 'day') {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, amount: 0 }));
    expenses.forEach((t) => {
      const h = t.date.getHours();
      buckets[h]!.amount += t.amount;
    });
    return buckets;
  }

  if (period === 'month' || period === 'week') {
    const grouped = groupByDay(expenses);
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount,
      }));
  }

  // quarter / year → monthly buckets
  const grouped = groupByMonth(expenses);
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, amount]) => {
      const [y, m] = ym.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      return { label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), amount };
    });
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/components/dashboard/SpendingChart.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/SpendingChart.tsx src/components/dashboard/SpendingChart.test.tsx
git commit -m "feat: SpendingChart filters amount < 0 expenses only"
```

---

## Task 7: QuickStats — fix expense filter direction

**Files:**
- Modify: `src/components/dashboard/QuickStats.tsx`
- Modify: `src/components/dashboard/QuickStats.test.tsx`

- [ ] **Step 1: Write failing test**

Replace `src/components/dashboard/QuickStats.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import QuickStats from './QuickStats';
import type { Transaction } from '../../firestore/types';

const makeTx = (vendor: string, amount: number, payment: string, category: string): Transaction => ({
  id: vendor, user_id: 'u1', category, subCategory: '', date: new Date(),
  account: 'HDFC', vendor, payment, currency: 'INR', notes: '', amount, icon: '',
});

describe('QuickStats', () => {
  it('renders Quick Stats heading', () => {
    render(<QuickStats transactions={[]} currencySymbol="₹" />);
    expect(screen.getByText(/quick stats/i)).toBeInTheDocument();
  });

  it('shows highest expense spend (negative amounts)', () => {
    const txns = [makeTx('A', -1000, 'UPI', 'Food'), makeTx('B', -500, 'UPI', 'Food')];
    render(<QuickStats transactions={txns} currencySymbol="₹" />);
    expect(screen.getByText('₹1,000.00')).toBeInTheDocument();
  });

  it('excludes income (positive amounts) from quick stats', () => {
    const txns = [
      makeTx('Salary', 50000, 'Bank Transfer', 'Income'),  // income
      makeTx('Zepto', -300, 'UPI', 'Food'),                // expense
    ];
    render(<QuickStats transactions={txns} currencySymbol="₹" />);
    // highest spend should be 300, not 50000
    expect(screen.getByText('₹300.00')).toBeInTheDocument();
    expect(screen.queryByText(/₹50,000/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/components/dashboard/QuickStats.test.tsx
```

Expected: `shows highest expense spend` FAILS (currently filters `amount > 0`, so negatives are excluded and highest shows `—`). `excludes income` FAILS.

- [ ] **Step 3: Update QuickStats**

Replace `src/components/dashboard/QuickStats.tsx` with:

```tsx
import type { Transaction } from '../../firestore/types';
import { formatCurrency } from '../../lib/dateUtils';

interface QuickStatsProps {
  transactions: Transaction[];
  currencySymbol: string;
}

export default function QuickStats({ transactions, currencySymbol }: QuickStatsProps) {
  const expenses = transactions
    .filter((t) => t.amount < 0)
    .map((t) => ({ ...t, amount: Math.abs(t.amount) }));

  const highest = expenses.reduce<Transaction | null>(
    (max, t) => (max === null || t.amount > max.amount ? t : max),
    null,
  );

  const avg = expenses.length > 0
    ? expenses.reduce((s, t) => s + t.amount, 0) / expenses.length
    : 0;

  const topPayment = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.payment] = (acc[t.payment] ?? 0) + 1;
    return acc;
  }, {});
  const mostUsedPayment = Object.entries(topPayment).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—';

  const topCatMap = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount;
    return acc;
  }, {});
  const topCategory = Object.entries(topCatMap).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—';

  const items = [
    { label: 'Highest spend', value: highest ? formatCurrency(highest.amount, currencySymbol) : '—' },
    { label: 'Avg per transaction', value: formatCurrency(avg, currencySymbol) },
    { label: 'Top payment', value: mostUsedPayment },
    { label: 'Top category', value: topCategory },
  ];

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
        Quick Stats
      </h2>
      <div className="flex flex-col gap-2">
        {items.map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center py-1 border-b border-border last:border-0">
            <span className="text-xs text-text-muted">{label}</span>
            <span className="text-sm font-semibold font-mono text-text">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/components/dashboard/QuickStats.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/QuickStats.tsx src/components/dashboard/QuickStats.test.tsx
git commit -m "feat: QuickStats filters amount < 0 expenses only"
```

---

## Task 8: PeriodTransactions — new component (replaces TodayTransactions)

**Files:**
- Create: `src/components/dashboard/PeriodTransactions.tsx`
- Create: `src/components/dashboard/PeriodTransactions.test.tsx`
- Delete: `src/components/dashboard/TodayTransactions.tsx`
- Delete: `src/components/dashboard/TodayTransactions.test.tsx`

- [ ] **Step 1: Write failing tests (create new test file)**

Create `src/components/dashboard/PeriodTransactions.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PeriodTransactions from './PeriodTransactions';
import type { Transaction } from '../../firestore/types';

function makeTx(id: string, vendor: string, amount: number, daysAgo = 0): Transaction {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id, user_id: 'u1', category: 'Food', subCategory: '',
    date, account: 'HDFC', vendor, payment: 'UPI',
    currency: 'INR', notes: '', amount, icon: '🛒',
  };
}

function makeTxList(count: number, amountPerTx = -500): Transaction[] {
  return Array.from({ length: count }, (_, i) =>
    makeTx(`tx${i}`, `Vendor${i}`, amountPerTx, i),
  );
}

function renderPT(transactions: Transaction[], period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'day') {
  return render(
    <MemoryRouter>
      <PeriodTransactions
        transactions={transactions}
        period={period}
        currencySymbol="₹"
        onDelete={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe('PeriodTransactions — headings', () => {
  it('shows "Today" for day period', () => {
    renderPT([], 'day');
    expect(screen.getByText(/today/i)).toBeInTheDocument();
  });

  it('shows "This Week" for week period', () => {
    renderPT([], 'week');
    expect(screen.getByText(/this week/i)).toBeInTheDocument();
  });

  it('shows "This Month" for month period', () => {
    renderPT([], 'month');
    expect(screen.getByText(/this month/i)).toBeInTheDocument();
  });

  it('shows "This Quarter" for quarter period', () => {
    renderPT([], 'quarter');
    expect(screen.getByText(/this quarter/i)).toBeInTheDocument();
  });

  it('shows "This Year" for year period', () => {
    renderPT([], 'year');
    expect(screen.getByText(/this year/i)).toBeInTheDocument();
  });
});

describe('PeriodTransactions — empty state', () => {
  it('renders empty state when no transactions', () => {
    renderPT([], 'day');
    expect(screen.getByText(/no transactions for this period/i)).toBeInTheDocument();
  });
});

describe('PeriodTransactions — transaction display', () => {
  it('renders vendor name and formatted amount', () => {
    renderPT([makeTx('tx1', 'Zepto', -500)], 'day');
    expect(screen.getByText('Zepto')).toBeInTheDocument();
    expect(screen.getByText(/₹500/)).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(
      <MemoryRouter>
        <PeriodTransactions
          transactions={[makeTx('tx1', 'Zepto', -500)]}
          period="day"
          currencySymbol="₹"
          onDelete={onDelete}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /delete zepto/i }));
    expect(onDelete).toHaveBeenCalledWith('tx1');
  });
});

describe('PeriodTransactions — pagination (month/quarter/year)', () => {
  it('does not show pagination for day period even with many transactions', () => {
    renderPT(makeTxList(15), 'day');
    expect(screen.queryByRole('button', { name: /prev/i })).not.toBeInTheDocument();
  });

  it('does not show pagination for week period', () => {
    renderPT(makeTxList(15), 'week');
    expect(screen.queryByRole('button', { name: /prev/i })).not.toBeInTheDocument();
  });

  it('shows page controls for month period when > 10 transactions', () => {
    renderPT(makeTxList(15), 'month');
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
  });

  it('shows first 10 transactions on page 1', () => {
    renderPT(makeTxList(15), 'month');
    expect(screen.getByText('Vendor0')).toBeInTheDocument();
    expect(screen.getByText('Vendor9')).toBeInTheDocument();
    expect(screen.queryByText('Vendor10')).not.toBeInTheDocument();
  });

  it('navigates to page 2 showing remaining transactions', async () => {
    renderPT(makeTxList(15), 'month');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Vendor10')).toBeInTheDocument();
    expect(screen.queryByText('Vendor0')).not.toBeInTheDocument();
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
  });

  it('Prev button is disabled on page 1', () => {
    renderPT(makeTxList(15), 'month');
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
  });

  it('Next button is disabled on last page', async () => {
    renderPT(makeTxList(15), 'month');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('does not show pagination when 10 or fewer transactions', () => {
    renderPT(makeTxList(10), 'month');
    expect(screen.queryByText(/page/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm all tests fail (file doesn't exist yet)**

```bash
npx vitest run src/components/dashboard/PeriodTransactions.test.tsx
```

Expected: FAIL — cannot resolve module `./PeriodTransactions`.

- [ ] **Step 3: Create PeriodTransactions component**

Create `src/components/dashboard/PeriodTransactions.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Transaction } from '../../firestore/types';
import type { Period } from '../../lib/dateUtils';
import { formatCurrency, formatDateShort, formatTime } from '../../lib/dateUtils';

const PAGE_SIZE = 10;

const PERIOD_LABEL: Record<Period, string> = {
  day: 'Today',
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year',
};

interface PeriodTransactionsProps {
  transactions: Transaction[];
  period: Period;
  currencySymbol: string;
  onDelete: (id: string) => void;
}

export default function PeriodTransactions({
  transactions,
  period,
  currencySymbol,
  onDelete,
}: PeriodTransactionsProps) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [transactions, period]);

  const paginate = period === 'month' || period === 'quarter' || period === 'year';
  const totalPages = paginate ? Math.max(1, Math.ceil(transactions.length / PAGE_SIZE)) : 1;
  const visible = paginate
    ? transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : transactions;

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
          {PERIOD_LABEL[period]}
        </h2>
        <Link to="/app/transactions" className="text-xs text-brand hover:underline font-medium">
          See all →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-text-muted py-6 text-center">No transactions for this period</p>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-border">
            {visible.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-2.5">
                <span className="text-xl w-8 text-center flex-shrink-0">{tx.icon || '💸'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{tx.vendor}</p>
                  <p className="text-xs text-text-muted">
                    {tx.category} · {formatDateShort(tx.date)} {formatTime(tx.date)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-sm font-mono font-semibold ${
                      tx.amount < 0 ? 'text-red-600' : 'text-brand'
                    }`}
                  >
                    {tx.amount < 0 ? '−' : '+'}
                    {formatCurrency(Math.abs(tx.amount), currencySymbol)}
                  </span>
                  <Link
                    to={`/app/transactions/${tx.id}/edit`}
                    className="text-text-muted hover:text-brand p-1"
                    aria-label={`Edit ${tx.vendor}`}
                  >
                    ✏️
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(tx.id)}
                    className="text-text-muted hover:text-red-600 p-1"
                    aria-label={`Delete ${tx.vendor}`}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>

          {paginate && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs font-semibold text-text-muted hover:text-text disabled:opacity-40 px-2 py-1"
              >
                ← Prev
              </button>
              <span className="text-xs text-text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-xs font-semibold text-text-muted hover:text-text disabled:opacity-40 px-2 py-1"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/components/dashboard/PeriodTransactions.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Delete old TodayTransactions files**

```bash
git rm src/components/dashboard/TodayTransactions.tsx src/components/dashboard/TodayTransactions.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/PeriodTransactions.tsx src/components/dashboard/PeriodTransactions.test.tsx
git commit -m "feat: add PeriodTransactions with dynamic heading and page-based pagination; remove TodayTransactions"
```

---

## Task 9: TransactionRow — fix amount display for sign convention

**Files:**
- Modify: `src/components/transactions/TransactionRow.tsx`
- Modify: `src/components/transactions/TransactionRow.test.tsx`

- [ ] **Step 1: Write failing test**

Replace `src/components/transactions/TransactionRow.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TransactionRow from './TransactionRow';
import type { Transaction } from '../../firestore/types';

const expenseTx: Transaction = {
  id: 'tx1', user_id: 'u1', category: 'Food', subCategory: 'Groceries',
  date: new Date('2026-05-17T09:30:00'), account: 'HDFC', vendor: 'Zepto',
  payment: 'UPI', currency: 'INR', notes: '', amount: -500, icon: '🛒',
};

const incomeTx: Transaction = {
  ...expenseTx, id: 'tx2', vendor: 'Employer', category: 'Salary',
  amount: 50000,
};

function renderRow(tx = expenseTx, onDelete = vi.fn()) {
  return render(
    <MemoryRouter>
      <table><tbody>
        <TransactionRow transaction={tx} currencySymbol="₹" onDelete={onDelete} />
      </tbody></table>
    </MemoryRouter>,
  );
}

describe('TransactionRow', () => {
  it('renders vendor, category, and absolute amount', () => {
    renderRow();
    expect(screen.getByText('Zepto')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText(/₹500/)).toBeInTheDocument();
  });

  it('shows expense amount in red with minus sign', () => {
    renderRow();
    const amountEl = screen.getByText(/−₹500/);
    expect(amountEl).toHaveClass('text-red-600');
  });

  it('shows income amount in brand color with plus sign', () => {
    renderRow(incomeTx);
    const amountEl = screen.getByText(/\+₹50,000/);
    expect(amountEl).toHaveClass('text-brand');
  });

  it('has correct aria-labels on edit and delete buttons', () => {
    renderRow();
    expect(screen.getByRole('link', { name: /edit zepto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete zepto/i })).toBeInTheDocument();
  });

  it('edit link routes to /app/transactions/tx1/edit', () => {
    renderRow();
    expect(screen.getByRole('link', { name: /edit zepto/i }))
      .toHaveAttribute('href', '/app/transactions/tx1/edit');
  });

  it('calls onDelete with the transaction id', async () => {
    const onDelete = vi.fn();
    renderRow(expenseTx, onDelete);
    await userEvent.click(screen.getByRole('button', { name: /delete zepto/i }));
    expect(onDelete).toHaveBeenCalledWith('tx1');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/components/transactions/TransactionRow.test.tsx
```

Expected: `shows expense amount in red with minus sign` and `shows income amount in brand color` FAIL.

- [ ] **Step 3: Update TransactionRow amount display**

In `src/components/transactions/TransactionRow.tsx`, replace the amount `<td>`:

```tsx
<td className="py-3 px-4 text-right">
  <span
    className={`text-sm font-mono font-semibold ${
      tx.amount < 0 ? 'text-red-600' : 'text-brand'
    }`}
  >
    {tx.amount < 0 ? '−' : '+'}
    {formatCurrency(Math.abs(tx.amount), currencySymbol)}
  </span>
</td>
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/components/transactions/TransactionRow.test.tsx
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/transactions/TransactionRow.tsx src/components/transactions/TransactionRow.test.tsx
git commit -m "feat: TransactionRow shows expense in red and income in green per sign convention"
```

---

## Task 10: Dashboard — wire totalIncome/totalExpenses, use PeriodTransactions

**Files:**
- Modify: `src/routes/Dashboard.tsx`

- [ ] **Step 1: Update Dashboard.tsx**

Replace `src/routes/Dashboard.tsx` with:

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
import PeriodTransactions from '../components/dashboard/PeriodTransactions';
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

  const currencySymbol = preference?.defaultCurrency.symbol ?? '₹';

  const periodTxns = useMemo(() => filterByPeriod(allTxns, period), [allTxns, period]);

  const totalIncome = useMemo(
    () => periodTxns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [periodTxns],
  );
  const totalExpenses = useMemo(
    () => Math.abs(periodTxns.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
    [periodTxns],
  );
  const netBalance = totalIncome - totalExpenses;

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
        netBalance={netBalance}
        txCount={periodTxns.length}
        currencySymbol={currencySymbol}
      />

      <div className="p-6 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <SpendingChart transactions={periodTxns} period={period} currencySymbol={currencySymbol} />
        </div>
        <CategoryBreakdown transactions={periodTxns} currencySymbol={currencySymbol} />

        <div className="col-span-2 flex flex-col gap-4">
          <PeriodTransactions
            transactions={periodTxns}
            period={period}
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

- [ ] **Step 2: Run typecheck to verify no type errors**

```bash
npm run typecheck
```

Expected: exits 0, no errors.

- [ ] **Step 3: Run all tests**

```bash
npm run test
```

Expected: all tests pass (221 pre-existing + new tests added across tasks).

- [ ] **Step 4: Commit**

```bash
git add src/routes/Dashboard.tsx
git commit -m "feat: Dashboard wires real totalIncome/totalExpenses, uses PeriodTransactions"
```

---

## Final verification

- [ ] **Run full suite one last time**

```bash
npm run typecheck && npm run lint && npm run test
```

Expected: 0 type errors, 0 lint errors, all tests green.

- [ ] **Commit if clean**

```bash
git commit --allow-empty -m "chore: verify dashboard fixes complete — all checks green"
```
