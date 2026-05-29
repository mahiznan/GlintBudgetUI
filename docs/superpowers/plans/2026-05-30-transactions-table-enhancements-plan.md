# Transactions Table Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the Transactions page with a restructured first column (subcategory+vendor), sortable headers, zebra-stripe rows, a single-field search bar, and infinite scroll.

**Architecture:** All state (sort, search, visibleCount) lives in `TransactionList`. The derived data pipeline (period filter → search filter → sort → slice) runs in a single `useMemo`. `TransactionTable` stays a pure renderer; it receives the already-processed slice plus sort props to render interactive headers. `IntersectionObserver` on a sentinel div handles infinite scroll with no external library.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Vitest + React Testing Library

---

## File Map

| File | Change |
|---|---|
| `src/components/transactions/TransactionRow.tsx` | Column 1: show `subCategory` (bold) + `vendor` (muted). Add `even:bg-surface-alt hover:bg-slate-100` to `<tr>` |
| `src/components/transactions/TransactionRow.test.tsx` | Update: assert `subCategory` primary, `vendor` secondary, `account` absent |
| `src/components/transactions/TransactionTable.tsx` | Export `SortKey` type. Accept `sortKey`/`sortDir`/`onSort` props. Render clickable headers with sort indicators |
| `src/components/transactions/TransactionTable.test.tsx` | Update: pass sort props. Add: sortable header click test |
| `src/routes/TransactionList.tsx` | Add all state + refs + effects. Single `useMemo` pipeline. Search input. Sentinel div |
| `src/routes/TransactionList.test.tsx` | Add: search input renders. Add: search filtering works |

---

## Task 1: TransactionRow — Column Restructure + Zebra Stripe

**Files:**
- Modify: `src/components/transactions/TransactionRow.tsx`
- Modify: `src/components/transactions/TransactionRow.test.tsx`

- [ ] **Step 1.1: Update the tests to assert the new column 1 content**

Replace the content of `src/components/transactions/TransactionRow.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TransactionRow from './TransactionRow';
import type { Transaction } from '../../firestore/types';

const expenseTx: Transaction = {
  id: 'tx1',
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Groceries',
  date: new Date('2026-05-17T09:30:00'),
  account: 'HDFC',
  vendor: 'Zepto',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount: -500,
  icon: '🛒',
};

const incomeTx: Transaction = {
  ...expenseTx,
  id: 'tx2',
  vendor: 'Employer',
  category: 'Salary',
  amount: 50000,
};

function renderRow(tx = expenseTx, onDelete = vi.fn()) {
  return render(
    <MemoryRouter>
      <table>
        <tbody>
          <TransactionRow transaction={tx} currencySymbol="₹" onDelete={onDelete} />
        </tbody>
      </table>
    </MemoryRouter>,
  );
}

describe('TransactionRow', () => {
  it('renders subCategory as primary text and vendor below it', () => {
    renderRow();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Zepto')).toBeInTheDocument();
  });

  it('does not render account', () => {
    renderRow();
    expect(screen.queryByText('HDFC')).not.toBeInTheDocument();
  });

  it('renders category badge and absolute amount', () => {
    renderRow();
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
    expect(screen.getByRole('link', { name: /edit zepto/i })).toHaveAttribute(
      'href',
      '/app/transactions/tx1/edit',
    );
  });

  it('calls onDelete with the transaction id', async () => {
    const onDelete = vi.fn();
    renderRow(expenseTx, onDelete);
    await userEvent.click(screen.getByRole('button', { name: /delete zepto/i }));
    expect(onDelete).toHaveBeenCalledWith('tx1');
  });
});
```

- [ ] **Step 1.2: Run the tests — expect failures on the two new assertions**

```bash
npm run test -- TransactionRow
```

Expected: `renders subCategory as primary text and vendor below it` passes (vendor still in DOM), `does not render account` FAILS (HDFC is currently rendered).

