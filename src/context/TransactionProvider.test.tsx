import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  doc: vi.fn(() => 'doc-ref'),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
}));

const mockFetch = vi.fn(() => Promise.resolve([]));
vi.mock('../hooks/useTransactions', () => ({
  fetchTransactions: (...args: unknown[]) => mockFetch(...args),
}));

vi.mock('./SyncStatusContext', () => ({
  useSyncStatus: vi.fn(() => ({
    notifyWrite: vi.fn(),
    notifySynced: vi.fn(),
    notifySnapshot: vi.fn(),
  })),
  SyncStatusProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { AuthContext } from '../auth/AuthContext';
import { TransactionProvider } from './TransactionProvider';
import { useTransactionContext } from './useTransactionContext';
import type { Transaction } from '../firestore/types';
import { setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const baseTx: Omit<Transaction, 'id'> = {
  user_id: 'u1', category: 'Food', subCategory: 'Groceries',
  date: new Date('2026-05-17'), account: 'HDFC', vendor: 'Zepto',
  payment: 'UPI', currency: 'INR', notes: '', amount: -500, icon: '🛒',
};

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
  beforeEach(() => { vi.resetAllMocks(); mockFetch.mockResolvedValue([]); });

  it('calls fetchTransactions for current year on mount', async () => {
    renderHook(() => useTransactionContext(), { wrapper });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const call = mockFetch.mock.calls[0]![0] as { uid: string; start: Date };
    expect(call.uid).toBe('u1');
    expect(call.start.getFullYear()).toBe(new Date().getFullYear());
    expect(call.start.getMonth()).toBe(0);
  });

  it('addTransaction inserts optimistically and calls setDoc', () => {
    const { result } = renderHook(() => useTransactionContext(), { wrapper });
    act(() => { result.current.addTransaction(baseTx); });
    expect(result.current.transactions).toHaveLength(1);
    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  it('addTransaction returns a UUID', () => {
    const { result } = renderHook(() => useTransactionContext(), { wrapper });
    let id = '';
    act(() => { id = result.current.addTransaction(baseTx); });
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('addTransaction rolls back on setDoc failure', async () => {
    vi.mocked(setDoc).mockRejectedValueOnce(new Error('network error'));
    const { result } = renderHook(() => useTransactionContext(), { wrapper });
    act(() => { result.current.addTransaction(baseTx); });
    expect(result.current.transactions).toHaveLength(1);
    await waitFor(() => expect(result.current.transactions).toHaveLength(0));
  });

  it('updateTransaction patches transaction in list', async () => {
    mockFetch.mockResolvedValueOnce([{ ...baseTx, id: 'tx-1' }]);
    const { result } = renderHook(() => useTransactionContext(), { wrapper });
    await waitFor(() => expect(result.current.transactions).toHaveLength(1));
    act(() => { result.current.updateTransaction('tx-1', { amount: -999 }); });
    expect(result.current.transactions.find(t => t.id === 'tx-1')?.amount).toBe(-999);
    expect(updateDoc).toHaveBeenCalledTimes(1);
  });

  it('deleteTransaction removes from list', async () => {
    mockFetch.mockResolvedValueOnce([{ ...baseTx, id: 'tx-1' }]);
    const { result } = renderHook(() => useTransactionContext(), { wrapper });
    await waitFor(() => expect(result.current.transactions).toHaveLength(1));
    act(() => { result.current.deleteTransaction('tx-1'); });
    expect(result.current.transactions).toHaveLength(0);
    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });

  it('loadYear calls fetchTransactions with the given year range', async () => {
    const { result } = renderHook(() => useTransactionContext(), { wrapper });
    await act(async () => { await result.current.loadYear(2025); });
    const yearCall = mockFetch.mock.calls.find(
      (c) => (c[0] as { start: Date }).start.getFullYear() === 2025
    );
    expect(yearCall).toBeDefined();
  });

  it('clears transactions when uid becomes empty (sign-out)', () => {
    const { result } = renderHook(() => useTransactionContext(), {
      wrapper: ({ children }) => (
        <AuthContext.Provider value={{ status: 'anonymous', user: null }}>
          <TransactionProvider>{children}</TransactionProvider>
        </AuthContext.Provider>
      ),
    });
    expect(result.current.transactions).toEqual([]);
  });
});
