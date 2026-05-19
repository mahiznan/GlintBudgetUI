import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
        currency: 'INR', notes: '', amount: -500, icon: '🛒',
      }),
    }),
  ),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
}));

import { setDoc } from 'firebase/firestore';
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
  refetch: vi.fn(),
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

function EditWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={authedCtx}>
      <PreferenceContext.Provider value={prefCtx}>
        <MemoryRouter initialEntries={['/app/transactions/tx1/edit']}>
          <Routes>
            <Route path="/app/transactions/:id/edit" element={children} />
          </Routes>
        </MemoryRouter>
      </PreferenceContext.Provider>
    </AuthContext.Provider>
  );
}

describe('TransactionForm (add mode)', () => {
  it('renders Amount and Category fields', async () => {
    render(<TransactionForm mode="add" />, { wrapper: Wrapper as React.ComponentType });
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  it('shows validation error when amount is empty on submit', async () => {
    const { getByRole, findByText } = render(<TransactionForm mode="add" />, { wrapper: Wrapper as React.ComponentType });
    getByRole('button', { name: /save/i }).click();
    expect(await findByText(/amount.*required/i)).toBeInTheDocument();
  });

  it('saves expense as a negative amount', async () => {
    vi.mocked(setDoc).mockClear();
    const user = userEvent.setup();
    render(<TransactionForm mode="add" />, { wrapper: Wrapper as React.ComponentType });

    await user.type(screen.getByPlaceholderText('0.00'), '500');
    // Use the select element's ID to be specific
    await user.selectOptions(screen.getByRole('combobox', { name: /currency/i }), 'INR');
    await user.selectOptions(screen.getByLabelText(/category/i), 'Food');
    await user.type(screen.getByLabelText(/vendor/i), 'Zepto');
    await user.selectOptions(screen.getByLabelText(/account/i), 'HDFC');
    await user.selectOptions(screen.getByLabelText(/payment/i), 'UPI');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(vi.mocked(setDoc)).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ amount: -500 }),
      );
    });
  });
});

describe('TransactionForm (edit mode)', () => {
  it('displays absolute amount and infers expense type from negative stored amount', async () => {
    render(<TransactionForm mode="edit" />, { wrapper: EditWrapper as React.ComponentType });
    const amountInput = await screen.findByPlaceholderText('0.00');
    expect(amountInput).toHaveValue(500);
    expect(screen.getByRole('button', { name: /expense/i })).not.toHaveAttribute('data-inactive');
  });
});
