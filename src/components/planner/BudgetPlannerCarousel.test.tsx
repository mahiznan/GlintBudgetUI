import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../../context/PlannerContext', () => ({
  usePlannerContext: vi.fn(() => ({
    planners: [],
    loading: false,
    error: null,
    addPlanner: vi.fn(() => 'id'),
    updatePlanner: vi.fn(),
    archivePlanner: vi.fn(),
    deletePlanner: vi.fn(),
  })),
}));

vi.mock('../../context/TransactionContext', () => ({
  useTransactionContext: vi.fn(() => ({ transactions: [], loading: false, error: null, addTransaction: vi.fn(), updateTransaction: vi.fn(), deleteTransaction: vi.fn(), loadYear: vi.fn() })),
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

import { usePlannerContext } from '../../context/PlannerContext';
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
    render(<MemoryRouter><BudgetPlannerCarousel /></MemoryRouter>);
    expect(screen.getByText(/create your first budget planner/i)).toBeTruthy();
  });

  it('renders a card for each active planner', () => {
    vi.mocked(usePlannerContext).mockReturnValue({
      planners: [makePlanner('p1', 'Monthly SGD'), makePlanner('p2', 'Weekly Cash')],
      loading: false,
      error: null,
      addPlanner: vi.fn(() => 'id'),
      updatePlanner: vi.fn(),
      archivePlanner: vi.fn(),
      deletePlanner: vi.fn(),
    });
    render(<MemoryRouter><BudgetPlannerCarousel /></MemoryRouter>);
    expect(screen.getByText('Monthly SGD')).toBeTruthy();
    expect(screen.getByText('Weekly Cash')).toBeTruthy();
  });

  it('shows loading state', () => {
    vi.mocked(usePlannerContext).mockReturnValue({
      planners: [],
      loading: true,
      error: null,
      addPlanner: vi.fn(() => 'id'),
      updatePlanner: vi.fn(),
      archivePlanner: vi.fn(),
      deletePlanner: vi.fn(),
    });
    render(<MemoryRouter><BudgetPlannerCarousel /></MemoryRouter>);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('excludes inactive and archived planners', () => {
    vi.mocked(usePlannerContext).mockReturnValue({
      planners: [
        makePlanner('p1', 'Active'),
        { ...makePlanner('p2', 'Inactive'), active: false },
        { ...makePlanner('p3', 'Archived'), archived: true },
      ],
      loading: false,
      error: null,
      addPlanner: vi.fn(() => 'id'),
      updatePlanner: vi.fn(),
      archivePlanner: vi.fn(),
      deletePlanner: vi.fn(),
    });
    render(<MemoryRouter><BudgetPlannerCarousel /></MemoryRouter>);
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.queryByText('Inactive')).toBeNull();
    expect(screen.queryByText('Archived')).toBeNull();
  });
});
