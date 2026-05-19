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
    render(<QuickStats transactions={[]} currencySymbol="₹" periodDays={30} />);
    expect(screen.getByText(/quick stats/i)).toBeInTheDocument();
  });

  it('shows highest expense spend (negative amounts)', () => {
    const txns = [makeTx('A', -1000, 'UPI', 'Food'), makeTx('B', -500, 'UPI', 'Food')];
    render(<QuickStats transactions={txns} currencySymbol="₹" periodDays={30} />);
    expect(screen.getByText('₹1,000.00')).toBeInTheDocument();
  });

  it('excludes income (positive amounts) from quick stats', () => {
    const txns = [
      makeTx('Salary', 50000, 'Bank Transfer', 'Income'),
      makeTx('Zepto', -300, 'UPI', 'Food'),
    ];
    render(<QuickStats transactions={txns} currencySymbol="₹" periodDays={30} />);
    expect(screen.queryByText(/₹50,000/)).not.toBeInTheDocument();
    expect(screen.getAllByText('₹300.00').length).toBeGreaterThan(0);
  });

  it('avg/day = total expenses ÷ periodDays (not ÷ tx count)', () => {
    // 2 transactions totalling ₹600 over 30 days → avg/day = ₹20, not ₹300
    const txns = [
      makeTx('A', -400, 'UPI', 'Food'),
      makeTx('B', -200, 'UPI', 'Food'),
    ];
    render(<QuickStats transactions={txns} currencySymbol="₹" periodDays={30} />);
    expect(screen.getByText('₹20.00')).toBeInTheDocument();
  });

  it('shows "Avg / day" label', () => {
    render(<QuickStats transactions={[]} currencySymbol="₹" periodDays={30} />);
    expect(screen.getByText(/avg \/ day/i)).toBeInTheDocument();
  });
});
