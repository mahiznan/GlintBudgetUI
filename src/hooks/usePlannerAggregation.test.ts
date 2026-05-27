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
