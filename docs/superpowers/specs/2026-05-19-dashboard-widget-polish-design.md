# Dashboard Widget Polish — Expense Gradient, Category Donut, QuickStats Filter

**Date:** 2026-05-19
**Status:** Approved

## Overview

Three targeted improvements to the dashboard right-column widgets:

1. **Expense button gradient** — match the Income button's visual treatment with a light-to-dark red gradient
2. **IncomeExpenseDonut driven by category data** — show category breakdown slices (synced with the CategoryBreakdown mode toggle) instead of a two-slice income-vs-expense donut
3. **QuickStats currency + account filter** — apply the same `heroTxns` filter already used by HeroStatsRow and CategoryBreakdown

## Scope

| File | Change |
|---|---|
| `src/styles/index.css` | Add `--expense-gradient` CSS variable |
| `src/components/dashboard/CategoryBreakdown.tsx` | Lift mode+categories to props; export `CategoryItem` type |
| `src/components/dashboard/CategoryBreakdown.test.tsx` | Update for new prop interface |
| `src/components/dashboard/IncomeExpenseDonut.tsx` | Replace income/expenses props with mode+categories; render category slices |
| `src/components/dashboard/IncomeExpenseDonut.test.tsx` | Update for new prop interface |
| `src/routes/Dashboard.tsx` | Own `categoryMode` state + `categoryItems` memo; pass to both widgets; pass `heroTxns` to QuickStats |

No changes to QuickStats component itself — only the prop passed from Dashboard changes.

---

## Change 1: Expense Button Gradient

### CSS

Add to `:root` block in `src/styles/index.css` (after `--brand-gradient`):

```css
--expense-gradient: linear-gradient(135deg, #f87171, #dc2626);
```

This is a fixed red gradient (not theme-dependent — expense/danger is always red).

### CategoryBreakdown button

Replace the active Expense button's class-based solid color with an inline style, mirroring the Income button pattern:

**Before:**
```tsx
mode === m && m === 'expense' ? 'bg-red-600 text-white shadow-sm' : ...
```

**After:**
```tsx
// class: 'text-white shadow-sm' (no bg-* class)
// style: { background: 'var(--expense-gradient)' }  when mode === 'expense'
```

Both active buttons now use `style={{ background: 'var(--...)' }}` and `text-white shadow-sm`.

---

## Change 2: IncomeExpenseDonut Category Slices

### State lift

`mode` and `categoryItems` move from CategoryBreakdown's internal state/memo to Dashboard:

```tsx
// Dashboard.tsx
const [categoryMode, setCategoryMode] = useState<'expense' | 'income'>('expense');

const categoryItems = useMemo(() => {
  const filtered =
    categoryMode === 'expense'
      ? heroTxns.filter((t) => t.amount < 0)
      : heroTxns.filter((t) => t.amount > 0);
  const totals = filtered.reduce<Record<string, { total: number; icon: string }>>(
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
}, [heroTxns, categoryMode]);
```

### CategoryBreakdown new interface

```tsx
export interface CategoryItem {
  name: string;
  icon: string;
  total: number;
  pct: number;
}

interface CategoryBreakdownProps {
  categories: CategoryItem[];
  mode: 'expense' | 'income';
  onModeChange: (mode: 'expense' | 'income') => void;
  currencySymbol: string;
}
```

The `transactions` prop is removed. The component renders exactly as before but reads `mode`/`categories` from props.

### IncomeExpenseDonut new interface

```tsx
interface IncomeExpenseDonutProps {
  categories: CategoryItem[];
  mode: 'expense' | 'income';
  currencySymbol: string;
}
```

**Chart:** one `<Cell>` per category, colored with `theme.categoryColors[i % length]` (same palette as the bar chart above).

**Center text:** total amount (sum of all displayed categories), formatted with `currencySymbol`. Sub-label: `"expenses"` or `"income"` based on mode.

**Widget title:** dynamic — `"Expense by Category"` or `"Income by Category"`.

**Legend:** one dot+label per category (up to 5), using the same `theme.categoryColors`. Replaces the two-item Income/Expenses legend.

**Empty state:** if `categories.length === 0`, show `"No {mode === 'expense' ? 'expenses' : 'income'} for this period"` in place of the chart.

### Dashboard wiring

```tsx
<CategoryBreakdown
  categories={categoryItems}
  mode={categoryMode}
  onModeChange={setCategoryMode}
  currencySymbol={currencySymbol}
/>

<IncomeExpenseDonut
  categories={categoryItems}
  mode={categoryMode}
  currencySymbol={currencySymbol}
/>
```

---

## Change 3: QuickStats Filter

In `Dashboard.tsx`, change:

```tsx
<QuickStats transactions={periodTxns} currencySymbol={currencySymbol} />
```

to:

```tsx
<QuickStats transactions={heroTxns} currencySymbol={currencySymbol} />
```

No changes to `QuickStats.tsx` itself.

---

## Tests

### CategoryBreakdown.test.tsx

Rewrite to use new props (`categories`, `mode`, `onModeChange`). Key tests:

- Renders heading and Expense/Income buttons
- Active Expense button has correct gradient style (no `bg-red-600` class; has `var(--expense-gradient)` inline style)
- Renders provided `categories` in expense mode
- Calls `onModeChange('income')` when Income button clicked
- Shows mode-aware empty state when `categories` is empty

### IncomeExpenseDonut.test.tsx

Rewrite to use new props (`categories`, `mode`). Key tests:

- Renders dynamic title: "Expense by Category" / "Income by Category"
- Renders legend entries for each provided category
- Shows empty state when `categories` is empty
- Center text shows formatted total

---

## Out of Scope

- Persisting `categoryMode` across navigation
- Changing `QuickStats.tsx` internals
- SpendingChart filter (intentionally shows all-currency data)
