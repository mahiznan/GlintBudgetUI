import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TransactionRow from './TransactionRow';
import type { Transaction } from '../../firestore/types';

const expenseTx: Transaction = {
  id: 'tx1', user_id: 'u1', category: 'Food', subCategory: 'Groceries',
  date: new Date('2026-05-17T09:30:00'), account: 'HDFC', vendor: 'Zepto',
  payment: 'UPI', currency: 'INR', notes: '', amount: -500, icon: '🛒',
};

const incomeTx: Transaction = {
  ...expenseTx, id: 'tx2', vendor: 'Employer', category: 'Salary',
  amount: 50000,
};

function renderRow(tx = expenseTx, onDelete = vi.fn()) {
  return render(
    <MemoryRouter>
      <table><tbody>
        <TransactionRow transaction={tx} currencySymbol="₹" onDelete={onDelete} />
      </tbody></table>
    </MemoryRouter>,
  );
}

describe('TransactionRow', () => {
  it('renders vendor, category, and absolute amount', () => {
    renderRow();
    expect(screen.getByText('Zepto')).toBeInTheDocument();
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
    expect(amountEl).toHaveClass('text-brand');
  });

  it('has correct aria-labels on edit and delete buttons', () => {
    renderRow();
    expect(screen.getByRole('link', { name: /edit zepto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete zepto/i })).toBeInTheDocument();
  });

  it('edit link routes to /app/transactions/tx1/edit', () => {
    renderRow();
    expect(screen.getByRole('link', { name: /edit zepto/i }))
      .toHaveAttribute('href', '/app/transactions/tx1/edit');
  });

  it('calls onDelete with the transaction id', async () => {
    const onDelete = vi.fn();
    renderRow(expenseTx, onDelete);
    await userEvent.click(screen.getByRole('button', { name: /delete zepto/i }));
    expect(onDelete).toHaveBeenCalledWith('tx1');
  });
});
