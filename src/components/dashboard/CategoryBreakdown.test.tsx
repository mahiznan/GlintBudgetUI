import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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

  it('excludes income transactions (positive amounts) from breakdown', () => {
    const txns = [
      makeTx('Salary', 50000),
      makeTx('Food', -500),
    ];
    render(<CategoryBreakdown transactions={txns} currencySymbol="₹" />);
    expect(screen.queryByText('Salary')).not.toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
  });

  it('shows empty state when no transactions', () => {
    render(<CategoryBreakdown transactions={[]} currencySymbol="₹" />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});
