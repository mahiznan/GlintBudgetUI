# Budget Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Budget Planner feature — a swipeable dashboard carousel of planner widgets that compare planned vs actual spending, with management in Settings.

**Architecture:** Planner configs live in a new `budget_planners` Firestore collection (one `onSnapshot` subscription). All transaction filtering and aggregation is pure client-side computation over the already-loaded `TransactionContext` data — no extra Firestore reads. The feature ships in 4 phases: data layer → widget carousel → detail drawer → settings management.

**Tech Stack:** React 18, TypeScript (strict), Tailwind CSS v4, Firebase/Firestore, Vitest + React Testing Library, Recharts (not used here — SVG radial rings are hand-drawn).

**Spec:** `docs/superpowers/specs/2026-05-27-budget-planner-design.md`

---

## Phase 1 — Data Layer

---

### Task 1: Add BudgetPlanner types to `src/firestore/types.ts`

**Files:**
- Modify: `src/firestore/types.ts`

- [ ] **Step 1: Add the types**

Open `src/firestore/types.ts` and append after the existing `Preference` interface:

```typescript
export type PlannerPeriod = 'weekly' | 'monthly' | 'yearly' | 'custom';
export type PlannerChartView = 'bar' | 'radial';
export type CategoryStatus = 'exceeded' | 'near' | 'ok' | 'no-budget' | 'unplanned';

export interface BudgetPlanner {
  id: string;
  user_id: string;
  name: string;
  description: string;
  currency: string;
  active: boolean;
  archived: boolean;
  period: PlannerPeriod;
  customStart?: Date;
  customEnd?: Date;
  repeatable: boolean;
  filterAccounts: string[];
  filterVendors: string[];
  filterPayments: string[];
  categoryBudgets: Array<{ category: string; amount: number }>;
  chartView: PlannerChartView;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryResult {
  category: string;
  planned: number;
  spent: number;
  remaining: number;
  /** 0–100, capped; 0 when planned === 0 */
  pct: number;
  status: CategoryStatus;
}

export interface PlannerAggregation {
  dateRange: { start: Date; end: Date };
  periodLabel: string;
  isCurrentPeriod: boolean;
  summary: {
    totalPlanned: number;
    totalSpent: number;
    totalRemaining: number;
  };
  categoryResults: CategoryResult[];
  unplannedResults: CategoryResult[];
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/firestore/types.ts
git commit -m "feat: add BudgetPlanner, CategoryResult, PlannerAggregation types"
```

---

### Task 2: Create `src/lib/plannerUtils.ts`

Pure functions — no React, no Firestore. Covers period computation, transaction filtering, aggregation, and currency formatting.

**Files:**
- Create: `src/lib/plannerUtils.ts`
- Create: `src/lib/plannerUtils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/plannerUtils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  computePeriodRange,
  filterTransactionsForPlanner,
  aggregateTransactions,
  isPlannerExpired,
  formatCurrency,
} from './plannerUtils';
import type { BudgetPlanner, Transaction } from '../firestore/types';

// ── helpers ──────────────────────────────────────────────────────────────────

function makePlanner(overrides: Partial<BudgetPlanner> = {}): BudgetPlanner {
  return {
    id: 'p1',
    user_id: 'u1',
    name: 'Test',
    description: '',
    currency: 'SGD',
    active: true,
    archived: false,
    period: 'monthly',
    repeatable: true,
    filterAccounts: [],
    filterVendors: [],
    filterPayments: [],
    categoryBudgets: [],
    chartView: 'bar',
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
    ...overrides,
  };
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx1',
    user_id: 'u1',
    category: 'Food',
    subCategory: 'Groceries',
    date: new Date('2026-05-15'),
    account: 'DBS',
    vendor: 'NTUC',
    payment: 'credit',
    currency: 'SGD',
    notes: '',
    amount: 100,
    icon: '',
    ...overrides,
  };
}

// ── computePeriodRange ────────────────────────────────────────────────────────

describe('computePeriodRange', () => {
  const now = new Date('2026-05-15T12:00:00');

  it('monthly offset=0 covers whole of May', () => {
    const { start, end } = computePeriodRange(makePlanner({ period: 'monthly' }), 0, now);
    expect(start.getMonth()).toBe(4); // May
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(4);
    expect(end.getDate()).toBe(31);
  });

  it('monthly offset=-1 covers whole of April', () => {
    const { start, end } = computePeriodRange(makePlanner({ period: 'monthly' }), -1, now);
    expect(start.getMonth()).toBe(3); // April
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(3);
    expect(end.getDate()).toBe(30);
  });

  it('weekly offset=0 starts on Monday', () => {
    const { start } = computePeriodRange(makePlanner({ period: 'weekly' }), 0, now);
    expect(start.getDay()).toBe(1); // Monday
  });

  it('yearly offset=0 covers full year', () => {
    const { start, end } = computePeriodRange(makePlanner({ period: 'yearly' }), 0, now);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(end.getMonth()).toBe(11);
  });

  it('custom period uses stored dates regardless of offset', () => {
    const customStart = new Date('2026-04-01');
    const customEnd = new Date('2026-06-30');
    const planner = makePlanner({ period: 'custom', customStart, customEnd });
    const r0 = computePeriodRange(planner, 0, now);
    const r1 = computePeriodRange(planner, -1, now);
    expect(r0.start).toEqual(customStart);
    expect(r0.end).toEqual(customEnd);
    expect(r1.start).toEqual(customStart); // offset ignored for custom
  });

  it('non-repeatable planner uses stored customStart/customEnd', () => {
    const customStart = new Date('2026-05-01');
    const customEnd = new Date('2026-05-31');
    const planner = makePlanner({ repeatable: false, customStart, customEnd });
    const { start, end } = computePeriodRange(planner, 0, now);
    expect(start).toEqual(customStart);
    expect(end).toEqual(customEnd);
  });

  it('isCurrentPeriod is true for offset=0, false otherwise', () => {
    const p = makePlanner({ period: 'monthly' });
    expect(computePeriodRange(p, 0, now).isCurrentPeriod).toBe(true);
    expect(computePeriodRange(p, -1, now).isCurrentPeriod).toBe(false);
    expect(computePeriodRange(p, 1, now).isCurrentPeriod).toBe(false);
  });

  it('periodLabel for monthly is "Month YYYY"', () => {
    const { periodLabel } = computePeriodRange(makePlanner({ period: 'monthly' }), 0, now);
    expect(periodLabel).toBe('May 2026');
  });

  it('periodLabel for yearly is "YYYY"', () => {
    const { periodLabel } = computePeriodRange(makePlanner({ period: 'yearly' }), 0, now);
    expect(periodLabel).toBe('2026');
  });
});

// ── filterTransactionsForPlanner ─────────────────────────────────────────────

describe('filterTransactionsForPlanner', () => {
  const dateRange = { start: new Date('2026-05-01'), end: new Date('2026-05-31T23:59:59.999') };

  it('excludes transactions outside date range', () => {
    const txns = [
      makeTx({ date: new Date('2026-04-30') }),
      makeTx({ id: 'in', date: new Date('2026-05-15') }),
    ];
    const result = filterTransactionsForPlanner(makePlanner(), txns, dateRange);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('in');
  });

  it('excludes transactions with wrong currency', () => {
    const txns = [makeTx({ currency: 'USD' }), makeTx({ id: 'sgd', currency: 'SGD' })];
    const result = filterTransactionsForPlanner(makePlanner({ currency: 'SGD' }), txns, dateRange);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('sgd');
  });

  it('filters by account when filterAccounts is non-empty', () => {
    const txns = [
      makeTx({ account: 'DBS' }),
      makeTx({ id: 'ocbc', account: 'OCBC' }),
    ];
    const result = filterTransactionsForPlanner(
      makePlanner({ filterAccounts: ['DBS'] }),
      txns,
      dateRange,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.account).toBe('DBS');
  });

  it('includes all accounts when filterAccounts is empty', () => {
    const txns = [makeTx({ account: 'DBS' }), makeTx({ id: 't2', account: 'OCBC' })];
    const result = filterTransactionsForPlanner(makePlanner({ filterAccounts: [] }), txns, dateRange);
    expect(result).toHaveLength(2);
  });
});

// ── aggregateTransactions ─────────────────────────────────────────────────────

describe('aggregateTransactions', () => {
  it('computes ok status when under 80%', () => {
    const planner = makePlanner({ categoryBudgets: [{ category: 'Food', amount: 1000 }] });
    const txns = [makeTx({ amount: 500, category: 'Food' })];
    const { categoryResults } = aggregateTransactions(planner, txns);
    expect(categoryResults[0]!.status).toBe('ok');
    expect(categoryResults[0]!.pct).toBe(50);
    expect(categoryResults[0]!.remaining).toBe(500);
  });

  it('computes near status at 80%+', () => {
    const planner = makePlanner({ categoryBudgets: [{ category: 'Food', amount: 1000 }] });
    const txns = [makeTx({ amount: 820, category: 'Food' })];
    const { categoryResults } = aggregateTransactions(planner, txns);
    expect(categoryResults[0]!.status).toBe('near');
  });

  it('computes exceeded status and negative remaining', () => {
    const planner = makePlanner({ categoryBudgets: [{ category: 'Food', amount: 500 }] });
    const txns = [makeTx({ amount: 620, category: 'Food' })];
    const { categoryResults } = aggregateTransactions(planner, txns);
    expect(categoryResults[0]!.status).toBe('exceeded');
    expect(categoryResults[0]!.remaining).toBe(-120);
    expect(categoryResults[0]!.pct).toBe(100); // capped
  });

  it('computes no-budget status when amount is 0', () => {
    const planner = makePlanner({ categoryBudgets: [{ category: 'Food', amount: 0 }] });
    const txns = [makeTx({ amount: 50, category: 'Food' })];
    const { categoryResults } = aggregateTransactions(planner, txns);
    expect(categoryResults[0]!.status).toBe('no-budget');
    expect(categoryResults[0]!.pct).toBe(0);
  });

  it('detects unplanned categories', () => {
    const planner = makePlanner({ categoryBudgets: [{ category: 'Food', amount: 500 }] });
    const txns = [
      makeTx({ category: 'Food', amount: 100 }),
      makeTx({ id: 't2', category: 'Health', amount: 45 }),
    ];
    const { unplannedResults } = aggregateTransactions(planner, txns);
    expect(unplannedResults).toHaveLength(1);
    expect(unplannedResults[0]!.category).toBe('Health');
    expect(unplannedResults[0]!.status).toBe('unplanned');
  });

  it('does not include unplanned category with zero spend', () => {
    const planner = makePlanner({ categoryBudgets: [] });
    const txns: Transaction[] = [];
    const { unplannedResults } = aggregateTransactions(planner, txns);
    expect(unplannedResults).toHaveLength(0);
  });

  it('sorts categoryResults: exceeded → near → ok → no-budget', () => {
    const planner = makePlanner({
      categoryBudgets: [
        { category: 'A', amount: 100 },  // ok
        { category: 'B', amount: 500 },  // exceeded
        { category: 'C', amount: 200 },  // near
        { category: 'D', amount: 0 },    // no-budget
      ],
    });
    const txns = [
      makeTx({ id: 'a', category: 'A', amount: 50 }),
      makeTx({ id: 'b', category: 'B', amount: 620 }),
      makeTx({ id: 'c', category: 'C', amount: 170 }),
    ];
    const { categoryResults } = aggregateTransactions(planner, txns);
    expect(categoryResults.map((r) => r.category)).toEqual(['B', 'C', 'A', 'D']);
  });

  it('computes summary totals', () => {
    const planner = makePlanner({
      categoryBudgets: [
        { category: 'Food', amount: 1000 },
        { category: 'Transport', amount: 300 },
      ],
    });
    const txns = [
      makeTx({ category: 'Food', amount: 820 }),
      makeTx({ id: 't2', category: 'Transport', amount: 290 }),
    ];
    const { summary } = aggregateTransactions(planner, txns);
    expect(summary.totalPlanned).toBe(1300);
    expect(summary.totalSpent).toBe(1110);
    expect(summary.totalRemaining).toBe(190);
  });
});

// ── isPlannerExpired ──────────────────────────────────────────────────────────

describe('isPlannerExpired', () => {
  it('returns false for repeatable planners', () => {
    expect(isPlannerExpired(makePlanner({ repeatable: true }))).toBe(false);
  });

  it('returns true when customEnd is in the past', () => {
    const planner = makePlanner({
      repeatable: false,
      customEnd: new Date('2026-04-30'),
    });
    expect(isPlannerExpired(planner, new Date('2026-05-15'))).toBe(true);
  });

  it('returns false when customEnd is today or in the future', () => {
    const planner = makePlanner({
      repeatable: false,
      customEnd: new Date('2026-05-31'),
    });
    expect(isPlannerExpired(planner, new Date('2026-05-15'))).toBe(false);
  });
});

// ── formatCurrency ────────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats positive SGD', () => {
    expect(formatCurrency(1200, 'SGD')).toContain('1,200');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-120, 'SGD')).toContain('120');
  });
});
```

