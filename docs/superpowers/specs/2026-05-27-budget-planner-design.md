# Budget Planner — Design Spec

**Date:** 2026-05-27  
**Status:** Approved  
**Scope:** New feature on top of the existing Stage 4 (local-first sync) codebase.

---

## 1. Overview

Budget Planner lets users create any number of planners, each defining a time range, optional transaction filters, and planned budget amounts per category. The system compares planned vs actual spend from existing in-memory transaction data and renders the result as a swipeable carousel of widget cards on the Dashboard.

---

## 2. Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Planner management location | Inside Settings | Keeps main nav uncluttered |
| Currency selection | From `Preference.bookmarkedCurrencies` | Consistent with existing tracked currencies |
| Card tap action | Detail drawer (slide-up on mobile, modal on desktop) | No route change; fast to dismiss |
| Carousel position on Dashboard | Between `HeroStatsRow` and `SpendingChart` | Prime real estate without displacing stats |
| Data storage | New `budget_planners` Firestore collection (web-only for now) | No iOS coordination needed; same pattern as `transactions` |
| Period navigation on widget | Prev/Next arrows on card footer | Touch-friendly, minimal UI |
| Transaction data source | In-memory `TransactionContext` — no additional Firestore reads | All transactions already loaded on login |
| Category overflow in widget | Show max 8, inline expand for the rest | Fixed card height, no drawer required for expand |
| Chart visualisation | Horizontal budget bars + radial rings, user-toggleable per planner | Same toggle pattern as existing SpendingChart bar/line switch |
| Form layout | Single scrollable drawer | Faster for create and edit alike |

---

## 3. Firestore Data Model

### Collection: `budget_planners`

**Path:** `budget_planners/{plannerId}`  
**Security:** Same rules pattern as `transactions` — `request.auth.uid == resource.data.user_id`.

```typescript
interface BudgetPlanner {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  currency: string;            // must be in Preference.bookmarkedCurrencies

  active: boolean;             // false = hidden from dashboard
  archived: boolean;           // true = moved to planner history

  // Time range
  period: 'weekly' | 'monthly' | 'yearly' | 'custom';
  customStart?: Timestamp;     // only when period === 'custom'
  customEnd?: Timestamp;       // only when period === 'custom'

  // Recurring behaviour
  repeatable: boolean;
  // repeatable=false + period passes → auto-archived on next app load
  // repeatable=true  → period advances indefinitely; prev/next nav enabled

  // Optional transaction filters (empty array = no filter = include all)
  filterAccounts: string[];
  filterVendors:  string[];
  filterPayments: string[];

  // Budget allocations (only categories the user explicitly planned)
  // Categories not listed here become "unplanned" if transactions exist
  categoryBudgets: Array<{
    category: string;
    amount: number;            // 0 is valid — shows "no budget set" in widget
  }>;

  // Widget view preference — persisted so toggle survives refresh
  chartView: 'bar' | 'radial';

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes needed:**
- Composite: `user_id ASC, archived ASC, createdAt DESC` (dashboard active planners query)
- Composite: `user_id ASC, archived ASC` (settings planner list)

---

## 4. Architecture & Hooks

### 4.1 `usePlanners(uid)`

Firestore `onSnapshot` on `budget_planners` where `user_id == uid`. Returns `{ planners, loading, error }`. Follows the identical pattern to `useTransactions`.

On each snapshot, checks each non-repeatable planner: if its period end date is in the past, fires `archive()` automatically (fire-and-forget, same pattern as all mutations).

### 4.2 `useMutatePlanner()`

Fire-and-forget mutations following `useMutateTransaction` pattern:

```typescript
add(planner: Omit<BudgetPlanner, 'id' | 'createdAt' | 'updatedAt'>): string  // returns new UUID
update(id: string, patch: Partial<BudgetPlanner>): void
archive(id: string): void   // sets archived=true, active=false
remove(id: string): void    // hard delete
```

### 4.3 `usePlannerAggregation(planner, transactions, periodOffset)`

Pure computation — no Firestore, no side effects. Called inside `PlannerCard`.

**Steps:**
1. Compute `{ start, end }` for the planner's period + offset.
2. Filter `transactions` by: `date ∈ [start, end]`, `currency === planner.currency`, and optional `filterAccounts / filterVendors / filterPayments` (skip filter if array is empty).
3. Group filtered transactions by `category` → sum `amount`.
4. For each entry in `categoryBudgets`: look up actual spend, compute `remaining = amount - spent`, `pct = amount > 0 ? (spent / amount * 100) : 0`, `status = exceeded | near (≥80%) | ok | no-budget` (use `no-budget` when `amount === 0`).
5. Find categories in grouped transactions NOT in `categoryBudgets` → `unplanned` entries (`planned = 0`).
6. Sort order: `exceeded` → `near` → `ok` (by spend desc) → zero-spend configured → `unplanned`.

**Returns:**
```typescript
{
  dateRange: { start: Date; end: Date };
  periodLabel: string;          // e.g. "May 2025"
  isCurrentPeriod: boolean;
  summary: {
    totalPlanned: number;
    totalSpent: number;
    totalRemaining: number;     // can be negative
  };
  categoryResults: CategoryResult[];
  unplannedResults: CategoryResult[];
}

