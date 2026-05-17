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

  it('shows top 5 categories by spend', () => {
    const txns = [
      ...Array(3).fill(null).map(() => makeTx('Food', 500)),
      ...Array(2).fill(null).map(() => makeTx('Transport', 200)),
      makeTx('Health', 100),
    ];
    render(<CategoryBreakdown transactions={txns} currencySymbol="₹" />);
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('shows empty state when no transactions', () => {
    render(<CategoryBreakdown transactions={[]} currencySymbol="₹" />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});
