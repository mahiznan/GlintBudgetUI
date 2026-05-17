import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import QuickStats from './QuickStats';
import type { Transaction } from '../../firestore/types';

const makeTx = (vendor: string, amount: number, payment: string, category: string): Transaction => ({
  id: vendor, user_id: 'u1', category, subCategory: '', date: new Date(),
  account: 'HDFC', vendor, payment, currency: 'INR', notes: '', amount, icon: '',
});

describe('QuickStats', () => {
  it('renders Quick Stats heading', () => {
    render(<QuickStats transactions={[]} currencySymbol="₹" />);
    expect(screen.getByText(/quick stats/i)).toBeInTheDocument();
  });

  it('shows highest spend', () => {
    const txns = [makeTx('A', 1000, 'UPI', 'Food'), makeTx('B', 500, 'UPI', 'Food')];
    render(<QuickStats transactions={txns} currencySymbol="₹" />);
    expect(screen.getByText('₹1,000.00')).toBeInTheDocument();
  });
});
