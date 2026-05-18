import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'lime', setTheme: vi.fn() }),
}));

import CategoryBreakdown from './CategoryBreakdown';
import type { Transaction } from '../../firestore/types';

const makeTx = (category: string, amount: number): Transaction => ({
  id: category + amount,
  user_id: 'u1',
  category,
  subCategory: '',
  date: new Date(),
  account: 'HDFC',
  vendor: 'V',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount,
  icon: '🛒',
});

describe('CategoryBreakdown', () => {
  it('renders top categories heading', () => {
    render(<CategoryBreakdown transactions={[]} currencySymbol="₹" />);
    expect(screen.getByText(/category/i)).toBeInTheDocument();
  });

  it('renders Expense and Income toggle buttons', () => {
    render(<CategoryBreakdown transactions={[]} currencySymbol="₹" />);
    expect(screen.getByRole('button', { name: /expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument();
  });

  it('shows expense mode active by default (bg-red-600 class)', () => {
    render(<CategoryBreakdown transactions={[]} currencySymbol="₹" />);
    expect(screen.getByRole('button', { name: /expense/i })).toHaveClass('bg-red-600');
  });

  it('shows top categories by expense spend (negative amounts)', () => {
    const txns = [
      ...Array(3).fill(null).map(() => makeTx('Food', -500)),
      ...Array(2).fill(null).map(() => makeTx('Transport', -200)),
      makeTx('Health', -100),
    ];
    render(<CategoryBreakdown transactions={txns} currencySymbol="₹" />);
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('hides income categories in default expense mode', () => {
    const txns = [makeTx('Salary', 50000), makeTx('Food', -500)];
    render(<CategoryBreakdown transactions={txns} currencySymbol="₹" />);
    expect(screen.queryByText('Salary')).not.toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
  });

  it('income mode shows income categories and hides expense categories', async () => {
    const user = userEvent.setup();
    const txns = [makeTx('Salary', 50000), makeTx('Food', -500)];
    render(<CategoryBreakdown transactions={txns} currencySymbol="₹" />);
    await user.click(screen.getByRole('button', { name: /income/i }));
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.queryByText('Food')).not.toBeInTheDocument();
  });

  it('shows mode-aware empty state message', async () => {
    const user = userEvent.setup();
    render(<CategoryBreakdown transactions={[]} currencySymbol="₹" />);
    expect(screen.getByText(/no expenses for this period/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /income/i }));
    expect(screen.getByText(/no income for this period/i)).toBeInTheDocument();
  });
});
