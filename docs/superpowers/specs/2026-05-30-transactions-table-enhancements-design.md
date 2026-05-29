# Transactions Table Enhancements — Design Spec

**Date:** 2026-05-30
**Status:** Approved

## Overview

Four enhancements to the Transactions page:

1. Restructure column 1 — SubCategory as primary, Vendor below (Account removed)
2. Sortable column headers (all except Actions)
3. Zebra-stripe alternating rows aligned to theme tokens
4. Infinite scroll — newest first, load more on scroll
5. Single-field search bar above the table

Data is already fully in memory via `TransactionContext`, so all processing (search, sort, pagination) is client-side with no new Firestore queries.

---

## 1. Column 1 Restructure

**Current:** icon + vendor (bold) + account (muted below)
**New:** icon + subCategory (bold) + vendor (muted below)

`account` is removed from the row display entirely. The `tx.subCategory` field already exists on the `Transaction` type.

---

## 2. Sortable Columns

### SortKey type

```ts
export type SortKey = 'subCategory' | 'category' | 'date' | 'payment' | 'amount';
```

Defined and exported from `TransactionTable.tsx` (it belongs to the table's public contract). Imported in `TransactionList.tsx`.

### Header behaviour

- Each of the 5 data columns is clickable.
- Clicking an inactive column → sorts by that column `asc`.
- Clicking the active column → toggles between `asc` and `desc`.
- The Actions column (`''`) has no sort; its header is visually muted and not interactive.

### Sort indicator

- Idle column: `⇅` in `text-text-muted` (slate-400 equivalent).
- Active column, `asc`: `↑` in `text-brand` (amber).
- Active column, `desc`: `↓` in `text-brand` (amber).

### Default sort

`sortKey = 'date'`, `sortDir = 'desc'` — newest transactions appear first.

### Sort logic (in `useMemo`)

```ts
[...searchFiltered].sort((a, b) => {
  const d = sortDir === 'asc' ? 1 : -1;
  switch (sortKey) {
    case 'subCategory': return d * a.subCategory.localeCompare(b.subCategory);
    case 'category':    return d * a.category.localeCompare(b.category);
    case 'date':        return d * (a.date.getTime() - b.date.getTime());
    case 'payment':     return d * a.payment.localeCompare(b.payment);
    case 'amount':      return d * (a.amount - b.amount);
  }
});
```

---

## 3. Zebra-Stripe Row Alternation

`TransactionRow`'s `<tr>` gains:

```
even:bg-surface-alt hover:bg-slate-100 transition-colors
```

- Odd rows: `bg-surface` (white) → hover `bg-slate-100`
- Even rows: `bg-surface-alt` (slate-50) → hover `bg-slate-100`

Uses the existing `--color-surface-alt` CSS variable so it follows future theme changes. `bg-slate-100` is the hover state for both row types — slightly darker than `surface-alt`, sufficient contrast without competing with amount colours.

---

## 4. Infinite Scroll

### State

`visibleCount: number` (default `25`) lives in `TransactionList`.

### Data pipeline (single `useMemo`)

```
transactions
  → filterByPeriod(period)           [existing]
  → search filter (searchQuery)      [new]
  → sort (sortKey, sortDir)          [new]
  → slice(0, visibleCount)           [new]
  → passed as `transactions` prop to TransactionTable
```

### Sentinel

A `<div ref={sentinelRef}>` renders **below** `<TransactionTable>` only when `visibleCount < sorted.length` (`hasMore`).

```tsx
{hasMore && (
  <div ref={sentinelRef} className="py-4 text-center text-text-muted text-sm">
    <div className="inline-block w-4 h-4 border-2 border-border border-t-brand rounded-full animate-spin mr-2 align-middle" />
    Loading more…
  </div>
)}
```

### Observer

```ts
useEffect(() => {
  const el = sentinelRef.current;
  if (!el) return;
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) setVisibleCount(n => n + 25);
  });
  observer.observe(el);
  return () => observer.disconnect();
}, [hasMore]); // re-attaches when sentinel mounts/unmounts
```

### Resets

`visibleCount` resets to `25` whenever `searchQuery`, `sortKey`, or `sortDir` changes (separate `useEffect` with those deps).

### End-of-list

When `!hasMore` the sentinel is not rendered; no "end of list" message needed — the absence of the spinner communicates completion.

---

## 5. Search Bar

A single `<input>` rendered in `TransactionList` above `<TransactionTable>`.

### Fields searched (case-insensitive substring)

`subCategory`, `vendor`, `category`, `payment`, `notes`

### Filter logic

```ts
const q = searchQuery.trim().toLowerCase();
const searchFiltered = q === ''
  ? periodFiltered
  : periodFiltered.filter(tx =>
      tx.subCategory.toLowerCase().includes(q) ||
      tx.vendor.toLowerCase().includes(q) ||
      tx.category.toLowerCase().includes(q) ||
      tx.payment.toLowerCase().includes(q) ||
      tx.notes.toLowerCase().includes(q)
    );
```

### UI

```tsx
<div className="relative">
  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">🔍</span>
  <input
    type="search"
    placeholder="Search transactions…"
    value={searchQuery}
    onChange={e => setSearchQuery(e.target.value)}
    className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
  />
</div>
```

No debounce needed — all filtering is synchronous in-memory.

---

## Component Changes

| File | Change |
|---|---|
| `src/routes/TransactionList.tsx` | Add `sortKey`, `sortDir`, `searchQuery`, `visibleCount` state; single `useMemo` pipeline; sentinel div + IntersectionObserver; search input above table |
| `src/components/transactions/TransactionTable.tsx` | Accept `sortKey`, `sortDir`, `onSort` props; render sortable `<th>` elements with indicators |
| `src/components/transactions/TransactionRow.tsx` | Column 1: show `subCategory` + `vendor`; add `even:bg-surface-alt hover:bg-slate-100` to `<tr>` |

No new files. No new external dependencies.

---

## Tests

- `TransactionRow.test.tsx` — update: assert `subCategory` renders as primary text, `vendor` renders below, `account` is absent.
- `TransactionTable.test.tsx` — update: pass required sort props; assert sortable headers render; assert non-sortable Actions column.
- `TransactionList.test.tsx` — add: assert search input is present; assert filtering works with a query that matches one transaction.

Infinite scroll is not unit-tested (IntersectionObserver is a browser API not available in jsdom). The behaviour is covered by the visual verification step.
