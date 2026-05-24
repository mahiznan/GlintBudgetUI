# Category Breakdown Edit via Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `<Link>` navigation in the CategoryBreakdown drilled-transaction list with a button that opens `AddTransactionDrawer` in-place, keeping the user on the dashboard.

**Architecture:** `CategoryBreakdown` gains an `onEdit?: (id: string) => void` prop. The drilled-transaction `<Link>` becomes a `<button>` that calls it. `Dashboard` manages `editingId` state and renders a single `AddTransactionDrawer`, calling `refetch()` on save — identical to the pattern already used by `DailyTransactions`.

**Tech Stack:** React, TypeScript, Vitest + React Testing Library, Tailwind CSS v4

---

## File Map

| File | Change |
|------|--------|
| `src/components/dashboard/CategoryBreakdown.tsx` | Add `onEdit` prop; replace `<Link>` with `<button>`; remove unused `Link` import |
| `src/components/dashboard/CategoryBreakdown.test.tsx` | Update drilled-transaction test: remove `MemoryRouter`, replace link-href assertion with `onEdit` callback check |
| `src/routes/Dashboard.tsx` | Add `editingId` state; import `AddTransactionDrawer`; pass `onEdit` to `CategoryBreakdown`; render drawer |

---

## Task 1: Update CategoryBreakdown tests (TDD — write failing tests first)

**Files:**
- Modify: `src/components/dashboard/CategoryBreakdown.test.tsx:192-232`

- [ ] **Step 1: Update the "renders transaction vendor names" test to remove MemoryRouter**

The `<Link>` will be gone, so `MemoryRouter` is no longer needed. Replace lines 192–212 in `CategoryBreakdown.test.tsx`:

```tsx
  it('renders transaction vendor names when transactions prop is passed', () => {
    const txns = [
      makeTxn('t1', 'Pizza Hut', new Date('2026-05-18')),
      makeTxn('t2', "Domino's", new Date('2026-05-15')),
    ];
    render(
      <CategoryBreakdown
        {...baseProps}
        categories={[makeCategory('Dining Out', 1000, 100)]}
        drillLevel={2}
        drillLabel="Dining Out"
        backLabel="← Food"
        onBack={vi.fn()}
        transactions={txns}
      />,
    );
    expect(screen.getByText('Pizza Hut')).toBeInTheDocument();
    expect(screen.getByText("Domino's")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Replace the link-href test with an onEdit callback test**

Replace lines 214–232 (the `'transaction rows link to the edit form...'` test) with:

```tsx
  it('calls onEdit with transaction id when a drilled transaction row is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const txns = [makeTxn('txn-abc', 'Pizza Hut', new Date())];
    render(
      <CategoryBreakdown
        {...baseProps}
        categories={[makeCategory('Dining Out', 500, 100)]}
        drillLevel={2}
        drillLabel="Dining Out"
        backLabel="← Food"
        onBack={vi.fn()}
        transactions={txns}
        onEdit={onEdit}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Pizza Hut/i }));
    expect(onEdit).toHaveBeenCalledWith('txn-abc');
  });
```

Also remove the `MemoryRouter` import from line 4 if it is now unused:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Transaction } from '../../firestore/types';
```

- [ ] **Step 3: Run the tests and verify the two updated tests fail**

```bash
npm run test -- CategoryBreakdown
```

Expected: the `'calls onEdit...'` test fails because `CategoryBreakdown` doesn't have `onEdit` yet, and the vendor-names test may warn about `MemoryRouter` being gone. All other tests in the file should still pass.

---

## Task 2: Update CategoryBreakdown component

**Files:**
- Modify: `src/components/dashboard/CategoryBreakdown.tsx`

- [ ] **Step 1: Remove the Link import and add onEdit to the props interface**

Replace line 1:
```tsx
import { Link } from 'react-router-dom';
```
with nothing (delete it — `Link` will no longer be used).

Add `onEdit?: (id: string) => void;` to `CategoryBreakdownProps` (after `transactions?`):

```tsx
interface CategoryBreakdownProps {
  categories: CategoryItem[];
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  currencySymbol: string;
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  drillLevel?: number;
  drillLabel?: string;
  backLabel?: string;
  onItemClick?: (name: string) => void;
  onBack?: () => void;
  transactions?: Transaction[];
  onEdit?: (id: string) => void;
}
```

Destructure `onEdit` in the function signature:

```tsx
export default function CategoryBreakdown({
  categories,
  mode,
  onModeChange,
  currencySymbol,
  groupBy,
  onGroupByChange,
  drillLevel = 0,
  drillLabel,
  backLabel,
  onItemClick,
  onBack,
  transactions,
  onEdit,
}: CategoryBreakdownProps) {
```

- [ ] **Step 2: Replace the Link with a button in the drilled-transaction list**

Find the `transactions.map((t) => (` block (currently renders a `<Link>`). Replace the entire `<Link>` element with a `<button>`:

