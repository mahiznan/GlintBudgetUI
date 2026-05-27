import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Outlet } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PreferenceContext } from '../context/PreferenceContext';
import { TransactionContext } from '../context/TransactionContext';
import { SyncStatusProvider } from '../context/SyncStatusContext';
import type { AppShellOutletContext } from './AppShell';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  deleteDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(() => 'docref'),
}));

import TransactionList from './TransactionList';

const prefCtx = { preference: null, loading: false, error: null };
const txCtx = { transactions: [], loading: false, error: null, hasPendingWrites: false };

describe('TransactionList', () => {
  it('renders empty state after loading', async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const ctx: AppShellOutletContext = { period: 'month', setPeriod: vi.fn(), fabDate: today, setFabDate: vi.fn() };
    render(
      <SyncStatusProvider>
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
        </PreferenceContext.Provider>
      </SyncStatusProvider>,
    );
    expect(await screen.findByText(/no transactions/i)).toBeInTheDocument();
  });
});
