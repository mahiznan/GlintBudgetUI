import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import { PreferenceContext } from '../context/PreferenceContext';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  doc: vi.fn(() => 'doc-ref'),
  getDoc: vi.fn(() =>
    Promise.resolve({
      exists: () => true,
      id: 'tx1',
      data: () => ({
        user_id: 'u1', category: 'Food', sub_category: 'Groceries',
        date: { toDate: () => new Date('2026-05-17') },
        account: 'HDFC', vendor: 'Zepto', payment: 'UPI',
        currency: 'INR', notes: '', amount: 500, icon: '🛒',
      }),
    }),
  ),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
}));

import TransactionForm from './TransactionForm';

const authedCtx = {
  status: 'authenticated' as const,
  user: { uid: 'u1', name: 'Test', email: 't@e.com', photoUrl: null },
};

const prefCtx = {
  preference: {
    id: 'u1',
    accounts: [{ name: 'HDFC', emoji: '🏦', type: 'account', parent: null }],
    categories: [{ name: 'Food', emoji: '🍔', type: 'category', parent: null }],
    subCategories: [],
    vendors: [{ name: 'Zepto', emoji: null, type: 'vendor', parent: null }],
    payments: [{ name: 'UPI', emoji: null, type: 'payment', parent: null }],
    defaultCurrency: { name: 'Indian Rupee', code: 'INR', symbol: '₹' },
    bookmarkedCurrencies: ['INR'],
    defaultEntries: null,
  },
  loading: false,
  error: null,
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={authedCtx}>
      <PreferenceContext.Provider value={prefCtx}>
        <MemoryRouter initialEntries={['/app/transactions/new']}>
          <Routes>
            <Route path="/app/transactions/new" element={children} />
          </Routes>
        </MemoryRouter>
      </PreferenceContext.Provider>
    </AuthContext.Provider>
  );
}

describe('TransactionForm (add mode)', () => {
  it('renders Amount and Category fields', async () => {
    render(<TransactionForm mode="add" />, { wrapper: Wrapper as React.ComponentType });
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  it('shows validation error when amount is empty on submit', async () => {
    const { getByRole, findByText } = render(<TransactionForm mode="add" />, { wrapper: Wrapper as React.ComponentType });
    getByRole('button', { name: /save/i }).click();
    expect(await findByText(/amount.*required/i)).toBeInTheDocument();
  });
});
