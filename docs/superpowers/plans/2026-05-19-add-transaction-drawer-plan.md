# Add Transaction Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Add Transaction" full-page navigation with a right-side slide-in drawer that opens from the Dashboard's DailyTransactions widget and closes with a slide-out animation after saving or cancelling.

**Architecture:** A new self-contained `AddTransactionDrawer` component renders via `ReactDOM.createPortal` on `document.body`, owns its own form state and `useAddTransaction` call, and accepts `open / onClose / onSaved` props. `DailyTransactions` replaces its `<Link to="/app/transactions/new">` with a button that toggles `drawerOpen` state. Dashboard passes `refetch` as `onTransactionAdded` so the list updates after a save. The edit-mode full-page route is untouched.

**Tech Stack:** React, TypeScript, ReactDOM.createPortal, Tailwind CSS v4, Vitest + React Testing Library

---

### Task 1: Write failing tests for AddTransactionDrawer

**Files:**
- Create: `src/components/transactions/AddTransactionDrawer.test.tsx`

- [ ] **Step 1: Create the test file with mocks and smoke tests**

Create `src/components/transactions/AddTransactionDrawer.test.tsx` with the following content:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../firebase/client', () => ({ auth: {}, app: {} }));
vi.mock('../../firebase/db', () => ({ db: {} }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../context/PreferenceContext', () => ({ usePreferenceContext: vi.fn() }));
vi.mock('../../hooks/useMutateTransaction', () => ({ useAddTransaction: vi.fn() }));

import { useAuth } from '../../auth/AuthContext';
import { usePreferenceContext } from '../../context/PreferenceContext';
import { useAddTransaction } from '../../hooks/useMutateTransaction';
import AddTransactionDrawer from './AddTransactionDrawer';

const stubPreference = {
  categories: [],
  subCategories: [],
  vendors: [],
  accounts: [],
  payments: [],
  bookmarkedCurrencies: [],
  defaultCurrency: { code: 'INR', symbol: '₹' },
  defaultEntries: {},
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    status: 'authenticated',
    user: { uid: 'u1', name: 'Test', email: 't@t.com' },
  } as ReturnType<typeof useAuth>);
  vi.mocked(usePreferenceContext).mockReturnValue({
    preference: stubPreference,
    loading: false,
    error: null,
  } as ReturnType<typeof usePreferenceContext>);
  vi.mocked(useAddTransaction).mockReturnValue({
    mutate: vi.fn().mockResolvedValue('new-id'),
    loading: false,
    error: null,
  });
});

