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
  Legend: () => null,
  Tooltip: () => null,
}));

import IncomeExpenseDonut from './IncomeExpenseDonut';

describe('IncomeExpenseDonut', () => {
  it('renders the donut chart', () => {
    render(<IncomeExpenseDonut income={50000} expenses={12500} currencySymbol="₹" />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('shows income and expenses labels', () => {
    render(<IncomeExpenseDonut income={50000} expenses={12500} currencySymbol="₹" />);
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
  });

  it('renders savings rate percentage', () => {
    render(<IncomeExpenseDonut income={50000} expenses={12500} currencySymbol="₹" />);
    // savings = (50000 - 12500) / 50000 = 75%
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
