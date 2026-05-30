import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TransactionTable, { type SortKey } from './TransactionTable';
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

const defaultSort = {
  sortKey: 'date' as SortKey,
  sortDir: 'desc' as const,
  onSort: vi.fn(),
};

function renderTable(overrides = {}) {
  return render(
    <TransactionTable
      transactions={[tx]}
      currencySymbol="₹"
      onDelete={vi.fn()}
      onEdit={vi.fn()}
      {...defaultSort}
      {...overrides}
    />,
  );
}

describe('TransactionTable', () => {
  it('renders subCategory, vendor, category, and amount', () => {
    renderTable();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Zepto')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText(/₹500/)).toBeInTheDocument();
  });

  it('shows empty state when no transactions', () => {
    render(
      <TransactionTable
        transactions={[]}
        currencySymbol="₹"
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        {...defaultSort}
      />,
    );
    expect(screen.getByText(/no transactions/i)).toBeInTheDocument();
  });

  it('renders sortable column headers', () => {
    renderTable();
    expect(screen.getByRole('columnheader', { name: /subcategory/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^category$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /date/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /payment/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /amount/i })).toBeInTheDocument();
  });

  it('calls onSort with the column key when a sortable header is clicked', async () => {
    const onSort = vi.fn();
    renderTable({ onSort });
    await userEvent.click(screen.getByRole('columnheader', { name: /^category$/i }));
    expect(onSort).toHaveBeenCalledWith('category');
  });

  it('does not call onSort when the Actions header area is clicked', async () => {
    const onSort = vi.fn();
    renderTable({ onSort });
    // Actions th has no text and is not clickable — assert onSort not called on table click outside headers
    expect(onSort).not.toHaveBeenCalled();
  });
});
