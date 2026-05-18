import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PeriodTransactions from './PeriodTransactions';
import type { Transaction } from '../../firestore/types';

function makeTx(id: string, vendor: string, amount: number, daysAgo = 0): Transaction {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id, user_id: 'u1', category: 'Food', subCategory: '',
    date, account: 'HDFC', vendor, payment: 'UPI',
    currency: 'INR', notes: '', amount, icon: '🛒',
  };
}

function makeTxList(count: number, amountPerTx = -500): Transaction[] {
  return Array.from({ length: count }, (_, i) =>
    makeTx(`tx${i}`, `Vendor${i}`, amountPerTx, i),
  );
}

function renderPT(transactions: Transaction[], period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'day') {
  return render(
    <MemoryRouter>
      <PeriodTransactions
        transactions={transactions}
        period={period}
        currencySymbol="₹"
        onDelete={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe('PeriodTransactions — headings', () => {
  it('shows "Today" for day period', () => {
    renderPT([], 'day');
    expect(screen.getByText(/today/i)).toBeInTheDocument();
  });

  it('shows "This Week" for week period', () => {
    renderPT([], 'week');
    expect(screen.getByText(/this week/i)).toBeInTheDocument();
  });

  it('shows "This Month" for month period', () => {
    renderPT([], 'month');
    expect(screen.getByText(/this month/i)).toBeInTheDocument();
  });

  it('shows "This Quarter" for quarter period', () => {
    renderPT([], 'quarter');
    expect(screen.getByText(/this quarter/i)).toBeInTheDocument();
  });

  it('shows "This Year" for year period', () => {
    renderPT([], 'year');
    expect(screen.getByText(/this year/i)).toBeInTheDocument();
  });
});

describe('PeriodTransactions — empty state', () => {
  it('renders empty state when no transactions', () => {
    renderPT([], 'day');
    expect(screen.getByText(/no transactions for this period/i)).toBeInTheDocument();
  });
});

describe('PeriodTransactions — transaction display', () => {
  it('renders vendor name and formatted amount', () => {
    renderPT([makeTx('tx1', 'Zepto', -500)], 'day');
    expect(screen.getByText('Zepto')).toBeInTheDocument();
    expect(screen.getByText(/₹500/)).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(
      <MemoryRouter>
        <PeriodTransactions
          transactions={[makeTx('tx1', 'Zepto', -500)]}
          period="day"
          currencySymbol="₹"
          onDelete={onDelete}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /delete zepto/i }));
    expect(onDelete).toHaveBeenCalledWith('tx1');
  });
});

describe('PeriodTransactions — pagination (month/quarter/year)', () => {
  it('does not show pagination for day period even with many transactions', () => {
    renderPT(makeTxList(15), 'day');
    expect(screen.queryByRole('button', { name: /prev/i })).not.toBeInTheDocument();
  });

  it('does not show pagination for week period', () => {
    renderPT(makeTxList(15), 'week');
    expect(screen.queryByRole('button', { name: /prev/i })).not.toBeInTheDocument();
  });

  it('shows page controls for month period when > 10 transactions', () => {
    renderPT(makeTxList(15), 'month');
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
  });

  it('shows first 10 transactions on page 1', () => {
    renderPT(makeTxList(15), 'month');
    expect(screen.getByText('Vendor0')).toBeInTheDocument();
    expect(screen.getByText('Vendor9')).toBeInTheDocument();
    expect(screen.queryByText('Vendor10')).not.toBeInTheDocument();
  });

  it('navigates to page 2 showing remaining transactions', async () => {
    renderPT(makeTxList(15), 'month');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Vendor10')).toBeInTheDocument();
    expect(screen.queryByText('Vendor0')).not.toBeInTheDocument();
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
  });

  it('Prev button is disabled on page 1', () => {
    renderPT(makeTxList(15), 'month');
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
  });

  it('Next button is disabled on last page', async () => {
    renderPT(makeTxList(15), 'month');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('does not show pagination when 10 or fewer transactions', () => {
    renderPT(makeTxList(10), 'month');
    expect(screen.queryByText(/page/i)).not.toBeInTheDocument();
  });
});