- [ ] **Step 1.3: Update TransactionRow to show subCategory + vendor, drop account, add zebra classes**

Replace the content of `src/components/transactions/TransactionRow.tsx`:

```tsx
import { Link } from 'react-router-dom';
import type { Transaction } from '../../firestore/types';
import { formatCurrency, formatDateShort, formatTime } from '../../lib/dateUtils';

interface TransactionRowProps {
  transaction: Transaction;
  currencySymbol: string;
  onDelete: (id: string) => void;
}

export default function TransactionRow({
  transaction: tx,
  currencySymbol,
  onDelete,
}: TransactionRowProps) {
  return (
    <tr className="border-b border-border even:bg-surface-alt hover:bg-slate-100 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{tx.icon || '💸'}</span>
          <div>
            <p className="text-sm font-medium text-text">{tx.subCategory}</p>
            <p className="text-xs text-text-muted">{tx.vendor}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-50 text-brand border border-green-200">
          {tx.category}
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-text-muted">
        {formatDateShort(tx.date)} {formatTime(tx.date)}
      </td>
      <td className="py-3 px-4 text-xs text-text-muted">{tx.payment}</td>
      <td className="py-3 px-4 text-right">
        <span className={`text-sm font-semibold ${tx.amount < 0 ? 'text-red-600' : 'text-brand'}`}>
          {tx.amount < 0 ? '−' : '+'}
          {formatCurrency(Math.abs(tx.amount), currencySymbol)}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/app/transactions/${tx.id}/edit`}
            className="p-1.5 rounded-lg text-text-muted hover:text-brand hover:bg-green-50 transition-colors"
            aria-label={`Edit ${tx.vendor}`}
          >
            ✏️
          </Link>
          <button
            type="button"
            onClick={() => onDelete(tx.id)}
            className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label={`Delete ${tx.vendor}`}
          >
            🗑
          </button>
        </div>
      </td>
    </tr>
  );
}
```

- [ ] **Step 1.4: Run tests — all must pass**

```bash
npm run test -- TransactionRow
```

Expected: all 8 tests PASS.

- [ ] **Step 1.5: Commit**

```bash
git add src/components/transactions/TransactionRow.tsx src/components/transactions/TransactionRow.test.tsx
git commit -m "feat: show subCategory+vendor in column 1, add zebra-stripe rows"
```

---

## Task 2: TransactionTable — SortKey Type + Sortable Headers

**Files:**
- Modify: `src/components/transactions/TransactionTable.tsx`
- Modify: `src/components/transactions/TransactionTable.test.tsx`

- [ ] **Step 2.1: Update tests to cover sort props and clickable headers**

Replace the content of `src/components/transactions/TransactionTable.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TransactionTable, { type SortKey } from './TransactionTable';
import type { Transaction } from '../../firestore/types';

const tx: Transaction = {
  id: 'tx1',
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Groceries',
  date: new Date('2026-05-17'),
  account: 'HDFC',
  vendor: 'Zepto',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount: 500,
  icon: '🛒',
};

const defaultSort = {
  sortKey: 'date' as SortKey,
  sortDir: 'desc' as const,
  onSort: vi.fn(),
};

