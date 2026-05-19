# Add Transaction Drawer — Design Spec

**Date:** 2026-05-19

## Overview

Replace the full-page navigation to `/app/transactions/new` with a right-side slide-in drawer. The drawer opens when the user clicks the "+" button in the DailyTransactions dashboard widget, contains the full add-mode form, and slides back out after saving or cancelling. The edit-mode full-page route is unchanged.

## Architecture

### Files

| File | Change |
|------|--------|
| `src/components/transactions/AddTransactionDrawer.tsx` | **New.** Drawer shell + slide animation + full add-mode form logic |
| `src/components/transactions/AddTransactionDrawer.test.tsx` | **New.** Smoke tests for open/close/cancel/backdrop |
| `src/components/dashboard/DailyTransactions.tsx` | Replace `<Link to="/app/transactions/new">` with `drawerOpen` state + `<AddTransactionDrawer>` |
| `src/components/dashboard/DailyTransactions.test.tsx` | Update: click opens drawer, not navigates |
| `src/routes/TransactionForm.tsx` | No change — edit mode continues using full-page route |
| `src/routes/AppShell.tsx` | No change |
| `src/App.tsx` | No change — `/app/transactions/new` route stays registered |

### Component boundary

`AddTransactionDrawer` is self-contained:
- Owns form state (`FormState`), validation errors, and loading state
- Calls `useAddTransaction` and `usePreferenceContext` internally
- Seeds defaults from `preference` each time `open` transitions `false → true`
- Accepts three props: `open: boolean`, `onClose: () => void`, `onSaved: () => void`

`DailyTransactions` owns `drawerOpen: boolean`. On successful save the drawer calls `onSaved` (which calls `refetch()`) then begins its close animation.

## Animation & UX Behaviour

### Open sequence (triggered by "+" click)
1. Portal mounts on `document.body`
2. Backdrop: `opacity-0 → opacity-100` over 200 ms
3. Panel: `translate-x-full → translate-x-0` over 300 ms ease-out
4. Both transitions start simultaneously

### Close sequence (save, cancel, backdrop click, or Escape)
1. Panel: `translate-x-0 → translate-x-full` over 250 ms ease-in
2. Backdrop fades out in parallel
3. After 250 ms `onClose()` fires — parent sets `drawerOpen = false`
4. On save path: `onSaved()` fires before the animation starts, so the list refetches immediately while the drawer slides out

### Close triggers
- Save button (after successful Firestore write)
- Cancel button
- Clicking the backdrop
- Pressing Escape key

### Form reset
Form state resets to `EMPTY` + preference defaults each time `open` transitions from `false → true` (via `useEffect` on the `open` prop).

## Visual Spec

- Panel width: `w-[480px] max-w-[100vw]` — full-width on small screens, fixed 480 px on desktop
- Panel height: full viewport (`h-screen`), right-anchored, scrollable internally
- Backdrop: `bg-black/40`, covers full viewport
- Z-index: portal on `document.body` sits above all app content
- Panel background: `card-surface` with existing brand styling
- Header: "New Transaction" title + close (×) button
- Footer: Cancel + Save buttons (same styling as current `TransactionForm`)

## Form Content

Identical fields to the current add-mode `TransactionForm`:
- TypeToggle (expense / income)
- AmountInput
- Currency FieldPicker
- Category FieldPicker
- Sub-category FieldPicker (conditional)
- Vendor FieldPicker (free-text allowed)
- Account FieldPicker
- Payment FieldPicker
- Date input
- Notes textarea
- Validation error messages

## Testing

### `AddTransactionDrawer.test.tsx`
- Drawer is not in the DOM when `open={false}`
- Drawer is in the DOM when `open={true}`
- Clicking Cancel calls `onClose`
- Clicking the backdrop calls `onClose`
- Pressing Escape calls `onClose`

### `DailyTransactions.test.tsx` (update existing)
- Clicking "+" opens the drawer (drawer visible), does NOT navigate to `/app/transactions/new`

## Out of Scope

- No drawer entry point from the Transactions list page
- No shared `TransactionFormFields` abstraction between add drawer and edit page
- No animation timing tests
- `/app/transactions/new` route remains but is no longer the primary UX path
