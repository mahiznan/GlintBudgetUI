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
import { useUpdatePlanner } from '../../hooks/useMutatePlanner';
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

  it('switches to radial view immediately on toggle without waiting for prop update', () => {
    const { container } = render(<PlannerCard planner={planner} transactions={[]} onCardClick={vi.fn()} />);
    // bar view: no radial SVGs
    expect(container.querySelectorAll('svg[width="52"]').length).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: /radial view/i }));

    // radial SVGs appear immediately — planner prop has NOT changed
    expect(container.querySelectorAll('svg[width="52"]').length).toBeGreaterThan(0);
  });

  it('calls updatePlanner with new chartView when toggle is clicked', () => {
    const mutate = vi.fn();
    vi.mocked(useUpdatePlanner).mockReturnValue({ mutate });

    render(<PlannerCard planner={planner} transactions={[]} onCardClick={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /radial view/i }));

    expect(mutate).toHaveBeenCalledWith('p1', { chartView: 'radial' });
  });

  it('calls onCardClick when card body is clicked', () => {
    const onCardClick = vi.fn();
    render(<PlannerCard planner={planner} transactions={[]} onCardClick={onCardClick} />);
    fireEvent.click(screen.getByRole('button', { name: /open planner detail/i }));
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  it('shows expand button when categories exceed 8', async () => {
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