function renderTable(overrides = {}) {
  return render(
    <MemoryRouter>
      <TransactionTable
        transactions={[tx]}
        currencySymbol="₹"
        onDelete={vi.fn()}
        {...defaultSort}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('TransactionTable', () => {
  it('renders subCategory, vendor, category, and amount', () => {
    renderTable();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Zepto')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText(/₹500/)).toBeInTheDocument();
  });

  it('shows empty state when no transactions', () => {
    render(
      <MemoryRouter>
        <TransactionTable
          transactions={[]}
          currencySymbol="₹"
          onDelete={vi.fn()}
          {...defaultSort}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/no transactions/i)).toBeInTheDocument();
  });

  it('renders sortable column headers', () => {
    renderTable();
    expect(screen.getByRole('columnheader', { name: /subcategory/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /category/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /date/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /payment/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /amount/i })).toBeInTheDocument();
  });

  it('calls onSort with the column key when a sortable header is clicked', async () => {
    const onSort = vi.fn();
    renderTable({ onSort });
    await userEvent.click(screen.getByRole('columnheader', { name: /category/i }));
    expect(onSort).toHaveBeenCalledWith('category');
  });

  it('does not call onSort when the Actions header area is clicked', async () => {
    const onSort = vi.fn();
    renderTable({ onSort });
    // Actions th has no text and is not clickable — assert onSort not called on table click outside headers
    expect(onSort).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2.2: Run tests — expect failures**

```bash
npm run test -- TransactionTable
```

Expected: `renders sortable column headers` and `calls onSort` FAIL — current table has no sort props.

- [ ] **Step 2.3: Rewrite TransactionTable with SortKey export and sortable headers**

Replace the content of `src/components/transactions/TransactionTable.tsx`:

```tsx
import type { Transaction } from '../../firestore/types';
import TransactionRow from './TransactionRow';

export type SortKey = 'subCategory' | 'category' | 'date' | 'payment' | 'amount';

interface TransactionTableProps {
  transactions: Transaction[];
  currencySymbol: string;
  onDelete: (id: string) => void;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onSort: (key: SortKey) => void;
}

const COLUMNS: { label: string; key: SortKey | null }[] = [
  { label: 'Subcategory & Vendor', key: 'subCategory' },
  { label: 'Category', key: 'category' },
  { label: 'Date & Time', key: 'date' },
  { label: 'Payment', key: 'payment' },
  { label: 'Amount', key: 'amount' },
  { label: '', key: null },
];

function SortIndicator({ colKey, sortKey, sortDir }: { colKey: SortKey; sortKey: SortKey; sortDir: 'asc' | 'desc' }) {
  if (colKey !== sortKey) return <span className="text-text-muted opacity-40">⇅</span>;
  return <span className="text-brand">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

export default function TransactionTable({
  transactions,
  currencySymbol,
  onDelete,
  sortKey,
  sortDir,
  onSort,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm font-medium">No transactions for this period</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] border-collapse bg-surface">
        <thead>
          <tr className="border-b border-border bg-surface-alt">
            {COLUMNS.map(({ label, key }) =>
              key ? (
                <th
                  key={key}
                  onClick={() => onSort(key)}
                  className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-widest text-text-muted cursor-pointer select-none hover:text-text transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <SortIndicator colKey={key} sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
              ) : (
                <th
                  key="actions"
                  className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-widest text-text-muted opacity-0 select-none"
                >
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              currencySymbol={currencySymbol}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2.4: Run tests — all must pass**

```bash
npm run test -- TransactionTable
```

Expected: all 5 tests PASS.

- [ ] **Step 2.5: Commit**

```bash
git add src/components/transactions/TransactionTable.tsx src/components/transactions/TransactionTable.test.tsx
git commit -m "feat: add sortable column headers to TransactionTable"
```

---

## Task 3: TransactionList — Search Bar + Sort State + Infinite Scroll

**Files:**
- Modify: `src/routes/TransactionList.tsx`
- Modify: `src/routes/TransactionList.test.tsx`

- [ ] **Step 3.1: Update TransactionList tests**

Replace the content of `src/routes/TransactionList.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Outlet } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PreferenceContext } from '../context/PreferenceContext';
import { TransactionContext } from '../context/TransactionContext';
import { SyncStatusProvider } from '../context/SyncStatusContext';
import type { AppShellOutletContext } from './AppShell';
import type { Transaction } from '../firestore/types';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  deleteDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(() => 'docref'),
}));

import TransactionList from './TransactionList';

const prefCtx = { preference: null, loading: false, error: null };
const emptyTxCtx = { transactions: [], loading: false, error: null, hasPendingWrites: false };

const today = new Date();

