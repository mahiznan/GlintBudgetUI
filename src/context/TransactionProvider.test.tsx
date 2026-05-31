import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('../firebase/client', () => ({ auth: {}, app: {} }));

const mockUseTransactions = vi.fn((_filter: unknown) => ({
  data: [] as import('../firestore/types').Transaction[],
  loading: false,
  error: null as Error | null,
  hasPendingWrites: false,
}));
vi.mock('../hooks/useTransactions', () => ({
  useTransactions: (filter: unknown) => mockUseTransactions(filter),
}));

vi.mock('./SyncStatusContext', () => ({
  useSyncStatus: vi.fn(() => ({ notifySnapshot: vi.fn() })),
  SyncStatusProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { AuthContext } from '../auth/AuthContext';
import { TransactionProvider } from './TransactionProvider';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider
      value={{ status: 'authenticated', user: { uid: 'u1', name: null, email: null, photoUrl: null } }}
    >
      <TransactionProvider>{children}</TransactionProvider>
    </AuthContext.Provider>
  );
}

describe('TransactionProvider', () => {
  it('passes a start date filter to useTransactions', () => {
    render(<div />, { wrapper });
    expect(mockUseTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ start: expect.any(Date) }),
    );
  });

  it('start date is January 1st of the current year', () => {
    render(<div />, { wrapper });
    const call = mockUseTransactions.mock.calls[0] as [{ start: Date }] | undefined;
    const { start } = (call?.[0] ?? {}) as { start: Date };
    const jan1 = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
    expect(start.getTime()).toBe(jan1.getTime());
  });
});
