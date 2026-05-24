import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'lime', setTheme: vi.fn() }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Bar: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import SpendingChart from './SpendingChart';
import type { Transaction } from '../../firestore/types';

const makeTx = (date: string, amount: number): Transaction => ({
  id: date + amount,
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Groceries',
  date: new Date(date),
  account: 'HDFC',
  vendor: 'Zepto',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount,
  icon: '🛒',
});

const baseProps = {
  transactions: [makeTx('2026-05-17', -500), makeTx('2026-05-16', -300)],
  period: 'month' as const,
  onPeriodChange: vi.fn(),
  currencySymbol: '₹',
  chartType: 'bar' as const,
  onChartTypeChange: vi.fn(),
  offset: 0,
  onOffsetChange: vi.fn(),
};

describe('SpendingChart', () => {
  it('renders a bar chart when chartType is bar', () => {
    render(<SpendingChart {...baseProps} chartType="bar" />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
  });

  it('renders an area chart when chartType is line', () => {
    render(<SpendingChart {...baseProps} chartType="line" />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('renders the Spending section heading', () => {
    render(<SpendingChart {...baseProps} />);
    expect(screen.getByText(/spending/i)).toBeInTheDocument();
  });

  it('shows bar and line toggle buttons', () => {
    render(<SpendingChart {...baseProps} />);
    expect(screen.getByRole('button', { name: /bar chart/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /line chart/i })).toBeInTheDocument();
  });

  it('calls onChartTypeChange with "line" when line button clicked', () => {
    const onChartTypeChange = vi.fn();
    render(<SpendingChart {...baseProps} chartType="bar" onChartTypeChange={onChartTypeChange} />);
    fireEvent.click(screen.getByRole('button', { name: /line chart/i }));
    expect(onChartTypeChange).toHaveBeenCalledWith('line');
  });

  it('calls onChartTypeChange with "bar" when bar button clicked', () => {
    const onChartTypeChange = vi.fn();
    render(<SpendingChart {...baseProps} chartType="line" onChartTypeChange={onChartTypeChange} />);
    fireEvent.click(screen.getByRole('button', { name: /bar chart/i }));
    expect(onChartTypeChange).toHaveBeenCalledWith('bar');
  });

  it('excludes income transactions (positive amounts)', () => {
    render(<SpendingChart {...baseProps} transactions={[makeTx('2026-05-17', 50000)]} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders without crash for all periods', () => {
    const periods = ['day', 'week', 'month', 'quarter', 'year'] as const;
    periods.forEach((period) => {
      const { unmount } = render(<SpendingChart {...baseProps} period={period} />);
      expect(screen.getByText(/spending/i)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders previous and next period buttons', () => {
    render(<SpendingChart {...baseProps} />);
    expect(screen.getByRole('button', { name: /previous period/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next period/i })).toBeInTheDocument();
  });

  it('disables the next period button when offset is 0', () => {
    render(<SpendingChart {...baseProps} offset={0} />);
    expect(screen.getByRole('button', { name: /next period/i })).toBeDisabled();
  });

  it('enables the next period button when offset is negative', () => {
    render(<SpendingChart {...baseProps} offset={-1} />);
    expect(screen.getByRole('button', { name: /next period/i })).not.toBeDisabled();
  });

  it('calls onOffsetChange(-1) when previous button is clicked', () => {
    const onOffsetChange = vi.fn();
    render(<SpendingChart {...baseProps} onOffsetChange={onOffsetChange} />);
    fireEvent.click(screen.getByRole('button', { name: /previous period/i }));
    expect(onOffsetChange).toHaveBeenCalledWith(-1);
  });

  it('calls onOffsetChange(1) when next button is clicked while offset is negative', () => {
    const onOffsetChange = vi.fn();
    render(<SpendingChart {...baseProps} offset={-1} onOffsetChange={onOffsetChange} />);
    fireEvent.click(screen.getByRole('button', { name: /next period/i }));
    expect(onOffsetChange).toHaveBeenCalledWith(1);
  });
});