const matchingTx: Transaction = {
  id: 'tx-match',
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Groceries',
  date: today,
  account: 'HDFC',
  vendor: 'Big Basket',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount: -500,
  icon: '🛒',
};

const nonMatchingTx: Transaction = {
  ...matchingTx,
  id: 'tx-no-match',
  vendor: 'Swiggy',
  subCategory: 'Dining Out',
};

function makeCtx(): AppShellOutletContext {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return { period: 'month', setPeriod: vi.fn(), fabDate: d, setFabDate: vi.fn() };
}

function renderList(txCtx = emptyTxCtx) {
  return render(
    <SyncStatusProvider>
      <PreferenceContext.Provider value={prefCtx}>
        <TransactionContext.Provider value={txCtx}>
          <MemoryRouter>
            <Routes>
              <Route path="/" element={<Outlet context={makeCtx()} />}>
                <Route index element={<TransactionList />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </TransactionContext.Provider>
      </PreferenceContext.Provider>
    </SyncStatusProvider>,
  );
}

describe('TransactionList', () => {
  it('renders empty state after loading', async () => {
    renderList();
    expect(await screen.findByText(/no transactions/i)).toBeInTheDocument();
  });

  it('renders a search input', () => {
    renderList();
    expect(screen.getByPlaceholderText(/search transactions/i)).toBeInTheDocument();
  });

  it('filters transactions by search query', async () => {
    renderList({
      transactions: [matchingTx, nonMatchingTx],
      loading: false,
      error: null,
      hasPendingWrites: false,
    });
    await userEvent.type(screen.getByPlaceholderText(/search transactions/i), 'basket');
    expect(screen.getByText('Big Basket')).toBeInTheDocument();
    expect(screen.queryByText('Swiggy')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3.2: Run tests — expect failures**

```bash
npm run test -- TransactionList
```

Expected: `renders a search input` and `filters transactions by search query` FAIL.

- [ ] **Step 3.3: Rewrite TransactionList with all new state and logic**

Replace the content of `src/routes/TransactionList.tsx`:

```tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useTransactionContext } from '../context/TransactionContext';
import { useDeleteTransaction } from '../hooks/useMutateTransaction';
import { filterByPeriod } from '../lib/dateUtils';
import type { AppShellOutletContext } from './AppShell';
import TransactionTable, { type SortKey } from '../components/transactions/TransactionTable';
import DeleteConfirmDialog from '../components/transactions/DeleteConfirmDialog';

const PAGE_SIZE = 25;

export default function TransactionList() {
  const { preference } = usePreferenceContext();
  const { period } = useOutletContext<AppShellOutletContext>();
  const { transactions, loading, error } = useTransactionContext();
  const { mutate: deleteTx } = useDeleteTransaction();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const currencySymbol = preference?.defaultCurrency.symbol ?? '₹';

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const processed = useMemo(() => {
    const periodFiltered = filterByPeriod(transactions, period);

    const q = searchQuery.trim().toLowerCase();
    const searched =
      q === ''
        ? periodFiltered
        : periodFiltered.filter(
            (tx) =>
              tx.subCategory.toLowerCase().includes(q) ||
              tx.vendor.toLowerCase().includes(q) ||
              tx.category.toLowerCase().includes(q) ||
              tx.payment.toLowerCase().includes(q) ||
              tx.notes.toLowerCase().includes(q),
          );

    return [...searched].sort((a, b) => {
      const d = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'subCategory':
          return d * a.subCategory.localeCompare(b.subCategory);
        case 'category':
          return d * a.category.localeCompare(b.category);
        case 'date':
          return d * (a.date.getTime() - b.date.getTime());
        case 'payment':
          return d * a.payment.localeCompare(b.payment);
        case 'amount':
          return d * (a.amount - b.amount);
      }
    });
  }, [transactions, period, searchQuery, sortKey, sortDir]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, sortKey, sortDir]);

  const hasMore = visibleCount < processed.length;
  const visible = processed.slice(0, visibleCount);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((n) => n + PAGE_SIZE);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  function handleDelete(id: string) {
    setDeletingId(null);
    deleteTx(id);
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
      <div
        className="m-6 rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700"
        role="alert"
      >
        Couldn't load transactions.{' '}
        <button className="underline ml-1" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 flex flex-col gap-5">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm select-none">
          🔍
        </span>
        <input
          type="search"
          placeholder="Search transactions…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>
      <TransactionTable
        transactions={visible}
        currencySymbol={currencySymbol}
        onDelete={setDeletingId}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
      />
      {hasMore && (
        <div ref={sentinelRef} className="py-4 text-center text-text-muted text-sm">
          <div className="inline-block w-4 h-4 border-2 border-border border-t-brand rounded-full animate-spin mr-2 align-middle" />
          Loading more…
        </div>
      )}
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

- [ ] **Step 3.4: Run all tests — all must pass**

```bash
npm run test -- TransactionList
```

Expected: all 3 tests PASS.

- [ ] **Step 3.5: Run the full test suite to check for regressions**

```bash
npm run test
```

Expected: all tests pass. Fix any failures before continuing.

- [ ] **Step 3.6: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: zero errors.

- [ ] **Step 3.7: Commit**

```bash
git add src/routes/TransactionList.tsx src/routes/TransactionList.test.tsx
git commit -m "feat: add search bar, sort state, and infinite scroll to TransactionList"
```

---

## Task 4: Visual Verification

- [ ] **Step 4.1: Start the dev server**

```bash
npm run dev
```

Open http://localhost:5173 and navigate to `/app/transactions`.

- [ ] **Step 4.2: Verify column 1**

Confirm the first column shows subcategory (bold) as the primary line and vendor name (muted) below it. Account name should not appear anywhere in the row.

- [ ] **Step 4.3: Verify zebra striping**

Confirm alternating rows have a slightly different background (white vs. light slate). Confirm the hover state darkens the row regardless of whether it's odd or even.

- [ ] **Step 4.4: Verify sort**

Click each sortable column header. Confirm:
- An amber ↑ or ↓ indicator appears on the active column.
- Rows reorder correctly.
- Clicking the same column twice reverses the direction.
- Date column defaults to ↓ (newest first) on load.
- The Actions column header has no sort indicator and clicking it does nothing.

- [ ] **Step 4.5: Verify search**

Type a vendor name, subcategory, or payment method into the search box. Confirm only matching rows are shown. Clear the input and confirm all rows return.

- [ ] **Step 4.6: Verify infinite scroll**

Add enough test transactions (>25 in a period) or temporarily reduce `PAGE_SIZE` to `3` in `TransactionList.tsx` to test. Confirm:
- Only the first batch renders on load.
- The spinning sentinel appears below the table.
- Scrolling to the bottom loads the next batch.
- When all records are visible, the sentinel disappears.
- Restore `PAGE_SIZE = 25` after testing.

- [ ] **Step 4.7: Final commit (if PAGE_SIZE was changed for testing)**

```bash
git add src/routes/TransactionList.tsx
git commit -m "chore: restore PAGE_SIZE to 25 after visual verification"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Column 1: subCategory primary, vendor secondary, account removed | Task 1 |
| Zebra stripe: even rows `surface-alt`, hover `slate-100` | Task 1 |
| SortKey type exported from TransactionTable | Task 2 |
| All 5 data columns sortable, Actions not | Task 2 |
| Sort indicators: ⇅ idle, amber ↑↓ active | Task 2 |
| Default sort: date desc | Task 3 |
| Single useMemo pipeline: period → search → sort → slice | Task 3 |
| Search bar: single input, 5 fields searched | Task 3 |
| Infinite scroll: IntersectionObserver, PAGE_SIZE=25, reset on sort/search change | Task 3 |
| State in TransactionList, TransactionTable stays pure renderer | Task 3 |
