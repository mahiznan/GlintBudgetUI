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
