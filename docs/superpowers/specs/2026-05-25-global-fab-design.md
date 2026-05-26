# Global FAB (Floating Action Button) Design

**Date:** 2026-05-25
**Status:** Approved

## Problem

The "Add transaction" button lives inline in the `DailyTransactions` widget header — a widget-specific location that is invisible on the Transactions and Settings pages. Users have to navigate to the Dashboard to add a transaction.

## Solution

Move the Add button to a global floating action button (FAB) fixed to the bottom-right corner of every `/app/*` page. The FAB lives in `AppShell`, is always accessible, and opens `AddTransactionDrawer` for a new transaction dated today.

## Changes

### `src/routes/AppShell.tsx`

- Import `useState` (already imported), `AddTransactionDrawer`, and `useTransactionContext`
- Add state: `const [fabOpen, setFabOpen] = useState(false)`
- Render a circular FAB button fixed to `bottom-6 right-6 z-50`:
  - Size: 56×56px (`w-14 h-14`)
  - Shape: fully rounded (`rounded-full`)
  - Background: `var(--brand-gradient)`
  - Shadow: `0 4px 20px var(--brand-glow)`
  - Content: white "+" at `text-2xl`
  - `aria-label="Add transaction"`
  - On click: `setFabOpen(true)`
- Render `<AddTransactionDrawer open={fabOpen} onClose={() => setFabOpen(false)} onSaved={refetch} />` immediately after the `<main>` element
  - No `selectedDate` prop → drawer defaults to today
  - No `editId` prop → always opens in "new transaction" mode
  - `onSaved={refetch}` → refreshes the TransactionContext after save
- `refetch` comes from `useTransactionContext()` — the provider wraps the whole app in `App.tsx`, so AppShell can access it

### `src/components/dashboard/DailyTransactions.tsx`

- Remove the "+ Add" `<button>` from the widget header (currently in the top-right beside "See all →")
- Everything else is unchanged:
  - `drawerOpen` and `editingId` state remain (used for the edit flow)
  - The `AddTransactionDrawer` instance in `DailyTransactions` remains (serves editing only)
  - `onEdit` handler on `DayPanel` rows is unchanged

### Tests

**`src/components/dashboard/DailyTransactions.test.tsx`**

- Remove or update any test that asserts the "+ Add" button is present or clicks it
- Add a test verifying the "+ Add" button is no longer rendered

**`src/routes/AppShell.test.tsx`**

- Add a smoke test: FAB button renders with `aria-label="Add transaction"`

## What does NOT change

- `AddTransactionDrawer` — no changes needed
- `DailyTransactions` edit flow — fully preserved
- `CategoryBreakdown` edit drawer (just implemented) — unaffected
- The `TransactionForm` route at `/app/transactions/:id/edit` — still exists

## Success criteria

- A circular "+" FAB is visible at `fixed bottom-6 right-6` on Dashboard, Transactions, and Settings pages
- Clicking it opens `AddTransactionDrawer` for a new transaction dated today
- After saving, the transaction list on Dashboard and Transactions page refreshes
- The inline "+ Add" button is gone from the DailyTransactions widget header
- DailyTransactions edit-via-drawer still works
- All existing tests pass
