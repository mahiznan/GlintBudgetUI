import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PreferenceContext } from '../context/PreferenceContext';
import { TransactionContext } from '../context/TransactionContext';
import { SyncStatusProvider } from '../context/SyncStatusContext';
import type { Transaction } from '../firestore/types';
import type { TransactionContextValue } from '../context/TransactionContext';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  deleteDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(() => 'docref'),
}));

import TransactionList from './TransactionList';

const prefCtx = { preference: null, loading: false, error: null };
const emptyTxCtx = { transactions: [], loading: false, error: null, hasPendingWrites: false };

const today = new Date();

const matchingTx: Transaction = {
  id: 'tx-match',
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Groceries',
  date: today,
  account: 'HDFC',
  vendor: 'Big Basket',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount: -500,
  icon: '🛒',
};

const nonMatchingTx: Transaction = {
  ...matchingTx,
  id: 'tx-no-match',
  vendor: 'Swiggy',
  subCategory: 'Dining Out',
};

function renderList(txCtx: TransactionContextValue = emptyTxCtx) {
  return render(
    <SyncStatusProvider>
      <PreferenceContext.Provider value={prefCtx}>
        <TransactionContext.Provider value={txCtx}>
          <MemoryRouter>
            <Routes>
              <Route index element={<TransactionList />} />
            </Routes>
          </MemoryRouter>
        </TransactionContext.Provider>
      </PreferenceContext.Provider>
    </SyncStatusProvider>,
  );
}

describe('TransactionList', () => {
  it('renders empty state after loading', async () => {
    renderList();
    expect(await screen.findByText(/no transactions/i)).toBeInTheDocument();
  });

  it('renders a search input', () => {
    renderList();
    expect(screen.getByPlaceholderText(/search transactions/i)).toBeInTheDocument();
  });

  it('filters transactions by search query', async () => {
    renderList({
      transactions: [matchingTx, nonMatchingTx],
      loading: false,
      error: null,
      hasPendingWrites: false,
    });
    await userEvent.type(screen.getByPlaceholderText(/search transactions/i), 'basket');
    expect(screen.getByText('Big Basket')).toBeInTheDocument();
    expect(screen.queryByText('Swiggy')).not.toBeInTheDocument();
  });

  it('filters transactions by account name', async () => {
    const txWithDifferentAccount: Transaction = {
      ...nonMatchingTx,
      account: 'ICICI',
    };
    renderList({
      transactions: [matchingTx, txWithDifferentAccount],
      loading: false,
      error: null,
      hasPendingWrites: false,
    });
    await userEvent.type(screen.getByPlaceholderText(/search transactions/i), 'HDFC');
    expect(screen.getByText('Big Basket')).toBeInTheDocument();
    expect(screen.queryByText('Swiggy')).not.toBeInTheDocument();
  });
});