interface CategoryResult {
  category: string;
  planned: number;
  spent: number;
  remaining: number;
  pct: number;                  // capped at 100 for display; exceededPct for overflow label; 0 when planned===0
  status: 'exceeded' | 'near' | 'ok' | 'no-budget' | 'unplanned';
  // no-budget: category is in categoryBudgets with amount===0; shown with empty bar + "no budget set" label
  // unplanned: category has transactions but is not in categoryBudgets at all
}
```

### 4.4 Period Computation (`plannerUtils.ts`)

| Period | `offset=0` | `offset=-1` |
|--------|------------|-------------|
| `weekly` | Mon–Sun of current week | Mon–Sun of previous week |
| `monthly` | 1st–last of current month | 1st–last of previous month |
| `yearly` | Jan 1–Dec 31 current year | Jan 1–Dec 31 previous year |
| `custom` | `customStart`–`customEnd` | Not navigable (offset always 0) |

Non-repeatable planners: offset always 0; prev/next arrows hidden.

**Non-repeatable end date:** When `repeatable=false` and `period !== 'custom'`, the app computes and stores `customStart` / `customEnd` at creation time (from the current period at that moment). This gives a concrete end date for auto-archive. At creation, `period` is retained for display but `customStart`/`customEnd` are always populated for non-repeatable planners.

---

## 5. Component Hierarchy

```
src/
├── components/planner/
│   ├── BudgetPlannerCarousel.tsx       # horizontal scroll container + empty state
│   ├── BudgetPlannerCarousel.test.tsx
│   ├── PlannerCard.tsx                 # full widget card
│   ├── PlannerCard.test.tsx
│   ├── PlannerCategoryBar.tsx          # single bar row (reused in card + drawer)
│   ├── PlannerCategoryRadial.tsx       # single radial ring (reused in card + drawer)
│   ├── PlannerDetailDrawer.tsx         # full breakdown on card tap
│   ├── PlannerDetailDrawer.test.tsx
│   ├── PlannerForm.tsx                 # create/edit form (used in Settings)
│   └── PlannerForm.test.tsx
│
├── hooks/
│   ├── usePlanners.ts                  # onSnapshot subscription
│   ├── usePlanners.test.ts
│   ├── useMutatePlanner.ts             # add/update/archive/remove
│   ├── useMutatePlanner.test.tsx
│   ├── usePlannerAggregation.ts        # pure computation hook
│   └── usePlannerAggregation.test.ts
│
├── lib/
│   └── plannerUtils.ts                 # computePeriodRange, aggregateTransactions (pure, unit-testable)
│
├── routes/
│   └── Dashboard.tsx                   # adds <BudgetPlannerCarousel> between HeroStatsRow and SpendingChart
│
└── components/settings/
    ├── PlannerSettings.tsx             # list + archive + delete; opens PlannerForm drawer
    └── PlannerSettings.test.tsx
