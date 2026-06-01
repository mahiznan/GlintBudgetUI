import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HeroStatsRow from './HeroStatsRow';
import type { BudgetPlanner } from '../../firestore/types';

const stats = {
  totalExpenses: 12500,
  totalIncome: 50000,
  currencySymbol: '₹',
};

const makePlanner = (): BudgetPlanner => ({
  id: 'planner-1',
  user_id: 'user-1',
  name: 'Groceries',
  description: 'Test planner',
  currency: 'INR',
  active: true,
  archived: false,
  period: 'monthly',
  repeatable: true,
  filterAccounts: [],
  filterVendors: [],
  filterPayments: [],
  categoryBudgets: [{ category: 'Food', amount: 5000 }],
  chartView: 'bar',
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('HeroStatsRow', () => {
  it('renders income and expenses labels', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.getByText(/expenses/i)).toBeInTheDocument();
    expect(screen.getByText(/income/i)).toBeInTheDocument();
  });

  it('does not render net balance or transactions', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.queryByText(/net balance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/transactions/i)).not.toBeInTheDocument();
  });

  it('formats amounts with currency symbol', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.getByText(/₹12,500/)).toBeInTheDocument();
    expect(screen.getByText(/₹50,000/)).toBeInTheDocument();
  });

  it('renders MiniBudgetWidget when activePlanner is provided', () => {
    const planner = makePlanner();
    render(<HeroStatsRow {...stats} activePlanner={planner} transactions={[]} />);

    expect(screen.getByText(/groceries/i)).toBeInTheDocument();
  });

  it('does not render MiniBudgetWidget when activePlanner is null', () => {
    render(<HeroStatsRow {...stats} activePlanner={null} transactions={[]} />);

    expect(screen.queryByText(/groceries/i)).not.toBeInTheDocument();
  });

  it('does not render MiniBudgetWidget when activePlanner is undefined', () => {
    render(<HeroStatsRow {...stats} />);

    expect(screen.queryByText(/groceries/i)).not.toBeInTheDocument();
  });

  it('calls onPlannerClick when MiniBudgetWidget is clicked', async () => {
    const onPlannerClick = vi.fn();
    const planner = makePlanner();
    const user = userEvent.setup();

    render(
      <HeroStatsRow
        {...stats}
        activePlanner={planner}
        transactions={[]}
        onPlannerClick={onPlannerClick}
      />
    );

    const widget = screen.getByRole('button');
    await user.click(widget);

    expect(onPlannerClick).toHaveBeenCalledTimes(1);
  });
});