```tsx
{transactions.map((t) => (
  <button
    key={t.id}
    type="button"
    onClick={() => onEdit?.(t.id)}
    className="w-full flex items-center gap-3 px-1 py-2 rounded-xl hover:bg-surface-alt transition-colors text-left"
  >
    <span className="text-lg w-6 text-center">{t.icon || '📦'}</span>
    <div className="flex-1 min-w-0">
      <span className="text-sm font-medium text-text truncate block">{t.vendor}</span>
      <span className="text-xs text-text-muted">{formatDateShort(t.date)}</span>
    </div>
    <span
      className={`text-xs font-bold flex-shrink-0 ${
        t.amount < 0 ? 'text-red-600' : 'text-brand'
      }`}
    >
      {t.amount < 0 ? '-' : '+'}
      {formatCurrency(Math.abs(t.amount), currencySymbol)}
    </span>
  </button>
))}
```

- [ ] **Step 3: Run the CategoryBreakdown tests and verify they all pass**

```bash
npm run test -- CategoryBreakdown
```

Expected: all tests pass, including the two updated ones.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/CategoryBreakdown.tsx src/components/dashboard/CategoryBreakdown.test.tsx
git commit -m "feat: replace CategoryBreakdown Link with onEdit callback button"
```

---

## Task 3: Wire edit drawer in Dashboard

**Files:**
- Modify: `src/routes/Dashboard.tsx`

- [ ] **Step 1: Import AddTransactionDrawer and add editingId state**

Add the import near the other component imports at the top of `Dashboard.tsx`:

```tsx
import AddTransactionDrawer from '../components/transactions/AddTransactionDrawer';
```

Add `editingId` state after the existing `deletingId` state declaration (around line 53):

```tsx
const [deletingId, setDeletingId] = useState<string | null>(null);
const [editingId, setEditingId] = useState<string | null>(null);
```

- [ ] **Step 2: Pass onEdit to CategoryBreakdown**

In the `CategoryBreakdown` JSX (around line 354), add the `onEdit` prop:

```tsx
<CategoryBreakdown
  categories={categoryItems}
  mode={categoryMode}
  onModeChange={handleModeChange}
  currencySymbol={activeCurrencySymbol}
  groupBy={drillState.groupBy}
  onGroupByChange={handleGroupByChange}
  drillLevel={drillState.path.length}
  drillLabel={drillState.path.at(-1) !== undefined ? formatPathLabel(drillState.path.at(-1)!) : undefined}
  backLabel={
    drillState.path.length === 1
      ? '← Back'
      : drillState.path.length > 1
        ? `← ${formatPathLabel(drillState.path.at(-2)!)}`
        : undefined
  }
  onBack={
    drillState.path.length > 0
      ? () => setDrillState((prev) => ({ ...prev, path: prev.path.slice(0, -1) }))
      : undefined
  }
  onItemClick={
    drillTransactions === undefined
      ? (name) =>
          setDrillState((prev) => ({ ...prev, path: [...prev.path, name] }))
      : undefined
  }
  transactions={drillTransactions}
  onEdit={(id) => setEditingId(id)}
/>
```

- [ ] **Step 3: Render AddTransactionDrawer alongside DeleteConfirmDialog**

Find the `{deletingId && <DeleteConfirmDialog ... />}` block at the bottom of the Dashboard JSX return and add the drawer after it:

```tsx
      {deletingId && (
        <DeleteConfirmDialog
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
      <AddTransactionDrawer
        open={editingId !== null}
        editId={editingId ?? undefined}
        onClose={() => setEditingId(null)}
        onSaved={refetch}
        transactions={periodTxns}
      />
```

- [ ] **Step 4: Run all tests and typecheck**

```bash
npm run test
npm run typecheck
```

Expected: all tests pass, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Dashboard.tsx
git commit -m "feat: open edit drawer from CategoryBreakdown drilled transactions"
```

---

## Task 4: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:5173` and sign in.

- [ ] **Step 2: Verify the edit drawer opens from the category widget**

1. Go to Dashboard.
2. In the CategoryBreakdown widget (right column), click a category row to drill down.
3. If a sub-category level exists, click through until the transaction list appears.
4. Click any transaction row.
5. Verify the `AddTransactionDrawer` slides in from the right with the transaction pre-filled.
6. Edit a field (e.g., change the vendor name) and click **Update**.
7. Verify the drawer closes and the dashboard data refreshes (the edited transaction is reflected in the category totals).

- [ ] **Step 3: Verify DailyTransactions edit drawer is unaffected**

1. In the DailyTransactions widget (left column), click the ✏️ edit button on any transaction.
2. Verify its own drawer opens and works correctly, independent of the CategoryBreakdown drawer.

- [ ] **Step 4: Verify closing without saving leaves data unchanged**

1. Open the edit drawer from a category row.
2. Change the amount.
3. Click **Cancel** or press **Escape**.
4. Verify the dashboard data is unchanged.
