import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import { PreferenceContext } from '../context/PreferenceContext';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn(() => 'q'),
  where: vi.fn(() => 'w'),
  orderBy: vi.fn(() => 'o'),
  limit: vi.fn(() => 'l'),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
  deleteDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(() => 'docref'),
}));

import TransactionList from './TransactionList';

const authedCtx = {
  status: 'authenticated' as const,
  user: { uid: 'u1', name: 'Test', email: 't@e.com', photoUrl: null },
};

const prefCtx = { preference: null, loading: false, error: null, refetch: vi.fn() };

describe('TransactionList', () => {
  it('renders empty state after loading', async () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <PreferenceContext.Provider value={prefCtx}>
          <MemoryRouter>
            <Routes>
              <Route path="/" element={<TransactionList />} />
            </Routes>
          </MemoryRouter>
        </PreferenceContext.Provider>
      </AuthContext.Provider>,
    );
    expect(await screen.findByText(/no transactions/i)).toBeInTheDocument();
  });
});
