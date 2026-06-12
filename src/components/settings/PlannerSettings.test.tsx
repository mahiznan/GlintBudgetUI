import { render, screen, fireEvent } from '@testing-library/react';
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

vi.mock('../../context/LayoutContext', () => ({
  useLayout: vi.fn(() => ({ layoutWidth: 'fixed', setLayoutWidth: vi.fn() })),
}));

vi.mock('../../hooks/useMutatePlanner', () => ({
  useArchivePlanner: vi.fn(() => ({ mutate: vi.fn() })),
  useDeletePlanner: vi.fn(() => ({ mutate: vi.fn() })),
  useUpdatePlanner: vi.fn(() => ({ mutate: vi.fn() })),
  useAddPlanner: vi.fn(() => ({ mutate: vi.fn(() => 'new-id') })),
}));

vi.mock('../../context/PreferenceContext', () => ({
  usePreferenceContext: vi.fn(() => ({
    preference: {
      bookmarkedCurrencies: ['SGD'],
      categories: [],
      accounts: [],
      payments: [],
      vendors: [],
      defaultCurrency: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    },
  })),
}));

vi.mock('../../context/SyncStatusContext', () => ({
  useSyncStatus: vi.fn(() => ({ notifyWrite: vi.fn() })),
  SyncStatusProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { usePlannerContext } from '../../context/PlannerContext';
import { useArchivePlanner, useDeletePlanner } from '../../hooks/useMutatePlanner';
import PlannerSettings from './PlannerSettings';
import type { BudgetPlanner } from '../../firestore/types';

function makePlanner(overrides: Partial<BudgetPlanner> = {}): BudgetPlanner {
  return {
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
    categoryBudgets: [],
    chartView: 'bar',
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
    ...overrides,
  };
}

describe('PlannerSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows empty state when no planners exist', () => {
    render(<PlannerSettings uid="u1" />);
    expect(screen.getByText(/no planners yet/i)).toBeTruthy();
  });

  it('renders active planners', () => {
    vi.mocked(usePlannerContext).mockReturnValue({
      planners: [makePlanner()],
      loading: false,
      error: null,
      addPlanner: vi.fn(() => 'id'),
      updatePlanner: vi.fn(),
      archivePlanner: vi.fn(),
      deletePlanner: vi.fn(),
    });
    render(<PlannerSettings uid="u1" />);
    expect(screen.getByText('Monthly SGD')).toBeTruthy();
  });

  it('opens PlannerForm when New Planner is clicked', () => {
    render(<PlannerSettings uid="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /new planner/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('calls archive when Archive button clicked', () => {
    const archiveMutate = vi.fn();
    vi.mocked(useArchivePlanner).mockReturnValue({ mutate: archiveMutate });
    vi.mocked(usePlannerContext).mockReturnValue({
      planners: [makePlanner()],
      loading: false,
      error: null,
      addPlanner: vi.fn(() => 'id'),
      updatePlanner: vi.fn(),
      archivePlanner: vi.fn(),
      deletePlanner: vi.fn(),
    });
    render(<PlannerSettings uid="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /archive/i }));
    expect(archiveMutate).toHaveBeenCalledWith('p1');
  });

  it('calls delete when Delete button clicked', () => {
    const deleteMutate = vi.fn();
    vi.mocked(useDeletePlanner).mockReturnValue({ mutate: deleteMutate });
    vi.mocked(usePlannerContext).mockReturnValue({
      planners: [makePlanner()],
      loading: false,
      error: null,
      addPlanner: vi.fn(() => 'id'),
      updatePlanner: vi.fn(),
      archivePlanner: vi.fn(),
      deletePlanner: vi.fn(),
    });
    render(<PlannerSettings uid="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(deleteMutate).toHaveBeenCalledWith('p1');
  });

  it('shows archived section with archived planners', () => {
    vi.mocked(usePlannerContext).mockReturnValue({
      planners: [makePlanner({ id: 'p2', name: 'Old Plan', archived: true, active: false })],
      loading: false,
      error: null,
      addPlanner: vi.fn(() => 'id'),
      updatePlanner: vi.fn(),
      archivePlanner: vi.fn(),
      deletePlanner: vi.fn(),
    });
    render(<PlannerSettings uid="u1" />);
    expect(screen.getByText(/archived/i)).toBeTruthy();
    expect(screen.getByText('Old Plan')).toBeTruthy();
  });
});
