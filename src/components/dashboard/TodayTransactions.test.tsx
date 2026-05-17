import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TodayTransactions from './TodayTransactions';
import type { Transaction } from '../../firestore/types';

const tx: Transaction = {
  id: 'tx1', user_id: 'u1', category: 'Food', subCategory: '',
  date: new Date(), account: 'HDFC', vendor: 'Zepto',
  payment: 'UPI', currency: 'INR', notes: '', amount: 500, icon: '🛒',
};

describe('TodayTransactions', () => {
  it('renders empty state when no transactions', () => {
    render(
      <MemoryRouter><TodayTransactions transactions={[]} currencySymbol="₹" onDelete={vi.fn()} /></MemoryRouter>,
    );
    expect(screen.getByText(/no transactions today/i)).toBeInTheDocument();
  });

  it('renders vendor name and amount', () => {
    render(
      <MemoryRouter><TodayTransactions transactions={[tx]} currencySymbol="₹" onDelete={vi.fn()} /></MemoryRouter>,
    );
    expect(screen.getByText('Zepto')).toBeInTheDocument();
    expect(screen.getByText(/₹500/)).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(
      <MemoryRouter><TodayTransactions transactions={[tx]} currencySymbol="₹" onDelete={onDelete} /></MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /delete zepto/i }));
    expect(onDelete).toHaveBeenCalledWith('tx1');
  });
});
