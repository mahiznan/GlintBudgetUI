# Global FAB (Floating Action Button) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline "+ Add" button in the DailyTransactions widget header with a global FAB fixed to the bottom-right of every `/app/*` page.

**Architecture:** The FAB lives in `AppShell`, which already wraps every authenticated page. It manages its own `fabOpen` state and renders a single `AddTransactionDrawer` (new-transaction mode). `AppShell` calls `useTransactionContext().refetch` on save — the provider already wraps the whole app in `App.tsx`. The DailyTransactions drawer remains for editing only; only its Add button is removed.

**Tech Stack:** React, TypeScript, Vitest + React Testing Library, Tailwind CSS v4

---

## File Map

| File                                                  | Change                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/components/dashboard/DailyTransactions.tsx`      | Remove the "+ Add" `<button>` from the widget header                                        |
| `src/components/dashboard/DailyTransactions.test.tsx` | Replace "Add button" describe block with a single test asserting the button is absent       |
| `src/routes/AppShell.tsx`                             | Add `fabOpen` state, `useTransactionContext`, FAB button, `AddTransactionDrawer`            |
| `src/routes/AppShell.test.tsx`                        | Add mocks for `TransactionContext` and `AddTransactionDrawer`; add FAB render + click tests |

---

## Task 1: Remove Add button from DailyTransactions (TDD)

**Files:**

- Modify: `src/components/dashboard/DailyTransactions.test.tsx:214-245`
- Modify: `src/components/dashboard/DailyTransactions.tsx:286-295`

### Step 1: Update the test file — replace the "Add button" describe block

The existing `describe('DailyTransactions — Add button', ...)` block (lines 214–245) has three tests that look for the Add button. Replace the **entire block** with a single test asserting the button is gone:

```tsx
describe('DailyTransactions — Add button', () => {
  it('does not render an Add transaction button (moved to global FAB)', () => {
    renderDT([]);
    expect(screen.queryByRole('button', { name: /add transaction/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — verify 3 old tests disappear and 1 new test fails**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && npm run test -- DailyTransactions 2>&1 | tail -20
```

Expected: The new "does not render an Add transaction button" test **fails** (the button still exists in the component). All other tests in the file pass.

- [ ] **Step 3: Remove the Add button from `DailyTransactions.tsx`**

In `src/components/dashboard/DailyTransactions.tsx`, find the "+ Add" button in the header section. It looks like this (around line 286):

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

Delete those 8 lines entirely. The header's right-side `<div>` containing "See all →" and the Add button should now contain only the "See all →" link:

```tsx
<div className="flex items-center gap-2">
  <Link
    to="/app/transactions"
    className="text-xs font-medium"
    style={{
      background: 'var(--brand-gradient-text)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}
  >
    See all →
  </Link>
</div>
```

- [ ] **Step 4: Run tests — verify all DailyTransactions tests pass**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && npm run test -- DailyTransactions 2>&1 | tail -10
```

Expected: all tests pass including the new "does not render an Add transaction button" test.

- [ ] **Step 5: Commit**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && git add src/components/dashboard/DailyTransactions.tsx src/components/dashboard/DailyTransactions.test.tsx && git commit -m "feat: remove inline Add button from DailyTransactions widget"
```

---

## Task 2: Add global FAB to AppShell (TDD)

**Files:**

- Modify: `src/routes/AppShell.test.tsx`
- Modify: `src/routes/AppShell.tsx`

- [ ] **Step 1: Add mocks to `AppShell.test.tsx`**

The existing `AppShell.test.tsx` mocks firebase and ThemeContext but not `TransactionContext` or `AddTransactionDrawer`. The new FAB requires both. Add these two `vi.mock` calls at the **top of the file**, before the existing mocks (mocks must be at the top, before any imports):

```tsx
vi.mock('../context/TransactionContext', () => ({
  useTransactionContext: () => ({
    transactions: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../components/transactions/AddTransactionDrawer', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? (
      <div role="dialog" aria-label="New Transaction">
        drawer
      </div>
    ) : null,
}));
```

The full top of the file should now read:

```tsx
vi.mock('../context/TransactionContext', () => ({
  useTransactionContext: () => ({
    transactions: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../components/transactions/AddTransactionDrawer', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? (
      <div role="dialog" aria-label="New Transaction">
        drawer
      </div>
    ) : null,
}));

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';

vi.mock('../firebase/client', () => ({ auth: { kind: 'mock-auth' }, app: {} }));
vi.mock('../firebase/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOutCurrentUser: vi.fn(),
}));
vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'doc-ref'),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
}));
vi.mock('../context/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    themeId: 'lime',
    setTheme: vi.fn().mockResolvedValue(undefined),
  })),
}));

