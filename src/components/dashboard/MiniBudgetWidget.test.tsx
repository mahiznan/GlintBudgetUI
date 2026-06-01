import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MiniBudgetWidget from './MiniBudgetWidget';
import type { BudgetPlanner, Transaction } from '../../firestore/types';

const makePlanner = (name: string, budgets: Array<{ category: string; amount: number }> = []): BudgetPlanner => ({
  id: 'planner-1',
  user_id: 'user-1',
  name,
  description: 'Test planner',
  currency: 'INR',
  active: true,
  archived: false,
  period: 'monthly',
  repeatable: true,
  filterAccounts: [],
  filterVendors: [],
  filterPayments: [],
  categoryBudgets: budgets,
  chartView: 'bar',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeTx = (
  category: string,
  amount: number,
  date: Date = new Date(),
): Transaction => ({
  id: 'tx-1',
  user_id: 'user-1',
  category,
  subCategory: 'subcategory',
  date,
  account: 'bank',
  vendor: 'vendor',
  payment: 'payment',
  currency: 'INR',
  notes: '',
  amount,
  icon: '🍔',
});

describe('MiniBudgetWidget', () => {
  it('renders with planner name and period', () => {
    const planner = makePlanner('Groceries Budget');
    render(<MiniBudgetWidget planner={planner} transactions={[]} onWidgetClick={() => {}} />);

    expect(screen.getByText(/groceries budget/i)).toBeInTheDocument();
  });

  it('displays budget amount formatted as currency', () => {
    const planner = makePlanner('Groceries', [{ category: 'Food', amount: 5000 }]);
    render(<MiniBudgetWidget planner={planner} transactions={[]} onWidgetClick={() => {}} />);

    const budgetElements = screen.getAllByText(/₹5,000/);
    expect(budgetElements.length).toBeGreaterThan(0);
  });

  it('displays spent amount formatted as currency', () => {
    const planner = makePlanner('Groceries', [{ category: 'Food', amount: 5000 }]);
    const transactions = [makeTx('Food', -2000)];
    render(<MiniBudgetWidget planner={planner} transactions={transactions} onWidgetClick={() => {}} />);

    expect(screen.getByText(/₹2,000/)).toBeInTheDocument();
  });

  it('displays remaining amount formatted as currency', () => {
    const planner = makePlanner('Groceries', [{ category: 'Food', amount: 5000 }]);
    const transactions = [makeTx('Food', -2000)];
    render(<MiniBudgetWidget planner={planner} transactions={transactions} onWidgetClick={() => {}} />);

    // Remaining = 5000 - 2000 = 3000
    expect(screen.getByText(/₹3,000/)).toBeInTheDocument();
  });

  it('shows correct percentage text when under budget', () => {
    const planner = makePlanner('Groceries', [{ category: 'Food', amount: 5000 }]);
    const transactions = [makeTx('Food', -3000)];
    render(<MiniBudgetWidget planner={planner} transactions={transactions} onWidgetClick={() => {}} />);

    expect(screen.getByText(/60% of budget/i)).toBeInTheDocument();
  });

  it('shows 100% when spent equals budget', () => {
    const planner = makePlanner('Groceries', [{ category: 'Food', amount: 5000 }]);
    const transactions = [makeTx('Food', -5000)];
    render(<MiniBudgetWidget planner={planner} transactions={transactions} onWidgetClick={() => {}} />);

    expect(screen.getByText(/100% of budget/i)).toBeInTheDocument();
  });

  it('shows percentage over 100% when exceeding budget', () => {
    const planner = makePlanner('Groceries', [{ category: 'Food', amount: 5000 }]);
    const transactions = [makeTx('Food', -6000)];
    render(<MiniBudgetWidget planner={planner} transactions={transactions} onWidgetClick={() => {}} />);

    expect(screen.getByText(/120% of budget/i)).toBeInTheDocument();
  });

  it('applies green gradient when under 75%', () => {
    const planner = makePlanner('Groceries', [{ category: 'Food', amount: 5000 }]);
    const transactions = [makeTx('Food', -3500)]; // 70%
    const { container } = render(
      <MiniBudgetWidget planner={planner} transactions={transactions} onWidgetClick={() => {}} />
    );

    const progressBar = container.querySelector('[data-testid="progress-bar"]');
    expect(progressBar).toHaveClass('bg-gradient-to-r');
    expect(progressBar).toHaveClass('from-green-500');
    expect(progressBar).toHaveClass('to-green-700');
  });

  it('applies orange gradient when 75-100%', () => {
    const planner = makePlanner('Groceries', [{ category: 'Food', amount: 5000 }]);
    const transactions = [makeTx('Food', -4000)]; // 80%
    const { container } = render(
      <MiniBudgetWidget planner={planner} transactions={transactions} onWidgetClick={() => {}} />
    );

    const progressBar = container.querySelector('[data-testid="progress-bar"]');
    expect(progressBar).toHaveClass('from-amber-500');
    expect(progressBar).toHaveClass('to-amber-600');
  });

  it('applies red gradient when over 100%', () => {
    const planner = makePlanner('Groceries', [{ category: 'Food', amount: 5000 }]);
    const transactions = [makeTx('Food', -6000)]; // 120%
    const { container } = render(
      <MiniBudgetWidget planner={planner} transactions={transactions} onWidgetClick={() => {}} />
    );

    const progressBar = container.querySelector('[data-testid="progress-bar"]');
    expect(progressBar).toHaveClass('from-red-500');
    expect(progressBar).toHaveClass('to-red-700');
  });

  it('calls onWidgetClick when clicked', async () => {
    const onWidgetClick = vi.fn();
    const planner = makePlanner('Groceries');
    const user = userEvent.setup();

    render(<MiniBudgetWidget planner={planner} transactions={[]} onWidgetClick={onWidgetClick} />);

    const widget = screen.getByRole('button');
    await user.click(widget);

    expect(onWidgetClick).toHaveBeenCalledTimes(1);
  });

  it('caps progress bar width at 100% when exceeding budget', () => {
    const planner = makePlanner('Groceries', [{ category: 'Food', amount: 5000 }]);
    const transactions = [makeTx('Food', -7500)]; // 150%
    const { container } = render(
      <MiniBudgetWidget planner={planner} transactions={transactions} onWidgetClick={() => {}} />
    );

    const progressBar = container.querySelector('[data-testid="progress-bar"]');
    expect(progressBar).toHaveStyle('width: 100%');
  });

  it('displays correct width for progress bar at various percentages', () => {
    const planner = makePlanner('Groceries', [{ category: 'Food', amount: 1000 }]);
    const transactions = [makeTx('Food', -500)]; // 50%
    const { container } = render(
      <MiniBudgetWidget planner={planner} transactions={transactions} onWidgetClick={() => {}} />
    );

    const progressBar = container.querySelector('[data-testid="progress-bar"]');
    expect(progressBar).toHaveStyle('width: 50%');
  });

  it('handles zero budget gracefully', () => {
    const planner = makePlanner('Groceries', [{ category: 'Food', amount: 0 }]);
    render(<MiniBudgetWidget planner={planner} transactions={[]} onWidgetClick={() => {}} />);

    expect(screen.getByText(/0% of budget/i)).toBeInTheDocument();
  });

  it('handles no transactions', () => {
    const planner = makePlanner('Groceries', [{ category: 'Food', amount: 5000 }]);
    render(<MiniBudgetWidget planner={planner} transactions={[]} onWidgetClick={() => {}} />);

    expect(screen.getByText(/0% of budget/i)).toBeInTheDocument();
    const budgetElements = screen.getAllByText(/₹5,000/);
    expect(budgetElements.length).toBeGreaterThan(0);
  });

  it('handles multiple category budgets (aggregate)', () => {
    const planner = makePlanner('Personal', [
      { category: 'Food', amount: 5000 },
      { category: 'Transport', amount: 2000 },
    ]);
    const transactions = [makeTx('Food', -2000), makeTx('Transport', -1000)];
    render(<MiniBudgetWidget planner={planner} transactions={transactions} onWidgetClick={() => {}} />);

    // Budget: 7000, Spent: 3000 (43% when rounded)
    expect(screen.getByText(/₹7,000/)).toBeInTheDocument();
    expect(screen.getByText(/₹3,000/)).toBeInTheDocument();
    expect(screen.getByText(/43% of budget/i)).toBeInTheDocument();
  });

  it('filters transactions by currency', () => {
    const planner = makePlanner('USD Budget', [{ category: 'Food', amount: 100 }]);
    planner.currency = 'USD';
    const transactions = [
      makeTx('Food', -50), // INR - should be ignored
      makeTx('Food', -25), // INR - should be ignored
    ];
    render(<MiniBudgetWidget planner={planner} transactions={transactions} onWidgetClick={() => {}} />);

    // Since INR != USD, no transactions should be counted
    expect(screen.getByText(/0% of budget/i)).toBeInTheDocument();
  });

  it('ignores positive amounts (income)', () => {
    const planner = makePlanner('Groceries', [{ category: 'Food', amount: 5000 }]);
    const transactions = [
      makeTx('Food', 1000), // income - should be ignored
      makeTx('Food', -2000), // expense - should be counted
    ];
    render(<MiniBudgetWidget planner={planner} transactions={transactions} onWidgetClick={() => {}} />);

    expect(screen.getByText(/40% of budget/i)).toBeInTheDocument();
  });

  it('includes period label in header', () => {
    const planner = makePlanner('Groceries');
    const { container } = render(
      <MiniBudgetWidget planner={planner} transactions={[]} onWidgetClick={() => {}} />
    );

    // Should have planner name and a bullet separator
    const header = container.querySelector('[class*="font-bold"][class*="text-white/85"]');
    expect(header?.textContent).toMatch(/groceries/i);
    expect(header?.textContent).toMatch(/•/);
  });

  it('uses white text color', () => {
    const planner = makePlanner('Groceries');
    const { container } = render(
      <MiniBudgetWidget planner={planner} transactions={[]} onWidgetClick={() => {}} />
    );

    const widget = container.querySelector('button');
    expect(widget).toHaveClass('text-white');
  });

  it('is clickable with cursor-pointer', () => {
    const planner = makePlanner('Groceries');
    const { container } = render(
      <MiniBudgetWidget planner={planner} transactions={[]} onWidgetClick={() => {}} />
    );

    const widget = container.querySelector('button');
    expect(widget).toHaveClass('cursor-pointer');
  });
});