describe('AddTransactionDrawer', () => {
  it('is not in the DOM when open={false}', () => {
    render(<AddTransactionDrawer open={false} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when open={true}', () => {
    render(<AddTransactionDrawer open={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: /new transaction/i })).toBeInTheDocument();
  });

  it('clicking Cancel calls onClose after animation', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onClose = vi.fn();
    render(<AddTransactionDrawer open={true} onClose={onClose} onSaved={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    vi.runAllTimers();
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('clicking the backdrop calls onClose after animation', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onClose = vi.fn();
    render(<AddTransactionDrawer open={true} onClose={onClose} onSaved={vi.fn()} />);
    const backdrop = document.querySelector('[data-testid="drawer-backdrop"]') as HTMLElement;
    await user.click(backdrop);
    vi.runAllTimers();
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('pressing Escape calls onClose after animation', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onClose = vi.fn();
    render(<AddTransactionDrawer open={true} onClose={onClose} onSaved={vi.fn()} />);
    await user.keyboard('{Escape}');
    vi.runAllTimers();
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && npm run test -- --reporter=verbose src/components/transactions/AddTransactionDrawer.test.tsx
```

Expected: all 5 tests **FAIL** with "Cannot find module './AddTransactionDrawer'" or similar — the component does not exist yet. Do NOT commit.

---

### Task 2: Implement AddTransactionDrawer

**Files:**
- Create: `src/components/transactions/AddTransactionDrawer.tsx`

- [ ] **Step 3: Create the component**

Create `src/components/transactions/AddTransactionDrawer.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../auth/AuthContext';
import { usePreferenceContext } from '../../context/PreferenceContext';
import { useAddTransaction } from '../../hooks/useMutateTransaction';
import AmountInput from '../form/AmountInput';
import TypeToggle from '../form/TypeToggle';
import FieldPicker from '../form/FieldPicker';
import type { Transaction, BudgetData } from '../../firestore/types';

interface FormState {
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  category: string;
  subCategory: string;
  vendor: string;
  account: string;
  payment: string;
  date: string;
  notes: string;
}

interface FormErrors {
  amount?: string;
  category?: string;
  vendor?: string;
  account?: string;
  payment?: string;
  currency?: string;
  date?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.amount || parseFloat(form.amount) <= 0) errors.amount = 'Amount is required and must be positive';
  if (!form.category) errors.category = 'Category is required';
  if (!form.vendor) errors.vendor = 'Vendor is required';
  if (!form.account) errors.account = 'Account is required';
  if (!form.payment) errors.payment = 'Payment method is required';
  if (!form.currency) errors.currency = 'Currency is required';
  if (!form.date) errors.date = 'Date is required';
  return errors;
}

const EMPTY: FormState = {
  type: 'expense',
  amount: '',
  currency: '',
  category: '',
  subCategory: '',
  vendor: '',
  account: '',
  payment: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
};

interface AddTransactionDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddTransactionDrawer({ open, onClose, onSaved }: AddTransactionDrawerProps) {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { preference } = usePreferenceContext();
  const { mutate: addTx, loading, error: mutateError } = useAddTransaction();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [visible, setVisible] = useState(false);

  // Animate in and reset form each time the drawer opens
  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setErrors({});
      // Double rAF ensures the translate-x-full starting class is painted before we remove it
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }
  }, [open]);

  // Seed preference defaults when drawer opens
  useEffect(() => {
    if (!open || !preference) return;
    setForm((prev) => ({
      ...prev,
      currency: prev.currency || preference.defaultCurrency.code,
      account: prev.account || (preference.defaultEntries?.['account'] ?? ''),
      payment: prev.payment || (preference.defaultEntries?.['payment'] ?? ''),
      category: prev.category || (preference.defaultEntries?.['category'] ?? ''),
      subCategory: prev.subCategory || (preference.defaultEntries?.['sub_category'] ?? ''),
    }));
  }, [preference, open]);

  // Escape key closes the drawer
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') startClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  function startClose() {
    setVisible(false);
    setTimeout(onClose, 260);
  }

  function set(field: keyof FormState) {
    return (value: string) =>
      setForm((prev) => {
        const next = { ...prev, [field]: value };
        if (field === 'category') next.subCategory = '';
        return next;
      });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    const categoryObj = preference?.categories.find((c) => c.name === form.category);
    const txData: Omit<Transaction, 'id'> = {
      user_id: uid,
      category: form.category,
      subCategory: form.subCategory,
      date: new Date(form.date),
      account: form.account,
      vendor: form.vendor,
      payment: form.payment,
      currency: form.currency,
      notes: form.notes,
      amount: form.type === 'expense'
        ? -Math.abs(parseFloat(form.amount))
        : Math.abs(parseFloat(form.amount)),
      icon: categoryObj?.emoji ?? '',
    };
    try {
      await addTx(txData);
      onSaved();
      startClose();
    } catch {
      // mutateError state is set by the hook
    }
  }

  const filteredSubCats: BudgetData[] =
    preference?.subCategories.filter((s) => s.parent === form.category) ?? [];

  const currencyOptions: BudgetData[] = (preference?.bookmarkedCurrencies ?? []).map((code) => ({
    name: code,
    emoji: null,
    type: 'currency',
    parent: null,
  }));

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        data-testid="drawer-backdrop"
        aria-hidden="true"
        onClick={startClose}
        className={[
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New Transaction"
        className={[
          'fixed inset-y-0 right-0 z-50 flex w-[480px] max-w-full flex-col bg-surface shadow-2xl',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 flex-shrink-0">
          <h2 className="text-base font-semibold text-text">New Transaction</h2>
          <button
            type="button"
            onClick={startClose}
            aria-label="Close drawer"
            className="text-text-muted hover:text-text text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto">
          <form id="add-tx-form" onSubmit={handleSubmit} className="flex flex-col gap-5 p-5">
            <TypeToggle value={form.type} onChange={set('type')} />

            <AmountInput
              value={form.amount}
              onChange={set('amount')}
              currencySymbol={preference?.defaultCurrency.symbol ?? '₹'}
              error={errors.amount}
            />

            <FieldPicker
              label="Currency"
              value={form.currency}
              onChange={set('currency')}
              options={currencyOptions}
              required
              error={errors.currency}
            />

            <FieldPicker
              label="Category"
              value={form.category}
              onChange={set('category')}
              options={preference?.categories ?? []}
              required
              error={errors.category}
            />

            {filteredSubCats.length > 0 && (
              <FieldPicker
                label="Sub-category"
                value={form.subCategory}
                onChange={set('subCategory')}
                options={filteredSubCats}
              />
            )}

            <FieldPicker
              label="Vendor"
              value={form.vendor}
              onChange={set('vendor')}
              options={preference?.vendors ?? []}
              required
              allowFreeText
              error={errors.vendor}
            />

            <FieldPicker
              label="Account"
              value={form.account}
              onChange={set('account')}
              options={preference?.accounts ?? []}
              required
              error={errors.account}
            />

            <FieldPicker
              label="Payment"
              value={form.payment}
              onChange={set('payment')}
              options={preference?.payments ?? []}
              required
              error={errors.payment}
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="drawer-date" className="text-sm font-semibold text-text">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="drawer-date"
                type="date"
                value={form.date}
                onChange={(e) => set('date')(e.target.value)}
                className="rounded-xl border border-border px-4 py-3 text-sm bg-surface outline-none focus:ring-2 focus:ring-brand/30 text-text"
              />
              {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="drawer-notes" className="text-sm font-semibold text-text">Notes</label>
              <textarea
                id="drawer-notes"
                value={form.notes}
                onChange={(e) => set('notes')(e.target.value)}
                rows={3}
                placeholder="Optional notes…"
                className="rounded-xl border border-border px-4 py-3 text-sm bg-surface outline-none focus:ring-2 focus:ring-brand/30 text-text resize-none"
              />
            </div>

            {mutateError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                {mutateError.message}
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={startClose}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-text hover:bg-surface-alt transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-tx-form"
            disabled={loading}
            className="flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: 'var(--brand-gradient)' }}
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
```

- [ ] **Step 4: Run the drawer tests to confirm they pass**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && npm run test -- --reporter=verbose src/components/transactions/AddTransactionDrawer.test.tsx
```

Expected: all 5 tests **PASS**.

- [ ] **Step 5: Run the full suite to confirm nothing is broken**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && npm run test
```

Expected: all existing tests pass plus the 5 new ones.

- [ ] **Step 6: Commit**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && git add src/components/transactions/AddTransactionDrawer.tsx src/components/transactions/AddTransactionDrawer.test.tsx && git commit -m "feat: add AddTransactionDrawer component with slide animation"
```

---

### Task 3: Wire DailyTransactions to the drawer + update Dashboard

**Files:**
- Modify: `src/components/dashboard/DailyTransactions.tsx`
- Modify: `src/components/dashboard/DailyTransactions.test.tsx`
- Modify: `src/routes/Dashboard.tsx`

- [ ] **Step 7: Update the DailyTransactions test first (TDD)**

In `src/components/dashboard/DailyTransactions.test.tsx`:

1. Add mock for `AddTransactionDrawer` at the top (after existing `vi.mock` calls — there are none, so add it before the import):

```tsx
vi.mock('../transactions/AddTransactionDrawer', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="New Transaction">drawer</div> : null,
}));
```

2. Replace the entire `describe('DailyTransactions — Add link', ...)` block (lines 201–208) with:

```tsx
describe('DailyTransactions — Add button', () => {
  it('renders an Add button (not a navigation link to /app/transactions/new)', () => {
    renderDT([]);
    expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /add/i })).not.toBeInTheDocument();
  });

  it('clicking Add opens the drawer', async () => {
    renderDT([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add transaction/i }));
    expect(screen.getByRole('dialog', { name: /new transaction/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run updated DailyTransactions tests to confirm they fail**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && npm run test -- --reporter=verbose src/components/dashboard/DailyTransactions.test.tsx
```

Expected: the two new "Add button" tests **FAIL** (DailyTransactions still has the old Link). All other tests **PASS**.

- [ ] **Step 9: Update DailyTransactions.tsx**

In `src/components/dashboard/DailyTransactions.tsx`:

1. Add the import at the top (after the existing imports):

```tsx
import AddTransactionDrawer from '../transactions/AddTransactionDrawer';
```

2. Add `onTransactionAdded` to the props interface:

```tsx
interface DailyTransactionsProps {
  transactions: Transaction[];
  currencySymbol: string;
  onDelete: (id: string) => void;
  onTransactionAdded?: () => void;
}
```

3. Destructure it in the function signature:

```tsx
export default function DailyTransactions({
  transactions,
  currencySymbol,
  onDelete,
  onTransactionAdded,
}: DailyTransactionsProps) {
```

4. Add `drawerOpen` state directly after the existing `useState` calls:

```tsx
const [drawerOpen, setDrawerOpen] = useState(false);
```

5. Replace the `<Link to="/app/transactions/new" ...>` element (lines 111–118) with a button:

```tsx
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-gradient)' }}
            aria-label="Add transaction"
          >
            + Add
          </button>
```

6. Add the drawer just before the closing `</div>` of the component's return (after the transaction list section):

```tsx
      <AddTransactionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { onTransactionAdded?.(); }}
      />
```

- [ ] **Step 10: Update Dashboard.tsx to pass refetch as onTransactionAdded**

In `src/routes/Dashboard.tsx`, find the `<DailyTransactions` usage and add the new prop:

```tsx
          <DailyTransactions
            transactions={allTxns}
            currencySymbol={currencySymbol}
            onDelete={(id) => setDeletingId(id)}
            onTransactionAdded={refetch}
          />
```

- [ ] **Step 11: Run DailyTransactions tests to confirm they all pass**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && npm run test -- --reporter=verbose src/components/dashboard/DailyTransactions.test.tsx
```

Expected: all tests **PASS** including the 2 new "Add button" tests.

- [ ] **Step 12: Run the full test suite**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && npm run test
```

Expected: all tests pass (previous count + 7 new tests total across both files).

- [ ] **Step 13: Commit**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && git add src/components/dashboard/DailyTransactions.tsx src/components/dashboard/DailyTransactions.test.tsx src/routes/Dashboard.tsx && git commit -m "feat: wire AddTransactionDrawer into DailyTransactions widget"
```
