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

const { mockFetchFn } = vi.hoisted(() => {
  const fn = vi.fn(() => Promise.resolve([]));
  return { mockFetchFn: fn };
});

vi.mock('../hooks/useTransactions', () => ({
  fetchTransactions: mockFetchFn,
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
  beforeEach(() => { vi.resetAllMocks(); mockFetchFn.mockResolvedValue([]); });

  it('calls fetchTransactions for current year on mount', async () => {
    renderHook(() => useTransactionContext(), { wrapper });
    await waitFor(() => expect(mockFetchFn).toHaveBeenCalledTimes(1));
    expect(mockFetchFn).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'u1',
        start: expect.any(Date),
      })
    );
  });

  it('addTransaction inserts optimistically and calls setDoc', async () => {
    const { result } = renderHook(() => useTransactionContext(), { wrapper });
    act(() => { result.current.addTransaction(baseTx); });
    expect(result.current.transactions).toHaveLength(1);
    await waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1));
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
    const txRecord = { ...baseTx, id: 'tx-1' };
    mockFetchFn.mockResolvedValueOnce(Promise.resolve([txRecord]) as any);
    const { result } = renderHook(() => useTransactionContext(), { wrapper });
    await waitFor(() => expect(result.current.transactions).toHaveLength(1));
    act(() => { result.current.updateTransaction('tx-1', { amount: -999 }); });
    const updatedTx = result.current.transactions.find((t: Transaction) => t.id === 'tx-1');
    expect(updatedTx?.amount).toBe(-999);
    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
  });

  it('deleteTransaction removes from list', async () => {
    const txRecord = { ...baseTx, id: 'tx-1' };
    mockFetchFn.mockResolvedValueOnce(Promise.resolve([txRecord]) as any);
    const { result } = renderHook(() => useTransactionContext(), { wrapper });
    await waitFor(() => expect(result.current.transactions).toHaveLength(1));
    act(() => { result.current.deleteTransaction('tx-1'); });
    expect(result.current.transactions).toHaveLength(0);
    await waitFor(() => expect(deleteDoc).toHaveBeenCalledTimes(1));
  });

  it('loadYear calls fetchTransactions with the given year range', async () => {
    const { result } = renderHook(() => useTransactionContext(), { wrapper });
    await act(async () => { await result.current.loadYear(2025); });
    // Check that one of the calls matches our expectation
    const yearCall = mockFetchFn.mock.calls.find(call => {
      const arg = call[0] as any;
      return arg?.start?.getFullYear?.() === 2025;
    });
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