import AppShell from './AppShell';
```

Also add `userEvent` to the import line:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
```

- [ ] **Step 2: Add FAB tests to `AppShell.test.tsx`**

Append a new describe block at the end of the file:

```tsx
describe('AppShell — FAB', () => {
  it('renders an "Add transaction" FAB button', () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument();
  });

  it('clicking the FAB opens the AddTransactionDrawer', async () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add transaction/i }));
    expect(screen.getByRole('dialog', { name: /new transaction/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests — verify the two new FAB tests fail**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && npm run test -- AppShell 2>&1 | tail -20
```

Expected: the two new FAB tests fail (FAB not in AppShell yet). All existing AppShell tests pass.

- [ ] **Step 4: Update `AppShell.tsx` with the FAB and drawer**

Replace the entire contents of `src/routes/AppShell.tsx` with:

```tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import type { Period } from '../lib/dateUtils';
import { useAuth } from '../auth/AuthContext';
import { useTransactionContext } from '../context/TransactionContext';
import Sidebar from '../components/layout/Sidebar';
import AddTransactionDrawer from '../components/transactions/AddTransactionDrawer';

export interface AppShellOutletContext {
  period: Period;
  setPeriod: (p: Period) => void;
}

export default function AppShell() {
  const auth = useAuth();
  const { refetch } = useTransactionContext();
  const [period, setPeriod] = useState<Period>('month');
  const [fabOpen, setFabOpen] = useState(false);

  if (auth.status !== 'authenticated') return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-surface-alt">
        <div className="max-w-5xl mx-auto w-full">
          <Outlet context={{ period, setPeriod } satisfies AppShellOutletContext} />
        </div>
      </main>
      <button
        type="button"
        onClick={() => setFabOpen(true)}
        aria-label="Add transaction"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center transition-opacity hover:opacity-90"
        style={{ background: 'var(--brand-gradient)', boxShadow: '0 4px 20px var(--brand-glow)' }}
      >
        +
      </button>
      <AddTransactionDrawer open={fabOpen} onClose={() => setFabOpen(false)} onSaved={refetch} />
    </div>
  );
}
```

- [ ] **Step 5: Run all tests and typecheck**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && npm run test 2>&1 | tail -10
npm run typecheck 2>&1 | tail -10
```

Expected: all tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && git add src/routes/AppShell.tsx src/routes/AppShell.test.tsx && git commit -m "feat: add global FAB to AppShell for adding transactions"
```

---

## Task 3: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI && npm run dev
```

Open `http://localhost:5173` and sign in.

- [ ] **Step 2: Verify FAB is visible on all app pages**

Navigate to Dashboard, Transactions, and Settings. The "+" FAB should appear fixed at the bottom-right on every page.

- [ ] **Step 3: Verify FAB opens the drawer for a new transaction**

Click the FAB. The `AddTransactionDrawer` should slide in, pre-filled with today's date, in "New Transaction" mode (not edit mode). Add a transaction and confirm it appears in the dashboard.

- [ ] **Step 4: Verify DailyTransactions widget no longer has an Add button**

The DailyTransactions widget header should show only "TRANSACTIONS", "Today", the calendar icon, and "See all →". No "+ Add" button.

- [ ] **Step 5: Verify DailyTransactions edit flow still works**

Click the ✏️ edit button on a transaction in the DailyTransactions widget. Confirm the edit drawer opens with the transaction pre-filled.