```

### 5.1 Data Flow

```
TransactionProvider (all txns in memory)
  └── Dashboard
        ├── HeroStatsRow
        ├── BudgetPlannerCarousel        ← usePlanners() for configs
        │     └── PlannerCard[]          ← usePlannerAggregation(planner, allTxns, offset)
        │           └── PlannerDetailDrawer (lazy-mounted on first open)
        └── SpendingChart / ...rest
```

---

## 6. PlannerCard Widget

### 6.1 Structure

```
┌─────────────────────────────────────┐
│ HEADER                              │
│  Name + date range      [bar|●] ←toggle
│  Planned / Spent / Remaining        │
├─────────────────────────────────────┤
│ CATEGORY LIST (bar OR radial view)  │
│  Up to 8 shown                      │
│  [+ X more]  ← expands inline       │
│  [↑ Show less] ← collapses          │
├─────────────────────────────────────┤
│ FOOTER (recurring planners only)    │
│  ‹ prev period   label   next › ›   │
└─────────────────────────────────────┘
```

### 6.2 Bar Row

- Category icon + name
- `$spent / $planned` label
- Colour-coded progress bar: green (`ok`) / orange (`near ≥80%`) / red (`exceeded`)
- Remaining label: `+$X remaining` (green) / `-$X exceeded` (red) / `$X left ⚠️` (near, orange)
- Unplanned categories: dashed separator, yellow "unplanned" badge, grey bar

### 6.3 Radial View

- 4-column grid of SVG rings
- Same colour logic as bar view
- Exceeded ring shows "Over" + `-$X` inside

### 6.4 Category Overflow

- Default: max 8 rows (exceeded/near-limit sorted first)
- `+ X more` chip expands the card inline — card height grows
- `↑ Show less` collapses back
- Both bar and radial views honour the same expand/collapse state independently

### 6.5 Toggle Persistence

`chartView` is stored on the `BudgetPlanner` document. When the user switches bar ↔ radial, `useMutatePlanner.update(id, { chartView })` fires immediately (fire-and-forget). The toggle state survives page refresh.

---

## 7. PlannerDetailDrawer

Opens on card tap (excluding toggle icon and prev/next arrows).

**Contents:**
1. Handle + close button
2. Planner name, date range, period navigation (prev/next)
3. Summary: total planned / spent / remaining
4. Full category list — no 8-cap, same bar style
5. Tapping a category row expands it inline:
   - Subcategory rows: name · total spend · % of category
   - Transaction list: date · vendor · amount (read-only)
   - Collapse arrow
6. Unplanned section with same drill-down treatment

---

## 8. PlannerForm (Settings Drawer)

Single scrollable drawer, opened from Settings → Budget Planners.

**Field order:**
1. **Name** (required) + **Description** (optional)
2. **Currency** — dropdown from `Preference.bookmarkedCurrencies`
3. **Period** — segmented control: Weekly / Monthly / Yearly / Custom
   - Custom: date range picker for start + end
4. **Repeatable** toggle
5. **Filters** (empty = include all)
   - Accounts: multi-select chips from `Preference.accounts`
   - Payments: multi-select chips from `Preference.payments`
   - Vendors: multi-select chips from `Preference.vendors`
6. **Category Budgets** table
   - One row per category from `Preference.categories`
   - Amount input per row (leave blank / $0 = category still appears in widget)

---

## 9. Settings Integration

New section in Settings: **Budget Planners**

```
Settings → Budget Planners
  [+ New Planner]
  ─────────────────────────
  Active Planners
    PlannerListRow (name · currency · period · repeatable badge)
      Actions: Edit | Archive | Delete
      Inline toggle: active on/off
  ─────────────────────────
  ▶ Archived / History  (collapsed by default, expandable)
      Past planners — read-only summary card
