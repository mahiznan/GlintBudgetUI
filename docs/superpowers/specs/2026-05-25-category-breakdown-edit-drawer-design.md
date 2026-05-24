# CategoryBreakdown Edit via Drawer

**Date:** 2026-05-25
**Status:** Approved

## Problem

When a user drills down to the transaction list in `CategoryBreakdown` and taps a row, they are navigated to the full `/app/transactions/:id/edit` page, leaving the dashboard. This breaks flow — the user loses their drill-down context and must navigate back.

## Solution

Replace the `<Link>` with a button that opens the existing `AddTransactionDrawer` (already used by `DailyTransactions` for editing), keeping the user on the dashboard. Dashboard manages the edit state and calls `refetch()` on save.

## Changes

### `CategoryBreakdown` (`src/components/dashboard/CategoryBreakdown.tsx`)

- Add `onEdit?: (id: string) => void` to `CategoryBreakdownProps`
- In the drilled-transaction list (where `transactions` prop is defined), replace:
  ```tsx
  <Link to={`/app/transactions/${t.id}/edit`} ...>
  ```
  with:
  ```tsx
  <button type="button" onClick={() => onEdit?.(t.id)} ...>
  ```
  Same visual style as the existing link (icon, vendor, date, amount row). If `onEdit` is not provided, the button renders but does nothing.

### `Dashboard` (`src/routes/Dashboard.tsx`)

- Add state: `const [editingId, setEditingId] = useState<string | null>(null)`
- Import `AddTransactionDrawer`
- Pass `onEdit={(id) => setEditingId(id)}` to the `CategoryBreakdown` render
- Render `AddTransactionDrawer` (alongside existing `DeleteConfirmDialog`):
  - `open={editingId !== null}`
  - `editId={editingId ?? undefined}`
  - `onClose={() => setEditingId(null)}`
  - `onSaved={() => { setEditingId(null); refetch(); }}`
  - `transactions={periodTxns}` (for vendor suggestions)

### Tests (`src/components/dashboard/CategoryBreakdown.test.tsx`)

- Update the drilled-transaction assertion: instead of checking for a `<Link>` with `/edit` href, verify that clicking the row calls `onEdit` with the correct transaction id.

## What does NOT change

- `AddTransactionDrawer` — no changes needed; it already supports `editId`
- `DailyTransactions` — no changes needed; its own edit drawer is unaffected
- The `/app/transactions/:id/edit` route — still exists for direct URL access
- Drill-down navigation in `CategoryBreakdown` — unchanged

## Success criteria

- Tapping a drilled-down transaction row opens the edit drawer on the dashboard (no navigation)
- Saving a change calls `refetch()`, updating all dashboard widgets
- Closing the drawer without saving leaves the dashboard unchanged
- Existing `DailyTransactions` edit drawer is unaffected
- `CategoryBreakdown` tests pass with the updated assertion
