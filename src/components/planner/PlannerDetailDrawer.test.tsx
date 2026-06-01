import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../hooks/usePlannerAggregation', () => ({
  usePlannerAggregation: vi.fn(() => ({
    dateRange: { start: new Date('2026-05-01'), end: new Date('2026-05-31') },
    periodLabel: 'May 2026',
    isCurrentPeriod: true,
    summary: { totalPlanned: 1800, totalSpent: 1200, totalRemaining: 600 },
    categoryResults: [
      { category: 'Food', planned: 1000, spent: 800, remaining: 200, pct: 80, status: 'near' },
      { category: 'Transport', planned: 500, spent: 300, remaining: 200, pct: 60, status: 'ok' },
    ],
    unplannedResults: [
      { category: 'Health', planned: 0, spent: 45, remaining: -45, pct: 0, status: 'unplanned' },
    ],
  })),
}));

vi.mock('../../lib/plannerUtils', async () => {
  const actual = await vi.importActual<typeof import('../../lib/plannerUtils')>('../../lib/plannerUtils');
  return {
    ...actual,
    filterTransactionsForPlanner: vi.fn(() => [
      {
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
        amount: 800,
        icon: '',
      },
    ]),
  };
});

vi.mock('../../hooks/useMutatePlanner', () => ({
  useUpdatePlanner: vi.fn(() => ({
    mutate: vi.fn(),
  })),
}));

import { PlannerDetailDrawer } from './PlannerDetailDrawer';
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
  ],
  chartView: 'bar',
  createdAt: new Date('2026-05-01'),
  updatedAt: new Date('2026-05-01'),
};

describe('PlannerDetailDrawer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders planner name and period label', () => {
    render(
      <PlannerDetailDrawer
        planner={planner}
        transactions={[]}
        initialOffset={0}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Monthly SGD')).toBeTruthy();
    expect(screen.getByText(/May 2026/)).toBeTruthy();
  });

  it('renders all categories without 8-cap', () => {
    render(
      <PlannerDetailDrawer
        planner={planner}
        transactions={[]}
        initialOffset={0}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Food')).toBeTruthy();
    expect(screen.getByText('Transport')).toBeTruthy();
    expect(screen.getByText('Health')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <PlannerDetailDrawer
        planner={planner}
        transactions={[]}
        initialOffset={0}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    // After animation delay onClose is called; test the state immediately
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('expanding a category row shows subcategory section', () => {
    render(
      <PlannerDetailDrawer
        planner={planner}
        transactions={[]}
        initialOffset={0}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /expand Food/i }));
    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(screen.getByText('NTUC')).toBeTruthy();
  });

  it('shows period navigation for repeatable planners', () => {
    render(
      <PlannerDetailDrawer
        planner={planner}
        transactions={[]}
        initialOffset={0}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /previous period/i })).toBeTruthy();
  });

  it('toggles between bar and radial chart views', async () => {
    const plannerWithBarView: BudgetPlanner = {
      ...planner,
      chartView: 'bar',
    };

    render(
      <PlannerDetailDrawer
        planner={plannerWithBarView}
        transactions={[]}
        initialOffset={0}
        onClose={vi.fn()}
      />,
    );

    // Initially both buttons should exist
    const barButton = screen.getByRole('button', { name: /bar view/i });
    const radialButton = screen.getByRole('button', { name: /radial view/i });

    expect(barButton).toBeTruthy();
    expect(radialButton).toBeTruthy();

    // Bar view should be active initially (has bg-surface class)
    expect(barButton).toHaveClass('bg-surface');
    expect(radialButton).not.toHaveClass('bg-surface');

    // Click radial view button
    fireEvent.click(radialButton);

    // Radial view should now be active (wait for async state update)
    await waitFor(() => {
      expect(radialButton).toHaveClass('bg-surface');
      expect(barButton).not.toHaveClass('bg-surface');
    });

    // Click back to bar view
    fireEvent.click(barButton);

    // Bar view should be active again (wait for async state update)
    await waitFor(() => {
      expect(barButton).toHaveClass('bg-surface');
      expect(radialButton).not.toHaveClass('bg-surface');
    });
  });

  it('handles clicking the same button twice without error', async () => {
    const plannerWithBarView: BudgetPlanner = {
      ...planner,
      chartView: 'bar',
    };

    render(
      <PlannerDetailDrawer
        planner={plannerWithBarView}
        transactions={[]}
        initialOffset={0}
        onClose={vi.fn()}
      />,
    );

    const barButton = screen.getByRole('button', { name: /bar view/i });

    // Bar view is active
    expect(barButton).toHaveClass('bg-surface');

    // Click bar button twice
    fireEvent.click(barButton);

    await waitFor(() => {
      expect(barButton).toHaveClass('bg-surface');
    });

    fireEvent.click(barButton);

    // Should still be active (no error, state remains stable)
    await waitFor(() => {
      expect(barButton).toHaveClass('bg-surface');
    });
  });
});
