import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  doc: vi.fn(() => 'doc-ref'),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
}));

import { addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from './useMutateTransaction';
import type { Transaction } from '../firestore/types';

const baseTransaction: Omit<Transaction, 'id'> = {
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Groceries',
  date: new Date('2026-05-17'),
  account: 'HDFC',
  vendor: 'Zepto',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount: 500,
  icon: '🛒',
};

describe('useAddTransaction', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls addDoc with snake_case sub_category and returns doc id', async () => {
    vi.mocked(addDoc).mockResolvedValueOnce({ id: 'new-id' } as unknown as Awaited<ReturnType<typeof addDoc>>);
    const { result } = renderHook(() => useAddTransaction());

    let id!: string;
    await act(async () => {
      id = await result.current.mutate(baseTransaction);
    });

    expect(addDoc).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(addDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(callArgs['sub_category']).toBe('Groceries');
    expect(callArgs['subCategory']).toBeUndefined();
    expect(id).toBe('new-id');
    expect(result.current.loading).toBe(false);
  });

  it('sets error on addDoc failure', async () => {
    vi.mocked(addDoc).mockRejectedValueOnce(new Error('write failed'));
    const { result } = renderHook(() => useAddTransaction());

    await act(async () => {
      await result.current.mutate(baseTransaction).catch(() => {});
    });

    expect(result.current.error?.message).toBe('write failed');
  });
});

describe('useUpdateTransaction', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls updateDoc with the given id and snake_case fields', async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useUpdateTransaction());

    await act(async () => {
      await result.current.mutate('tx-1', { amount: 999, subCategory: 'Dining' });
    });

    expect(updateDoc).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(updateDoc).mock.calls[0]![1] as unknown as Record<string, unknown>;
    expect(callArgs['amount']).toBe(999);
    expect(callArgs['sub_category']).toBe('Dining');
  });
});

describe('useDeleteTransaction', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls deleteDoc with the given id', async () => {
    vi.mocked(deleteDoc).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useDeleteTransaction());

    await act(async () => {
      await result.current.mutate('tx-1');
    });

    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });
});