- [ ] **Step 2: Run tests — expect all to fail**

```bash
npm run test -- plannerUtils --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/plannerUtils.ts`**

```typescript
import { getPeriodRange, shiftPeriodDate } from './dateUtils';
import type { BudgetPlanner, CategoryResult, PlannerAggregation, Transaction } from '../firestore/types';

// ── Period computation ────────────────────────────────────────────────────────

const PERIOD_MAP = {
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
} as const satisfies Record<'weekly' | 'monthly' | 'yearly', 'week' | 'month' | 'year'>;

function formatPeriodLabel(
  period: BudgetPlanner['period'],
  start: Date,
  end: Date,
): string {
  if (period === 'yearly') return start.getFullYear().toString();
  if (period === 'monthly') {
    return start.toLocaleString('en', { month: 'long', year: 'numeric' });
  }
  if (period === 'weekly') {
    const s = start.toLocaleString('en', { day: 'numeric', month: 'short' });
    const e = end.toLocaleString('en', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${s} – ${e}`;
  }
  // custom
  const s = start.toLocaleString('en', { day: 'numeric', month: 'short', year: 'numeric' });
  const e = end.toLocaleString('en', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${s} – ${e}`;
}

export function computePeriodRange(
  planner: Pick<BudgetPlanner, 'period' | 'customStart' | 'customEnd' | 'repeatable'>,
  offset: number,
  now = new Date(),
): { start: Date; end: Date; periodLabel: string; isCurrentPeriod: boolean } {
  // Custom period or non-repeatable: always use stored customStart/customEnd
  if (planner.period === 'custom' || !planner.repeatable) {
    const start = planner.customStart!;
    const end = planner.customEnd!;
    return {
      start,
      end,
      periodLabel: formatPeriodLabel('custom', start, end),
      isCurrentPeriod: true,
    };
  }

  const p = PERIOD_MAP[planner.period as 'weekly' | 'monthly' | 'yearly'];
  const refDate = shiftPeriodDate(p, offset, now);
  const { start, end } = getPeriodRange(p, refDate);
  return {
    start,
    end,
    periodLabel: formatPeriodLabel(planner.period, start, end),
    isCurrentPeriod: offset === 0,
  };
}

/**
 * Computes the concrete start/end for a non-repeatable planner at creation time.
 * Called in PlannerForm before saving when repeatable=false.
 */
export function computeEffectiveDates(
  period: BudgetPlanner['period'],
  now = new Date(),
): { customStart: Date; customEnd: Date } {
  if (period === 'custom') {
    throw new Error('Custom period must supply explicit dates');
  }
  const p = PERIOD_MAP[period as 'weekly' | 'monthly' | 'yearly'];
  const { start, end } = getPeriodRange(p, now);
  return { customStart: start, customEnd: end };
}

// ── Expiry check ─────────────────────────────────────────────────────────────

export function isPlannerExpired(planner: BudgetPlanner, now = new Date()): boolean {
  if (planner.repeatable) return false;
  if (!planner.customEnd) return false;
  return planner.customEnd < now;
}

// ── Transaction filtering ─────────────────────────────────────────────────────

export function filterTransactionsForPlanner(
  planner: Pick<BudgetPlanner, 'currency' | 'filterAccounts' | 'filterVendors' | 'filterPayments'>,
  transactions: Transaction[],
  dateRange: { start: Date; end: Date },
): Transaction[] {
  return transactions.filter((t) => {
    if (t.date < dateRange.start || t.date > dateRange.end) return false;
    if (t.currency !== planner.currency) return false;
    if (planner.filterAccounts.length > 0 && !planner.filterAccounts.includes(t.account))
      return false;
    if (planner.filterVendors.length > 0 && !planner.filterVendors.includes(t.vendor))
      return false;
    if (planner.filterPayments.length > 0 && !planner.filterPayments.includes(t.payment))
      return false;
    return true;
  });
}

// ── Aggregation ───────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<CategoryResult['status'], number> = {
  exceeded: 0,
  near: 1,
  ok: 2,
  'no-budget': 3,
  unplanned: 4,
};

export function aggregateTransactions(
  planner: Pick<BudgetPlanner, 'categoryBudgets'>,
  filteredTransactions: Transaction[],
): Pick<PlannerAggregation, 'categoryResults' | 'unplannedResults' | 'summary'> {
  // Group spend by category
  const spendByCategory = new Map<string, number>();
  for (const t of filteredTransactions) {
    spendByCategory.set(t.category, (spendByCategory.get(t.category) ?? 0) + t.amount);
  }

  // Build categoryResults from configured budgets
  const categoryResults: CategoryResult[] = planner.categoryBudgets.map(
    ({ category, amount }) => {
      const spent = spendByCategory.get(category) ?? 0;
      const remaining = amount - spent;
      const pct = amount > 0 ? Math.min(100, Math.round((spent / amount) * 100)) : 0;

      let status: CategoryResult['status'];
      if (amount === 0) status = 'no-budget';
      else if (spent > amount) status = 'exceeded';
      else if (pct >= 80) status = 'near';
      else status = 'ok';

      return { category, planned: amount, spent, remaining, pct, status };
    },
  );

  // Sort: exceeded → near → ok → no-budget (within same status: higher spend first)
  categoryResults.sort((a, b) => {
    const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    return so !== 0 ? so : b.spent - a.spent;
  });

  // Find unplanned categories (transactions in categories not in categoryBudgets)
  const plannedCategories = new Set(planner.categoryBudgets.map((b) => b.category));
  const unplannedResults: CategoryResult[] = [];
  for (const [category, spent] of spendByCategory) {
    if (!plannedCategories.has(category) && spent > 0) {
      unplannedResults.push({
        category,
        planned: 0,
        spent,
        remaining: -spent,
        pct: 0,
        status: 'unplanned',
      });
    }
  }
  unplannedResults.sort((a, b) => b.spent - a.spent);

  // Summary: totalSpent includes unplanned spend
  const totalPlanned = planner.categoryBudgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = [...spendByCategory.values()].reduce((s, v) => s + v, 0);

  return {
    categoryResults,
    unplannedResults,
    summary: {
      totalPlanned,
      totalSpent,
      totalRemaining: totalPlanned - totalSpent,
    },
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm run test -- plannerUtils --run
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plannerUtils.ts src/lib/plannerUtils.test.ts
git commit -m "feat: add plannerUtils — period computation, filtering, aggregation"
```

---

### Task 3: Create `src/hooks/usePlanners.ts`

Firestore `onSnapshot` subscription for `budget_planners`. Auto-archives expired non-repeatable planners.

**Files:**
- Create: `src/hooks/usePlanners.ts`
- Create: `src/hooks/usePlanners.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/usePlanners.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({ status: 'authenticated', user: { uid: 'u1' } })),
}));
vi.mock('../context/SyncStatusContext', () => ({
  useSyncStatus: vi.fn(() => ({ notifyWrite: vi.fn() })),
}));

const mockUnsub = vi.fn();
let capturedCallback: ((snap: unknown) => void) | null = null;

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn(() => 'q'),
  where: vi.fn(() => 'w'),
  orderBy: vi.fn(() => 'o'),
  onSnapshot: vi.fn((_q, _opts, cb) => {
    capturedCallback = cb as (snap: unknown) => void;
    return mockUnsub;
  }),
  doc: vi.fn(() => 'doc-ref'),
  updateDoc: vi.fn(() => Promise.resolve()),
  Timestamp: { now: vi.fn(() => new Date()) },
}));

import { onSnapshot } from 'firebase/firestore';
import { usePlanners } from './usePlanners';
import React from 'react';
import { SyncStatusProvider } from '../context/SyncStatusContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(SyncStatusProvider, null, children)
);

function makeRawDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    data: () => ({
      user_id: 'u1',
      name: 'Monthly SGD',
      description: '',
      currency: 'SGD',
      active: true,
      archived: false,
      period: 'monthly',
      repeatable: true,
      filter_accounts: [],
      filter_vendors: [],
      filter_payments: [],
      category_budgets: [{ category: 'Food', amount: 1000 }],
      chart_view: 'bar',
      created_at: { toDate: () => new Date('2026-05-01') },
      updated_at: { toDate: () => new Date('2026-05-01') },
      ...overrides,
    }),
  };
}

describe('usePlanners', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    capturedCallback = null;
    vi.mocked(onSnapshot).mockImplementation((_q, _opts, cb) => {
      capturedCallback = cb as (snap: unknown) => void;
      return mockUnsub;
    });
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => usePlanners('u1'), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.planners).toHaveLength(0);
  });

  it('returns planners after snapshot fires', () => {
    const { result } = renderHook(() => usePlanners('u1'), { wrapper });
    act(() => {
      capturedCallback!({
        docs: [makeRawDoc()],
        metadata: { hasPendingWrites: false },
      });
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.planners).toHaveLength(1);
    expect(result.current.planners[0]!.name).toBe('Monthly SGD');
    expect(result.current.planners[0]!.categoryBudgets).toEqual([
      { category: 'Food', amount: 1000 },
    ]);
  });

  it('returns empty array and error on failure', async () => {
    const { result } = renderHook(() => usePlanners('u1'), { wrapper });
    // onSnapshot error path — need to capture errCb
    vi.mocked(onSnapshot).mockImplementation((_q, _opts, _cb, errCb) => {
      (errCb as (e: Error) => void)(new Error('permission denied'));
      return mockUnsub;
    });
    const { result: r2 } = renderHook(() => usePlanners('u1'), { wrapper });
    expect(r2.current.error).toBeTruthy();
  });

  it('does not subscribe when uid is empty', () => {
    renderHook(() => usePlanners(''), { wrapper });
    expect(onSnapshot).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- usePlanners --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/hooks/usePlanners.ts`**

```typescript
import { useEffect, useReducer } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase/db';
import { useSyncStatus } from '../context/SyncStatusContext';
import { isPlannerExpired } from '../lib/plannerUtils';
import type { BudgetPlanner } from '../firestore/types';

interface State {
  planners: BudgetPlanner[];
  loading: boolean;
  error: Error | null;
  hasPendingWrites: boolean;
}

type Action =
  | { type: 'fetch' }
  | { type: 'success'; planners: BudgetPlanner[]; hasPendingWrites: boolean }
  | { type: 'error'; error: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'fetch':
      return { ...state, loading: true, error: null };
    case 'success':
      return { ...state, loading: false, planners: action.planners, hasPendingWrites: action.hasPendingWrites };
    case 'error':
      return { ...state, loading: false, error: action.error };
  }
}

function docToPlanner(id: string, raw: DocumentData): BudgetPlanner {
  return {
    id,
    user_id: raw['user_id'] as string,
    name: raw['name'] as string,
    description: (raw['description'] as string) ?? '',
    currency: raw['currency'] as string,
    active: raw['active'] as boolean,
    archived: raw['archived'] as boolean,
    period: raw['period'] as BudgetPlanner['period'],
    customStart: raw['custom_start']
      ? (raw['custom_start'] as { toDate(): Date }).toDate()
      : undefined,
    customEnd: raw['custom_end']
      ? (raw['custom_end'] as { toDate(): Date }).toDate()
      : undefined,
    repeatable: raw['repeatable'] as boolean,
    filterAccounts: (raw['filter_accounts'] as string[]) ?? [],
    filterVendors: (raw['filter_vendors'] as string[]) ?? [],
    filterPayments: (raw['filter_payments'] as string[]) ?? [],
    categoryBudgets: (raw['category_budgets'] as Array<{ category: string; amount: number }>) ?? [],
    chartView: (raw['chart_view'] as BudgetPlanner['chartView']) ?? 'bar',
    createdAt: (raw['created_at'] as { toDate(): Date }).toDate(),
    updatedAt: (raw['updated_at'] as { toDate(): Date }).toDate(),
  };
}

export function usePlanners(uid: string): State {
  const { notifyWrite } = useSyncStatus();
  const [state, dispatch] = useReducer(reducer, {
    planners: [],
    loading: !!uid,
    error: null,
    hasPendingWrites: false,
  });

  useEffect(() => {
    if (!uid) return;
    dispatch({ type: 'fetch' });

    const q = query(
      collection(db, 'budget_planners'),
      where('user_id', '==', uid),
      orderBy('created_at', 'desc'),
    );

    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const planners = snap.docs.map((d) => docToPlanner(d.id, d.data()));

        // Auto-archive expired non-repeatable planners
        for (const planner of planners) {
          if (!planner.archived && isPlannerExpired(planner)) {
            notifyWrite();
            void updateDoc(doc(db, 'budget_planners', planner.id), {
              archived: true,
              active: false,
              updated_at: Timestamp.now(),
            });
          }
        }

        dispatch({
          type: 'success',
          planners,
          hasPendingWrites: snap.metadata.hasPendingWrites,
        });
      },
      (err) => dispatch({ type: 'error', error: err }),
    );
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm run test -- usePlanners --run
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePlanners.ts src/hooks/usePlanners.test.ts
git commit -m "feat: add usePlanners hook with auto-archive"
```

---

### Task 4: Create `src/hooks/useMutatePlanner.ts`

Fire-and-forget CRUD mutations. Mirrors `useMutateTransaction` exactly.

**Files:**
- Create: `src/hooks/useMutatePlanner.ts`
- Create: `src/hooks/useMutatePlanner.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useMutatePlanner.test.tsx`:

```typescript
import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  doc: vi.fn(() => 'doc-ref'),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  Timestamp: {
    fromDate: vi.fn((d: Date) => d),
    now: vi.fn(() => new Date()),
  },
}));

import { setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  useAddPlanner,
  useUpdatePlanner,
  useArchivePlanner,
  useDeletePlanner,
} from './useMutatePlanner';
import { SyncStatusProvider } from '../context/SyncStatusContext';
import type { BudgetPlanner } from '../firestore/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(SyncStatusProvider, null, children)
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const basePlanner: Omit<BudgetPlanner, 'id' | 'createdAt' | 'updatedAt'> = {
  user_id: 'u1',
  name: 'Monthly SGD',
  description: '',
  currency: 'SGD',
  active: true,
  archived: false,
  period: 'monthly',
  repeatable: true,
  filterAccounts: [],
  filterVendors: [],
  filterPayments: [],
  categoryBudgets: [{ category: 'Food', amount: 1000 }],
  chartView: 'bar',
};

describe('useAddPlanner', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls setDoc and returns a UUID', () => {
    const { result } = renderHook(() => useAddPlanner(), { wrapper });
    const id = result.current.mutate(basePlanner);
    expect(id).toMatch(UUID_RE);
    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  it('encodes categoryBudgets and snake_case fields', () => {
    const { result } = renderHook(() => useAddPlanner(), { wrapper });
    result.current.mutate(basePlanner);
    const payload = vi.mocked(setDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(payload['user_id']).toBe('u1');
    expect(payload['category_budgets']).toEqual([{ category: 'Food', amount: 1000 }]);
    expect(payload['chart_view']).toBe('bar');
    expect(payload['filter_accounts']).toEqual([]);
  });
});

describe('useUpdatePlanner', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls updateDoc with encoded patch', () => {
    const { result } = renderHook(() => useUpdatePlanner(), { wrapper });
    result.current.mutate('p1', { name: 'Renamed', chartView: 'radial' });
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const patch = vi.mocked(updateDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(patch['name']).toBe('Renamed');
    expect(patch['chart_view']).toBe('radial');
  });
});

describe('useArchivePlanner', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls updateDoc with archived=true and active=false', () => {
    const { result } = renderHook(() => useArchivePlanner(), { wrapper });
    result.current.mutate('p1');
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const patch = vi.mocked(updateDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(patch['archived']).toBe(true);
    expect(patch['active']).toBe(false);
  });
});

describe('useDeletePlanner', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls deleteDoc', () => {
    const { result } = renderHook(() => useDeletePlanner(), { wrapper });
    result.current.mutate('p1');
    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- useMutatePlanner --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/hooks/useMutatePlanner.ts`**

```typescript
import { collection, doc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/db';
import { useSyncStatus } from '../context/SyncStatusContext';
import type { BudgetPlanner } from '../firestore/types';

type PlannerInput = Omit<BudgetPlanner, 'id' | 'createdAt' | 'updatedAt'>;
type PlannerPatch = Partial<Omit<BudgetPlanner, 'id' | 'createdAt'>>;

function encodePlanner(id: string, p: PlannerInput): Record<string, unknown> {
  const now = Timestamp.now();
  return {
    id,
    user_id: p.user_id,
    name: p.name,
    description: p.description,
    currency: p.currency,
    active: p.active,
    archived: p.archived,
    period: p.period,
    custom_start: p.customStart ? Timestamp.fromDate(p.customStart) : null,
    custom_end: p.customEnd ? Timestamp.fromDate(p.customEnd) : null,
    repeatable: p.repeatable,
    filter_accounts: p.filterAccounts,
    filter_vendors: p.filterVendors,
    filter_payments: p.filterPayments,
    category_budgets: p.categoryBudgets,
    chart_view: p.chartView,
    created_at: now,
    updated_at: now,
  };
}

function encodePatch(patch: PlannerPatch): Record<string, unknown> {
  const out: Record<string, unknown> = { updated_at: Timestamp.now() };
  if (patch.name !== undefined) out['name'] = patch.name;
  if (patch.description !== undefined) out['description'] = patch.description;
  if (patch.currency !== undefined) out['currency'] = patch.currency;
  if (patch.active !== undefined) out['active'] = patch.active;
  if (patch.archived !== undefined) out['archived'] = patch.archived;
  if (patch.period !== undefined) out['period'] = patch.period;
  if (patch.customStart !== undefined)
    out['custom_start'] = patch.customStart ? Timestamp.fromDate(patch.customStart) : null;
  if (patch.customEnd !== undefined)
    out['custom_end'] = patch.customEnd ? Timestamp.fromDate(patch.customEnd) : null;
  if (patch.repeatable !== undefined) out['repeatable'] = patch.repeatable;
  if (patch.filterAccounts !== undefined) out['filter_accounts'] = patch.filterAccounts;
  if (patch.filterVendors !== undefined) out['filter_vendors'] = patch.filterVendors;
  if (patch.filterPayments !== undefined) out['filter_payments'] = patch.filterPayments;
  if (patch.categoryBudgets !== undefined) out['category_budgets'] = patch.categoryBudgets;
  if (patch.chartView !== undefined) out['chart_view'] = patch.chartView;
  return out;
}

export function useAddPlanner() {
  const { notifyWrite } = useSyncStatus();
  function mutate(planner: PlannerInput): string {
    const id = crypto.randomUUID();
    notifyWrite();
    void setDoc(doc(collection(db, 'budget_planners'), id), encodePlanner(id, planner));
    return id;
  }
  return { mutate };
}

export function useUpdatePlanner() {
  const { notifyWrite } = useSyncStatus();
  function mutate(id: string, patch: PlannerPatch): void {
    notifyWrite();
    void updateDoc(doc(db, 'budget_planners', id), encodePatch(patch));
  }
  return { mutate };
}

export function useArchivePlanner() {
  const { notifyWrite } = useSyncStatus();
  function mutate(id: string): void {
    notifyWrite();
    void updateDoc(doc(db, 'budget_planners', id), {
      archived: true,
      active: false,
      updated_at: Timestamp.now(),
    });
  }
  return { mutate };
}

export function useDeletePlanner() {
  const { notifyWrite } = useSyncStatus();
  function mutate(id: string): void {
    notifyWrite();
    void deleteDoc(doc(db, 'budget_planners', id));
  }
  return { mutate };
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm run test -- useMutatePlanner --run
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMutatePlanner.ts src/hooks/useMutatePlanner.test.tsx
git commit -m "feat: add useMutatePlanner hooks (add/update/archive/delete)"
```

---

### Task 5: Create `src/hooks/usePlannerAggregation.ts`

React hook wrapping the pure `plannerUtils` functions with `useMemo`.

**Files:**
- Create: `src/hooks/usePlannerAggregation.ts`
- Create: `src/hooks/usePlannerAggregation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/usePlannerAggregation.test.ts`:

```typescript
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePlannerAggregation } from './usePlannerAggregation';
import type { BudgetPlanner, Transaction } from '../firestore/types';

function makePlanner(overrides: Partial<BudgetPlanner> = {}): BudgetPlanner {
  return {
    id: 'p1',
    user_id: 'u1',
    name: 'Test',
    description: '',
    currency: 'SGD',
    active: true,
    archived: false,
    period: 'monthly',
    repeatable: true,
    filterAccounts: [],
    filterVendors: [],
    filterPayments: [],
    categoryBudgets: [{ category: 'Food', amount: 1000 }],
    chartView: 'bar',
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
    ...overrides,
  };
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx1',
    user_id: 'u1',
    category: 'Food',
    subCategory: 'Groceries',
    date: new Date('2026-05-15'),
    account: 'DBS',
    vendor: 'NTUC',
    payment: 'credit',
    currency: 'SGD',
    notes: '',
    amount: 500,
    icon: '',
    ...overrides,
  };
}

describe('usePlannerAggregation', () => {
  const now = new Date('2026-05-15T12:00:00');

  it('returns category results for matching transactions', () => {
    const planner = makePlanner();
    const txns = [makeTx()];
    const { result } = renderHook(() =>
      usePlannerAggregation(planner, txns, 0, now),
    );
    expect(result.current.categoryResults[0]!.spent).toBe(500);
    expect(result.current.categoryResults[0]!.status).toBe('ok');
  });

  it('returns periodLabel and isCurrentPeriod', () => {
    const { result } = renderHook(() =>
      usePlannerAggregation(makePlanner(), [], 0, now),
    );
    expect(result.current.periodLabel).toBe('May 2026');
    expect(result.current.isCurrentPeriod).toBe(true);
  });

  it('excludes transactions outside the period', () => {
    const planner = makePlanner();
    const txns = [makeTx({ date: new Date('2026-04-10') })];
    const { result } = renderHook(() =>
      usePlannerAggregation(planner, txns, 0, now),
    );
    expect(result.current.categoryResults[0]!.spent).toBe(0);
  });

  it('offset=-1 uses previous month', () => {
    const { result } = renderHook(() =>
      usePlannerAggregation(makePlanner(), [], -1, now),
    );
    expect(result.current.periodLabel).toBe('April 2026');
    expect(result.current.isCurrentPeriod).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- usePlannerAggregation --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/hooks/usePlannerAggregation.ts`**

```typescript
import { useMemo } from 'react';
import {
  computePeriodRange,
  filterTransactionsForPlanner,
  aggregateTransactions,
} from '../lib/plannerUtils';
import type { BudgetPlanner, PlannerAggregation, Transaction } from '../firestore/types';

export function usePlannerAggregation(
  planner: BudgetPlanner,
  transactions: Transaction[],
  periodOffset: number,
  now = new Date(),
): PlannerAggregation {
  return useMemo(() => {
    const { start, end, periodLabel, isCurrentPeriod } = computePeriodRange(
      planner,
      periodOffset,
      now,
    );
    const filtered = filterTransactionsForPlanner(planner, transactions, { start, end });
    const { categoryResults, unplannedResults, summary } = aggregateTransactions(
      planner,
      filtered,
    );
    return {
      dateRange: { start, end },
      periodLabel,
      isCurrentPeriod,
      summary,
      categoryResults,
      unplannedResults,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planner, transactions, periodOffset]);
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm run test -- usePlannerAggregation --run
```

Expected: all PASS.

- [ ] **Step 5: Run full test suite to confirm nothing broken**

```bash
npm run test -- --run
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/usePlannerAggregation.ts src/hooks/usePlannerAggregation.test.ts
git commit -m "feat: add usePlannerAggregation hook"
```

---

---

## Phase 2 — Widget Components

---

### Task 6: Create `PlannerCategoryBar` and `PlannerCategoryRadial`

Purely presentational — no state, no hooks. Shared by `PlannerCard` (Phase 2) and `PlannerDetailDrawer` (Phase 3).

**Files:**
- Create: `src/components/planner/PlannerCategoryBar.tsx`
- Create: `src/components/planner/PlannerCategoryRadial.tsx`
- Create: `src/components/planner/PlannerCategoryBar.test.tsx`
- Create: `src/components/planner/PlannerCategoryRadial.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/planner/PlannerCategoryBar.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlannerCategoryBar } from './PlannerCategoryBar';
import type { CategoryResult } from '../../firestore/types';

function makeResult(overrides: Partial<CategoryResult> = {}): CategoryResult {
  return {
    category: 'Food',
    planned: 1000,
    spent: 500,
    remaining: 500,
    pct: 50,
    status: 'ok',
    ...overrides,
  };
}

describe('PlannerCategoryBar', () => {
  it('renders category name', () => {
    render(<PlannerCategoryBar result={makeResult()} currency="SGD" isFirstUnplanned={false} />);
    expect(screen.getByText('Food')).toBeTruthy();
  });

  it('shows unplanned badge for unplanned status', () => {
    render(
      <PlannerCategoryBar
        result={makeResult({ status: 'unplanned', planned: 0, remaining: -45, pct: 0 })}
        currency="SGD"
        isFirstUnplanned={true}
      />,
    );
    expect(screen.getByText('unplanned')).toBeTruthy();
  });

  it('shows no-budget label', () => {
    render(
      <PlannerCategoryBar
        result={makeResult({ status: 'no-budget', planned: 0, pct: 0 })}
        currency="SGD"
        isFirstUnplanned={false}
      />,
    );
    expect(screen.getByText('no budget set')).toBeTruthy();
  });

  it('shows remaining label for ok status', () => {
    render(<PlannerCategoryBar result={makeResult()} currency="SGD" isFirstUnplanned={false} />);
    expect(screen.getByText(/remaining/i)).toBeTruthy();
  });

  it('shows exceeded label for exceeded status', () => {
    render(
      <PlannerCategoryBar
        result={makeResult({ status: 'exceeded', spent: 620, planned: 500, remaining: -120, pct: 100 })}
        currency="SGD"
        isFirstUnplanned={false}
      />,
    );
    expect(screen.getByText(/exceeded/i)).toBeTruthy();
  });
});
```

Create `src/components/planner/PlannerCategoryRadial.test.tsx`:

```typescript
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlannerCategoryRadial } from './PlannerCategoryRadial';
import type { CategoryResult } from '../../firestore/types';

describe('PlannerCategoryRadial', () => {
  it('renders without crashing for ok status', () => {
    const { container } = render(
      <PlannerCategoryRadial
        result={{ category: 'Food', planned: 1000, spent: 500, remaining: 500, pct: 50, status: 'ok' }}
        currency="SGD"
      />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.textContent).toContain('Food');
  });

  it('renders exceeded state', () => {
    const { container } = render(
      <PlannerCategoryRadial
        result={{ category: 'Shopping', planned: 500, spent: 620, remaining: -120, pct: 100, status: 'exceeded' }}
        currency="SGD"
      />,
    );
    expect(container.textContent).toContain('Over');
  });

  it('renders unplanned with dashed ring', () => {
    const { container } = render(
      <PlannerCategoryRadial
        result={{ category: 'Health', planned: 0, spent: 45, remaining: -45, pct: 0, status: 'unplanned' }}
        currency="SGD"
      />,
    );
    expect(container.querySelector('circle[stroke-dasharray]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- PlannerCategoryBar PlannerCategoryRadial --run
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/components/planner/PlannerCategoryBar.tsx`**

```tsx
import { formatCurrency } from '../../lib/plannerUtils';
import type { CategoryResult } from '../../firestore/types';

const BAR_COLOR: Record<CategoryResult['status'], string> = {
  exceeded: '#ef4444',
  near: '#f97316',
  ok: 'var(--color-brand)',
  'no-budget': '#cbd5e1',
  unplanned: '#cbd5e1',
};

const REMAIN_COLOR: Record<CategoryResult['status'], string> = {
  exceeded: 'text-red-500',
  near: 'text-orange-500',
  ok: 'text-green-600',
  'no-budget': '',
  unplanned: '',
};

interface Props {
  result: CategoryResult;
  currency: string;
  /** True when this is the first unplanned entry — renders the dashed divider above it */
  isFirstUnplanned: boolean;
}

export function PlannerCategoryBar({ result, currency, isFirstUnplanned }: Props) {
  const isUnplanned = result.status === 'unplanned';
  const isNoBudget = result.status === 'no-budget';

  function remainLabel(): string {
    if (isUnplanned || isNoBudget) return '';
    if (result.remaining < 0)
      return `${formatCurrency(Math.abs(result.remaining), currency)} exceeded 🔴`;
    if (result.status === 'near')
      return `${formatCurrency(result.remaining, currency)} left ⚠️`;
    return `${formatCurrency(result.remaining, currency)} remaining`;
  }

  const label = remainLabel();

  return (
    <div
      className={[
        'mb-2',
        isFirstUnplanned ? 'mt-2 pt-2 border-t border-dashed border-border' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span
          className={`text-xs font-medium truncate max-w-[55%] ${isUnplanned || isNoBudget ? 'text-text-muted' : 'text-text'}`}
        >
          {result.category}
          {isUnplanned && (
            <span className="ml-1.5 text-[10px] bg-yellow-100 text-yellow-800 rounded px-1 py-0.5">
              unplanned
            </span>
          )}
          {isNoBudget && (
            <span className="ml-1.5 text-[10px] text-slate-400">no budget set</span>
          )}
        </span>
        <span className="text-xs text-text-muted shrink-0">
          {formatCurrency(result.spent, currency)}
          {result.planned > 0 && (
            <span className="text-slate-300">
              {' '}/ {formatCurrency(result.planned, currency)}
            </span>
          )}
        </span>
      </div>

      <div className="h-2 rounded-full overflow-hidden bg-border">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${result.pct}%`, background: BAR_COLOR[result.status] }}
        />
      </div>

      {label && (
        <div className={`text-[11px] text-right mt-0.5 ${REMAIN_COLOR[result.status]}`}>
          {label}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/planner/PlannerCategoryRadial.tsx`**

```tsx
import { formatCurrency } from '../../lib/plannerUtils';
import type { CategoryResult } from '../../firestore/types';

const RING_COLOR: Record<CategoryResult['status'], string> = {
  exceeded: '#ef4444',
  near: '#f97316',
  ok: 'var(--color-brand)',
  'no-budget': '#cbd5e1',
  unplanned: '#cbd5e1',
};

interface Props {
  result: CategoryResult;
  currency: string;
}

export function PlannerCategoryRadial({ result, currency }: Props) {
  const R = 21;
  const circumference = 2 * Math.PI * R;
  const dashOffset = circumference - (circumference * result.pct) / 100;
  const isUnplanned = result.status === 'unplanned';
  const isExceeded = result.status === 'exceeded';
  const color = RING_COLOR[result.status];

  function innerLabel(): string {
    if (isExceeded) return 'Over';
    if (isUnplanned) return formatCurrency(result.spent, currency);
    return `${result.pct}%`;
  }

  function subLabel(): string {
    if (isExceeded) return `-${formatCurrency(Math.abs(result.remaining), currency)}`;
    if (result.status === 'near' || result.status === 'ok')
      return `${formatCurrency(result.remaining, currency)} left`;
    return '';
  }

  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
        {/* Track */}
        <circle
          cx="26"
          cy="26"
          r={R}
          fill="none"
          stroke={isUnplanned ? '#f1f5f9' : '#e2e8f0'}
          strokeWidth="4.5"
          {...(isUnplanned ? { strokeDasharray: '4 3' } : {})}
        />
        {/* Progress */}
        {!isUnplanned && (
          <circle
            cx="26"
            cy="26"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="4.5"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 26 26)"
          />
        )}
        {/* Inner label */}
        <text
          x="26"
          y="30"
          textAnchor="middle"
          fontSize={isExceeded ? 7.5 : 9}
          fontWeight="600"
          fill={isExceeded ? '#ef4444' : '#0f172a'}
        >
          {innerLabel()}
        </text>
      </svg>

      <span className="text-[10px] font-medium text-center leading-tight truncate w-full px-0.5 text-text">
        {result.category}
      </span>

      {subLabel() && (
        <span
          className={`text-[9px] text-center ${isExceeded ? 'text-red-500' : 'text-green-600'}`}
        >
          {subLabel()}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run tests — expect all to pass**

```bash
npm run test -- PlannerCategoryBar PlannerCategoryRadial --run
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/planner/PlannerCategoryBar.tsx \
        src/components/planner/PlannerCategoryBar.test.tsx \
        src/components/planner/PlannerCategoryRadial.tsx \
        src/components/planner/PlannerCategoryRadial.test.tsx
git commit -m "feat: add PlannerCategoryBar and PlannerCategoryRadial components"
```

---

### Task 7: Create `PlannerCard`

The full widget card. Has its own `periodOffset` and `expanded` state. Toggle persists `chartView` to Firestore via `useUpdatePlanner`.

**Files:**
- Create: `src/components/planner/PlannerCard.tsx`
- Create: `src/components/planner/PlannerCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/planner/PlannerCard.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../../hooks/usePlannerAggregation', () => ({
  usePlannerAggregation: vi.fn(() => ({
    dateRange: { start: new Date('2026-05-01'), end: new Date('2026-05-31') },
    periodLabel: 'May 2026',
    isCurrentPeriod: true,
    summary: { totalPlanned: 1800, totalSpent: 1200, totalRemaining: 600 },
    categoryResults: [
      { category: 'Food', planned: 1000, spent: 800, remaining: 200, pct: 80, status: 'near' },
      { category: 'Transport', planned: 500, spent: 300, remaining: 200, pct: 60, status: 'ok' },
      { category: 'Shopping', planned: 300, spent: 100, remaining: 200, pct: 33, status: 'ok' },
    ],
    unplannedResults: [],
  })),
}));

vi.mock('../../hooks/useMutatePlanner', () => ({
  useUpdatePlanner: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('../../context/SyncStatusContext', () => ({
  useSyncStatus: vi.fn(() => ({ notifyWrite: vi.fn() })),
  SyncStatusProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { PlannerCard } from './PlannerCard';
import type { BudgetPlanner } from '../../firestore/types';

const planner: BudgetPlanner = {
  id: 'p1',
  user_id: 'u1',
  name: 'Monthly SGD',
  description: '',
  currency: 'SGD',
  active: true,
  archived: false,
  period: 'monthly',
  repeatable: true,
  filterAccounts: [],
  filterVendors: [],
  filterPayments: [],
  categoryBudgets: [
    { category: 'Food', amount: 1000 },
    { category: 'Transport', amount: 500 },
    { category: 'Shopping', amount: 300 },
  ],
  chartView: 'bar',
  createdAt: new Date('2026-05-01'),
  updatedAt: new Date('2026-05-01'),
};

describe('PlannerCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders planner name and period label', () => {
    render(<PlannerCard planner={planner} transactions={[]} onCardClick={vi.fn()} />);
    expect(screen.getByText('Monthly SGD')).toBeTruthy();
    expect(screen.getByText(/May 2026/)).toBeTruthy();
  });

  it('renders summary totals', () => {
    render(<PlannerCard planner={planner} transactions={[]} onCardClick={vi.fn()} />);
    expect(screen.getByText(/1,800|1800/)).toBeTruthy();
  });

  it('renders category bars', () => {
    render(<PlannerCard planner={planner} transactions={[]} onCardClick={vi.fn()} />);
    expect(screen.getByText('Food')).toBeTruthy();
    expect(screen.getByText('Transport')).toBeTruthy();
  });

  it('shows period navigation footer for repeatable planners', () => {
    render(<PlannerCard planner={planner} transactions={[]} onCardClick={vi.fn()} />);
    expect(screen.getByText(/Prev|‹/)).toBeTruthy();
    expect(screen.getByText(/Next|›/)).toBeTruthy();
  });

  it('hides period navigation for non-repeatable planners', () => {
    const nonRepeatable = { ...planner, repeatable: false, customStart: new Date('2026-05-01'), customEnd: new Date('2026-05-31') };
    render(<PlannerCard planner={nonRepeatable} transactions={[]} onCardClick={vi.fn()} />);
    expect(screen.queryByText(/Prev|‹/)).toBeNull();
  });

  it('calls onCardClick when card body is clicked', () => {
    const onCardClick = vi.fn();
    render(<PlannerCard planner={planner} transactions={[]} onCardClick={onCardClick} />);
    fireEvent.click(screen.getByRole('button', { name: /open planner detail/i }));
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  it('shows expand button when categories exceed 8', () => {
    const { usePlannerAggregation } = await import('../../hooks/usePlannerAggregation');
    vi.mocked(usePlannerAggregation).mockReturnValue({
      dateRange: { start: new Date(), end: new Date() },
      periodLabel: 'May 2026',
      isCurrentPeriod: true,
      summary: { totalPlanned: 0, totalSpent: 0, totalRemaining: 0 },
      categoryResults: Array.from({ length: 10 }, (_, i) => ({
        category: `Cat${i}`,
        planned: 100,
        spent: 50,
        remaining: 50,
        pct: 50,
        status: 'ok' as const,
      })),
      unplannedResults: [],
    });
    render(<PlannerCard planner={planner} transactions={[]} onCardClick={vi.fn()} />);
    expect(screen.getByText(/\+ 2 more/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- PlannerCard --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/planner/PlannerCard.tsx`**

```tsx
import { useState } from 'react';
import { usePlannerAggregation } from '../../hooks/usePlannerAggregation';
import { useUpdatePlanner } from '../../hooks/useMutatePlanner';
import { formatCurrency } from '../../lib/plannerUtils';
import { PlannerCategoryBar } from './PlannerCategoryBar';
import { PlannerCategoryRadial } from './PlannerCategoryRadial';
import type { BudgetPlanner, Transaction } from '../../firestore/types';

const MAX_VISIBLE = 8;

interface Props {
  planner: BudgetPlanner;
  transactions: Transaction[];
  /** Called when the card body is tapped. Receives the current periodOffset. */
  onCardClick: (periodOffset: number) => void;
}

function BarIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="3" width="12" height="2.2" rx="1" fill={active ? 'var(--color-brand)' : '#94a3b8'} />
      <rect x="1" y="6.4" width="8" height="2.2" rx="1" fill={active ? 'var(--color-brand)' : '#94a3b8'} />
      <rect x="1" y="9.8" width="10" height="2.2" rx="1" fill={active ? 'var(--color-brand)' : '#94a3b8'} />
    </svg>
  );
}

function RadialIcon({ active }: { active: boolean }) {
  const c = active ? 'var(--color-brand)' : '#94a3b8';
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="#e2e8f0" strokeWidth="2" />
      <circle
        cx="7" cy="7" r="5.5"
        stroke={c}
        strokeWidth="2"
        strokeDasharray="21.5 13"
        strokeLinecap="round"
        transform="rotate(-90 7 7)"
      />
    </svg>
  );
}

export function PlannerCard({ planner, transactions, onCardClick }: Props) {
  const [periodOffset, setPeriodOffset] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const { mutate: updatePlanner } = useUpdatePlanner();

  const agg = usePlannerAggregation(planner, transactions, periodOffset);

  const allCategories = [...agg.categoryResults, ...agg.unplannedResults];
  const visibleCategories = expanded ? allCategories : allCategories.slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, allCategories.length - MAX_VISIBLE);
  const firstUnplannedIndex = allCategories.findIndex((r) => r.status === 'unplanned');

  const canNavigate = planner.repeatable;

  function handleToggle(view: BudgetPlanner['chartView']) {
    updatePlanner(planner.id, { chartView: view });
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* ── Card body (tappable) ── */}
      <button
        type="button"
        aria-label="Open planner detail"
        className="text-left p-4 pb-3 hover:bg-surface-alt/50 transition-colors"
        onClick={() => onCardClick(periodOffset)}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-text truncate">{planner.name}</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {agg.periodLabel} · {planner.currency}
              {!agg.isCurrentPeriod && (
                <span className="ml-1 text-[10px] bg-surface-alt border border-border rounded px-1">
                  past
                </span>
              )}
            </p>
          </div>

          {/* Bar / Radial toggle */}
          <div
            className="flex gap-0.5 bg-surface-alt border border-border rounded-md p-0.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Bar view"
              onClick={() => handleToggle('bar')}
              className={`rounded p-1 transition-all ${
                planner.chartView === 'bar' ? 'bg-surface shadow-sm' : ''
              }`}
            >
              <BarIcon active={planner.chartView === 'bar'} />
            </button>
            <button
              type="button"
              aria-label="Radial view"
              onClick={() => handleToggle('radial')}
              className={`rounded p-1 transition-all ${
                planner.chartView === 'radial' ? 'bg-surface shadow-sm' : ''
              }`}
            >
              <RadialIcon active={planner.chartView === 'radial'} />
            </button>
          </div>
        </div>

        {/* Summary row */}
        <div className="flex gap-4">
          {(
            [
              { label: 'Planned', value: agg.summary.totalPlanned },
              { label: 'Spent', value: agg.summary.totalSpent },
              { label: 'Remaining', value: agg.summary.totalRemaining },
            ] as const
          ).map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {label}
              </span>
              <span
                className={`text-sm font-bold leading-tight ${
                  label === 'Remaining' && value < 0 ? 'text-red-500' : 'text-text'
                }`}
              >
                {value < 0 ? '-' : ''}
                {formatCurrency(Math.abs(value), planner.currency)}
              </span>
            </div>
          ))}
        </div>
      </button>

      {/* ── Category list ── */}
      <div className="px-4 pb-1" onClick={(e) => e.stopPropagation()}>
        {planner.chartView === 'bar' ? (
          <>
            {visibleCategories.map((r, idx) => (
              <PlannerCategoryBar
                key={r.category}
                result={r}
                currency={planner.currency}
                isFirstUnplanned={idx === firstUnplannedIndex}
              />
            ))}
          </>
        ) : (
          <div className="grid grid-cols-4 gap-1 py-1">
            {visibleCategories.map((r) => (
              <PlannerCategoryRadial key={r.category} result={r} currency={planner.currency} />
            ))}
          </div>
        )}

        {/* Expand / collapse */}
        {!expanded && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full text-center text-xs text-text-muted py-2 hover:text-text transition-colors"
          >
            + {hiddenCount} more
          </button>
        )}
        {expanded && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="w-full text-center text-xs text-text-muted py-1.5 hover:text-text transition-colors"
          >
            ↑ Show less
          </button>
        )}
      </div>

      {/* ── Period navigation footer (repeatable planners only) ── */}
      {canNavigate && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-surface-alt text-xs text-text-muted mt-auto">
          <button
            type="button"
            aria-label="Previous period"
            onClick={() => {
              setPeriodOffset((o) => o - 1);
              setExpanded(false);
            }}
            className="hover:text-text transition-colors px-1"
          >
            ‹ Prev
          </button>
          <span className="text-center leading-tight">
            {agg.isCurrentPeriod ? `${agg.periodLabel} (current)` : agg.periodLabel}
          </span>
          <button
            type="button"
            aria-label="Next period"
            onClick={() => {
              setPeriodOffset((o) => Math.min(0, o + 1));
              setExpanded(false);
            }}
            disabled={periodOffset >= 0}
            className="hover:text-text transition-colors px-1 disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm run test -- PlannerCard --run
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/planner/PlannerCard.tsx src/components/planner/PlannerCard.test.tsx
git commit -m "feat: add PlannerCard widget component"
```

---

### Task 8: Create `BudgetPlannerCarousel` and wire into `Dashboard`

The horizontal scroll container. Tracks which planner is selected (for the detail drawer in Phase 3). Wires into Dashboard between `HeroStatsRow` and `SpendingChart`.

**Files:**
- Create: `src/components/planner/BudgetPlannerCarousel.tsx`
- Create: `src/components/planner/BudgetPlannerCarousel.test.tsx`
- Modify: `src/routes/Dashboard.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/planner/BudgetPlannerCarousel.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({ status: 'authenticated', user: { uid: 'u1' } })),
}));

vi.mock('../../hooks/usePlanners', () => ({
  usePlanners: vi.fn(() => ({
    planners: [],
    loading: false,
    error: null,
    hasPendingWrites: false,
  })),
}));

vi.mock('../../context/TransactionContext', () => ({
  useTransactionContext: vi.fn(() => ({ transactions: [], loading: false, error: null, hasPendingWrites: false })),
}));

vi.mock('../../hooks/usePlannerAggregation', () => ({
  usePlannerAggregation: vi.fn(() => ({
    dateRange: { start: new Date(), end: new Date() },
    periodLabel: 'May 2026',
    isCurrentPeriod: true,
    summary: { totalPlanned: 0, totalSpent: 0, totalRemaining: 0 },
    categoryResults: [],
    unplannedResults: [],
  })),
}));

vi.mock('../../hooks/useMutatePlanner', () => ({
  useUpdatePlanner: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('../../context/SyncStatusContext', () => ({
  useSyncStatus: vi.fn(() => ({ notifyWrite: vi.fn() })),
  SyncStatusProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { usePlanners } from '../../hooks/usePlanners';
import { BudgetPlannerCarousel } from './BudgetPlannerCarousel';
import type { BudgetPlanner } from '../../firestore/types';

function makePlanner(id: string, name: string): BudgetPlanner {
  return {
    id,
    user_id: 'u1',
    name,
    description: '',
    currency: 'SGD',
    active: true,
    archived: false,
    period: 'monthly',
    repeatable: true,
    filterAccounts: [],
    filterVendors: [],
    filterPayments: [],
    categoryBudgets: [],
    chartView: 'bar',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('BudgetPlannerCarousel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows empty state when there are no active planners', () => {
    render(<BudgetPlannerCarousel />);
    expect(screen.getByText(/create your first budget planner/i)).toBeTruthy();
  });

  it('renders a card for each active planner', () => {
    vi.mocked(usePlanners).mockReturnValue({
      planners: [makePlanner('p1', 'Monthly SGD'), makePlanner('p2', 'Weekly Cash')],
      loading: false,
      error: null,
      hasPendingWrites: false,
    });
    render(<BudgetPlannerCarousel />);
    expect(screen.getByText('Monthly SGD')).toBeTruthy();
    expect(screen.getByText('Weekly Cash')).toBeTruthy();
  });

  it('shows loading state', () => {
    vi.mocked(usePlanners).mockReturnValue({
      planners: [],
      loading: true,
      error: null,
      hasPendingWrites: false,
    });
    render(<BudgetPlannerCarousel />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('excludes inactive and archived planners', () => {
    vi.mocked(usePlanners).mockReturnValue({
      planners: [
        makePlanner('p1', 'Active'),
        { ...makePlanner('p2', 'Inactive'), active: false },
        { ...makePlanner('p3', 'Archived'), archived: true },
      ],
      loading: false,
      error: null,
      hasPendingWrites: false,
    });
    render(<BudgetPlannerCarousel />);
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.queryByText('Inactive')).toBeNull();
    expect(screen.queryByText('Archived')).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- BudgetPlannerCarousel --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/planner/BudgetPlannerCarousel.tsx`**

```tsx
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { usePlanners } from '../../hooks/usePlanners';
import { useTransactionContext } from '../../context/TransactionContext';
import { PlannerCard } from './PlannerCard';
import type { BudgetPlanner } from '../../firestore/types';

// selectedPlanner state is set here and passed down in Phase 3 when
// PlannerDetailDrawer is added. For now, the onCardClick stores selection
// but nothing renders.
export function BudgetPlannerCarousel() {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { planners, loading } = usePlanners(uid);
  const { transactions } = useTransactionContext();

  const [selected, setSelected] = useState<{
    planner: BudgetPlanner;
    offset: number;
  } | null>(null);

  const activePlanners = planners.filter((p) => p.active && !p.archived);

  if (loading) {
    return (
      <div role="status" className="flex gap-4 overflow-hidden py-1">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="shrink-0 w-80 h-56 rounded-xl bg-surface-alt border border-border animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (activePlanners.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface-alt py-8 px-6 text-center">
        <div>
          <p className="text-sm font-medium text-text">No active budget planners</p>
          <p className="text-xs text-text-muted mt-1">
            Create your first budget planner in{' '}
            <span className="text-brand font-medium">Settings → Budget Planners</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Horizontal scroll carousel with snap */}
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {activePlanners.map((planner) => (
          <div key={planner.id} className="snap-start shrink-0 w-80 sm:w-96">
            <PlannerCard
              planner={planner}
              transactions={transactions}
              onCardClick={(offset) => setSelected({ planner, offset })}
            />
          </div>
        ))}
      </div>

      {/* PlannerDetailDrawer will be added here in Phase 3 */}
      {selected && null /* Phase 3: replace with <PlannerDetailDrawer ... /> */}
    </>
  );
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm run test -- BudgetPlannerCarousel --run
```

Expected: all PASS.

- [ ] **Step 5: Wire carousel into `Dashboard.tsx`**

Add the import at the top of `src/routes/Dashboard.tsx` (after existing dashboard imports):

```typescript
import { BudgetPlannerCarousel } from '../components/planner/BudgetPlannerCarousel';
```

Then in the JSX, insert the carousel between `<HeroStatsRow ... />` and the two-column `<div className="flex flex-col gap-4 md:flex-row">`. The result should look like:

```tsx
return (
  <div className="flex flex-col gap-4 p-3 sm:p-6">
    <HeroStatsRow ... />

    {/* Budget Planner carousel */}
    <BudgetPlannerCarousel />

    <div className="flex flex-col gap-4 md:flex-row">
      {/* ... rest of dashboard ... */}
    </div>
    ...
  </div>
);
```

- [ ] **Step 6: Typecheck and run all tests**

```bash
npm run typecheck && npm run test -- --run
```

Expected: all PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/planner/BudgetPlannerCarousel.tsx \
        src/components/planner/BudgetPlannerCarousel.test.tsx \
        src/routes/Dashboard.tsx
git commit -m "feat: add BudgetPlannerCarousel and wire into Dashboard"
```

---

*Phase 2 complete. Continue with Phase 3 (PlannerDetailDrawer).*
