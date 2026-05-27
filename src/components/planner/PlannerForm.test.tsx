import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../../hooks/useMutatePlanner', () => ({
  useAddPlanner: vi.fn(() => ({ mutate: vi.fn(() => 'new-id') })),
  useUpdatePlanner: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('../../context/SyncStatusContext', () => ({
  useSyncStatus: vi.fn(() => ({ notifyWrite: vi.fn() })),
  SyncStatusProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../../context/PreferenceContext', () => ({
  usePreferenceContext: vi.fn(() => ({
    preference: {
      bookmarkedCurrencies: ['SGD', 'USD', 'MYR'],
      categories: [
        { name: 'Food', emoji: '🍜', type: 'expense', parent: null },
        { name: 'Transport', emoji: '🚌', type: 'expense', parent: null },
      ],
      accounts: [{ name: 'DBS', emoji: '🏦', type: 'account', parent: null }],
      payments: [{ name: 'credit', emoji: '💳', type: 'payment', parent: null }],
      vendors: [],
      defaultCurrency: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    },
  })),
}));

vi.mock('../../lib/plannerUtils', async () => {
  const actual = await vi.importActual<typeof import('../../lib/plannerUtils')>('../../lib/plannerUtils');
  return { ...actual, computeEffectiveDates: vi.fn(() => ({ customStart: new Date('2026-05-01'), customEnd: new Date('2026-05-31') })) };
});

import { useAddPlanner, useUpdatePlanner } from '../../hooks/useMutatePlanner';
import { PlannerForm } from './PlannerForm';
import type { BudgetPlanner } from '../../firestore/types';

const existingPlanner: BudgetPlanner = {
  id: 'p1',
  user_id: 'u1',
  name: 'Monthly SGD',
  description: 'My budget',
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
};

describe('PlannerForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the form in create mode', () => {
    render(<PlannerForm uid="u1" mode="create" onClose={vi.fn()} />);
    expect(screen.getByText(/new budget planner/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/planner name/i)).toBeTruthy();
  });

  it('pre-fills values in edit mode', () => {
    render(<PlannerForm uid="u1" mode="edit" initial={existingPlanner} onClose={vi.fn()} />);
    const nameInput = screen.getByDisplayValue('Monthly SGD');
    expect(nameInput).toBeTruthy();
  });

  it('shows validation error when name is empty', () => {
    render(<PlannerForm uid="u1" mode="create" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /save planner/i }));
    expect(screen.getByText(/name is required/i)).toBeTruthy();
  });

  it('calls useAddPlanner.mutate on valid create submission', () => {
    const addMutate = vi.fn(() => 'new-id');
    vi.mocked(useAddPlanner).mockReturnValue({ mutate: addMutate });

    render(<PlannerForm uid="u1" mode="create" onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/planner name/i), {
      target: { value: 'New Planner' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save planner/i }));
    expect(addMutate).toHaveBeenCalledTimes(1);
  });

  it('calls useUpdatePlanner.mutate on valid edit submission', () => {
    const updateMutate = vi.fn();
    vi.mocked(useUpdatePlanner).mockReturnValue({ mutate: updateMutate });

    render(<PlannerForm uid="u1" mode="edit" initial={existingPlanner} onClose={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue('Monthly SGD'), {
      target: { value: 'Renamed' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save planner/i }));
    expect(updateMutate).toHaveBeenCalledWith('p1', expect.objectContaining({ name: 'Renamed' }));
  });

  it('shows custom date fields when Custom period is selected', () => {
    render(<PlannerForm uid="u1" mode="create" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^custom$/i }));
    expect(screen.getByLabelText(/start date/i)).toBeTruthy();
    expect(screen.getByLabelText(/end date/i)).toBeTruthy();
  });
});
