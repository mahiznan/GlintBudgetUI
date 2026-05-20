import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Outlet } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PreferenceContext } from '../context/PreferenceContext';
import { TransactionContext } from '../context/TransactionContext';
import type { AppShellOutletContext } from './AppShell';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  deleteDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(() => 'docref'),
}));

import TransactionList from './TransactionList';

const prefCtx = { preference: null, loading: false, error: null, refetch: vi.fn() };
const txCtx = { transactions: [], loading: false, error: null, refetch: vi.fn() };

describe('TransactionList', () => {
  it('renders empty state after loading', async () => {
    const ctx: AppShellOutletContext = { period: 'month', setPeriod: vi.fn() };
    render(
      <PreferenceContext.Provider value={prefCtx}>
        <TransactionContext.Provider value={txCtx}>
          <MemoryRouter>
            <Routes>
              <Route path="/" element={<Outlet context={ctx} />}>
                <Route index element={<TransactionList />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </TransactionContext.Provider>
      </PreferenceContext.Provider>,
    );
    expect(await screen.findByText(/no transactions/i)).toBeInTheDocument();
  });
});
