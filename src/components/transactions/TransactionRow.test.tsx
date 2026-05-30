import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TransactionRow from './TransactionRow';
import type { Transaction } from '../../firestore/types';

const expenseTx: Transaction = {
  id: 'tx1',
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Groceries',
  date: new Date('2026-05-17T09:30:00'),
  account: 'HDFC',
  vendor: 'Zepto',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount: -500,
  icon: '🛒',
};

const incomeTx: Transaction = {
  ...expenseTx,
  id: 'tx2',
  vendor: 'Employer',
  category: 'Salary',
  amount: 50000,
};

function renderRow(tx = expenseTx, onDelete = vi.fn(), onEdit = vi.fn()) {
  return render(
    <table>
      <tbody>
        <TransactionRow transaction={tx} currencySymbol="₹" onDelete={onDelete} onEdit={onEdit} />
      </tbody>
    </table>,
  );
}

describe('TransactionRow', () => {
  it('renders subCategory as primary text and vendor below it', () => {
    renderRow();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Zepto')).toBeInTheDocument();
  });

  it('does not render account', () => {
    renderRow();
    expect(screen.queryByText('HDFC')).not.toBeInTheDocument();
  });

  it('renders category badge and absolute amount', () => {
    renderRow();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText(/₹500/)).toBeInTheDocument();
  });

  it('shows expense amount in red with minus sign', () => {
    renderRow();
    const amountEl = screen.getByText(/−₹500/);
    expect(amountEl).toHaveClass('text-red-600');
  });

  it('shows income amount in brand color with plus sign', () => {
    renderRow(incomeTx);
    const amountEl = screen.getByText(/\+₹50,000/);
    expect(amountEl).toHaveClass('text-green-600');
  });

  it('has correct aria-labels on edit and delete buttons', () => {
    renderRow();
    expect(screen.getByRole('button', { name: /edit zepto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete zepto/i })).toBeInTheDocument();
  });

  it('calls onEdit with the transaction id', async () => {
    const onEdit = vi.fn();
    renderRow(expenseTx, vi.fn(), onEdit);
    await userEvent.click(screen.getByRole('button', { name: /edit zepto/i }));
    expect(onEdit).toHaveBeenCalledWith('tx1');
  });

  it('calls onDelete with the transaction id', async () => {
    const onDelete = vi.fn();
    renderRow(expenseTx, onDelete);
    await userEvent.click(screen.getByRole('button', { name: /delete zepto/i }));
    expect(onDelete).toHaveBeenCalledWith('tx1');
  });
});