```

---

## 10. Edge Cases

| Case | Behaviour |
|------|-----------|
| Transaction currency ≠ planner currency | Excluded silently |
| `categoryBudgets` entry with `amount: 0` | Shows in widget with empty bar, "no budget set" label |
| Transaction category not in `categoryBudgets` | Appears in "Unplanned" section (only if spend > 0) |
| Two planners covering same transactions | Both planners include the transaction independently |
| Non-repeatable planner period expires | Auto-archived on next app load; removed from carousel |
| `custom` period planner | No prev/next arrows; offset fixed at 0 |
| User deletes a category from Preferences | Orphaned `categoryBudgets` entry shown with "category removed" label |
| No planners / all planners archived | Carousel renders a single "Create your first budget planner" empty-state card with CTA |
| Planner has 0 transactions in the period | All category bars at 0%, summary shows $0 spent — still displayed |
| `repeatable=false` planner in the future | Active on dashboard; period nav disabled; auto-archives when end date passes |

---

## 11. Alerts (In-App Only)

No push or email notifications. Visual-only:

| Trigger | Indicator |
|---------|-----------|
| Category ≥ 80% of budget | Orange bar + ⚠️ label on bar row |
| Category exceeded budget | Red bar + `-$X exceeded 🔴` label |
| Unplanned expense exists | Yellow "unplanned" badge on category row |
| Planner total exceeded | Summary row `remaining` turns red |

---

## 12. Testing Strategy

- **`plannerUtils.ts`** — unit tests for `computePeriodRange` and `aggregateTransactions`: boundary dates, DST, exceeded/near/ok thresholds, unplanned detection, sort order.
- **`usePlannerAggregation`** — unit tests with mock transaction arrays: correct filtering by currency, account, vendor, payment; zero-spend categories; unplanned categories.
- **`usePlanners` / `useMutatePlanner`** — follow existing hook test patterns (mock Firestore, verify calls).
- **`PlannerCard`** — smoke test: renders with mock aggregation data; toggle switches view; expand/collapse works.
- **`PlannerDetailDrawer`** — smoke test: renders categories; subcategory expand/collapse.
- **`PlannerForm`** — smoke test: required field validation; save calls `add`; edit pre-fills values.
- **`BudgetPlannerCarousel`** — smoke test: renders N cards; empty state when no planners.

---

## 13. Implementation Phases

### Phase 1 — Data layer
- `plannerUtils.ts` (pure functions + tests)
- `usePlanners` + `useMutatePlanner` hooks + tests
- `usePlannerAggregation` hook + tests
- `BudgetPlanner` type in `src/firestore/types.ts`

### Phase 2 — Widget
- `PlannerCategoryBar`, `PlannerCategoryRadial`
- `PlannerCard` (bar view, radial view, toggle, expand/collapse, period nav)
- `BudgetPlannerCarousel` (scroll container, empty state)
- Wire into `Dashboard.tsx`

### Phase 3 — Detail drawer
- `PlannerDetailDrawer` (full list, subcategory drill-down, transaction list)

### Phase 4 — Management
- `PlannerForm` (create/edit drawer)
- `PlannerSettings` section in Settings route

---

## 14. Performance Notes

- `usePlannerAggregation` is a `useMemo` over `[planner, transactions, periodOffset]` — no recomputation unless those change.
- `PlannerDetailDrawer` is lazy-mounted (renders only after first open) so subcategory computation doesn't run until needed.
- `BudgetPlannerCarousel` renders all active planner cards but each card's aggregation runs independently via `useMemo` — no blocking.
- No additional Firestore subscriptions for transaction data. Only one new subscription per session: `usePlanners` for planner configs.
