# Category Breakdown — Multi-Dimension GroupBy Design

**Date:** 2026-05-24
**Status:** Approved

## Overview

Extend the Category Breakdown dashboard widget to support five grouping dimensions: Category (existing), Account, Currency, Vendor, and Payment. A dropdown at the top of the widget lets the user switch dimensions. Clicking any top-level item drills down into a category → sub-category → transactions path identical to the current category-only flow.

## Grouping Dimensions

| Value        | Field on `Transaction` |
| ------------ | ---------------------- |
| `'category'` | `t.category`           |
| `'account'`  | `t.account`            |
| `'currency'` | `t.currency`           |
| `'vendor'`   | `t.vendor`             |
| `'payment'`  | `t.payment`            |

## State Shape (`Dashboard.tsx`)

```typescript
type GroupBy = 'category' | 'account' | 'currency' | 'vendor' | 'payment';

interface DrillState {
  groupBy: GroupBy;
  path: string[]; // breadcrumb of items the user clicked into
}
```

Initial state: `{ groupBy: 'category', path: [] }`.

Level is `path.length`. Maximum depth depends on groupBy:

- `'category'`: max depth 2 → `[category, subCategory]` → transactions
- all others: max depth 3 → `[groupItem, category, subCategory]` → transactions

### State Transitions

| Action                | New State                              |
| --------------------- | -------------------------------------- |
| Click item            | `{ groupBy, path: [...path, name] }`   |
| Back button           | `{ groupBy, path: path.slice(0, -1) }` |
| Switch expense/income | `{ groupBy, path: [] }`                |
| Change period         | `{ groupBy, path: [] }`                |
| Change groupBy        | `{ groupBy: newGroupBy, path: [] }`    |

The groupBy selection **persists** when switching expense/income and when navigating periods. It only resets when the user explicitly changes it via the dropdown.

## Item Computation Logic (`categoryItems` memo)

```
const filteredTxns = heroTxns filtered by mode (expense or income)

if groupBy === 'category':
  path.length = 0 → group by t.category
  path.length = 1 → filter t.category === path[0], group by t.subCategory
  path.length = 2 → filter t.category === path[0] && t.subCategory === path[1]
                  → return transactions (passed via drillTransactions)

else (account | currency | vendor | payment):
  path.length = 0 → group by t[groupBy]
  path.length = 1 → filter t[groupBy] === path[0], group by t.category
  path.length = 2 → filter t[groupBy] === path[0] && t.category === path[1],
                    group by t.subCategory
  path.length = 3 → filter all three → return transactions
```

Grouping always produces `CategoryItem[]` sorted descending by total, with `pct` computed as share of the filtered total for that level.

## Header Label Derivation (`Dashboard.tsx`)

```typescript
drillLevel = path.length;
drillLabel = path.at(-1); // current item
backLabel = path.length === 1 ? '← Back' : `← ${path.at(-2)}`;
onBack = () => setDrillState({ groupBy, path: path.slice(0, -1) });
```

## `CategoryBreakdown` Component Changes

### Updated Props

`GroupBy` is defined and **exported** from `CategoryBreakdown.tsx` (same pattern as `Mode` today). `Dashboard.tsx` imports it as a named type.

```typescript
type GroupBy = 'category' | 'account' | 'currency' | 'vendor' | 'payment';

interface CategoryBreakdownProps {
  categories: CategoryItem[];
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  currencySymbol: string;
  groupBy: GroupBy; // NEW
  onGroupByChange: (g: GroupBy) => void; // NEW
  drillLevel?: number; // was 0|1|2, now number
  drillLabel?: string;
  backLabel?: string;
  onItemClick?: (name: string) => void;
  onBack?: () => void;
  transactions?: Transaction[];
}
```

### Header Rendering

**`drillLevel === 0` (path.length = 0):**

- Left: `<select>` GroupBy dropdown (Category / Account / Currency / Vendor / Payment)
- Right: Expense / Income toggle
- No title text

**`drillLevel > 0` (drilling):**

- Left: back button (`backLabel`) + current item label (`drillLabel`)
- Right: nothing — both the dropdown and the expense/income toggle are hidden

### Transactions Gate

Change `drillLevel === 2 && transactions` → `transactions !== undefined`.
Dashboard controls when to pass the `transactions` prop (at max drill depth for the active groupBy), so the component is level-agnostic.

## Files Changed

| File                                                  | Change                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/components/dashboard/CategoryBreakdown.tsx`      | Add GroupBy dropdown, update header logic, relax drillLevel type, fix transactions gate                      |
| `src/routes/Dashboard.tsx`                            | Replace DrillState union with path-based state, extend categoryItems/drillTransactions memos, wire new props |
| `src/components/dashboard/CategoryBreakdown.test.tsx` | Update smoke test for new required props                                                                     |

No changes to `firestore/types.ts`, hooks, or any other component.

## Out of Scope

- Persisting the selected groupBy to Firestore preferences (can be added later)
- Showing the active groupBy label in the IncomeExpenseDonut subtitle
- Any changes to the TransactionList route or other dashboard widgets
