import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TransactionTable from './TransactionTable';
import type { Transaction } from '../../firestore/types';

const tx: Transaction = {
  id: 'tx1',
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Groceries',
  date: new Date('2026-05-17'),
  account: 'HDFC',
  vendor: 'Zepto',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount: 500,
  icon: '🛒',
};

describe('TransactionTable', () => {
  it('renders table with transaction data', () => {
    render(
      <MemoryRouter>
        <TransactionTable transactions={[tx]} currencySymbol="₹" onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Zepto')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText(/₹500/)).toBeInTheDocument();
  });

  it('shows empty state when no transactions', () => {
    render(
      <MemoryRouter>
        <TransactionTable transactions={[]} currencySymbol="₹" onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/no transactions/i)).toBeInTheDocument();
  });
});
