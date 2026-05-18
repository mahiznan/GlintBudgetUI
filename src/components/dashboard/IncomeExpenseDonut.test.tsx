import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'lime', setTheme: vi.fn() }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
}));

import IncomeExpenseDonut from './IncomeExpenseDonut';
import type { CategoryItem } from './CategoryBreakdown';

const makeCategory = (name: string, total: number, pct: number): CategoryItem => ({
  name,
  icon: '🛒',
  total,
  pct,
});

describe('IncomeExpenseDonut', () => {
  it('renders the pie chart', () => {
    render(
      <IncomeExpenseDonut categories={[makeCategory('Food', 1500, 100)]} mode="expense" currencySymbol="₹" />
    );
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('shows "Expense by Category" title in expense mode', () => {
    render(
      <IncomeExpenseDonut categories={[]} mode="expense" currencySymbol="₹" />
    );
    expect(screen.getByText(/expense by category/i)).toBeInTheDocument();
  });

  it('shows "Income by Category" title in income mode', () => {
    render(
      <IncomeExpenseDonut categories={[]} mode="income" currencySymbol="₹" />
    );
    expect(screen.getByText(/income by category/i)).toBeInTheDocument();
  });

  it('renders a legend entry for each category', () => {
    const cats = [makeCategory('Food', 1500, 60), makeCategory('Transport', 600, 24)];
    render(
      <IncomeExpenseDonut categories={cats} mode="expense" currencySymbol="₹" />
    );
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('shows expense empty state when no categories and mode is expense', () => {
    render(
      <IncomeExpenseDonut categories={[]} mode="expense" currencySymbol="₹" />
    );
    expect(screen.getByText(/no expenses for this period/i)).toBeInTheDocument();
  });

  it('shows income empty state when no categories and mode is income', () => {
    render(
      <IncomeExpenseDonut categories={[]} mode="income" currencySymbol="₹" />
    );
    expect(screen.getByText(/no income for this period/i)).toBeInTheDocument();
  });
});
