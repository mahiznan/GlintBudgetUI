import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'lime', setTheme: vi.fn() }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
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

describe('SpendingChart', () => {
  it('renders a bar chart', () => {
    render(
      <SpendingChart
        transactions={[makeTx('2026-05-17', -500), makeTx('2026-05-16', -300)]}
        period="month"
        currencySymbol="₹"
      />,
    );
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders the Spending section heading', () => {
    render(
      <SpendingChart transactions={[]} period="week" currencySymbol="₹" />,
    );
    expect(screen.getByText(/spending/i)).toBeInTheDocument();
  });

  it('excludes income transactions (positive amounts) from chart data', () => {
    render(
      <SpendingChart
        transactions={[makeTx('2026-05-17', 50000)]}
        period="month"
        currencySymbol="₹"
      />,
    );
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});
