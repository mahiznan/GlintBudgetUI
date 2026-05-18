import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  doc: vi.fn(() => 'doc-ref'),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
}));

import { setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

  it('calls setDoc with snake_case sub_category, id field, and returns uuid', async () => {
    vi.mocked(setDoc).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAddTransaction());

    let id!: string;
    await act(async () => {
      id = await result.current.mutate(baseTransaction);
    });

    expect(setDoc).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(setDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(callArgs['sub_category']).toBe('Groceries');
    expect(callArgs['subCategory']).toBeUndefined();
    expect(callArgs['id']).toMatch(UUID_RE);
    expect(id).toBe(callArgs['id']);
    expect(result.current.loading).toBe(false);
  });

  it('sets error on setDoc failure', async () => {
    vi.mocked(setDoc).mockRejectedValueOnce(new Error('write failed'));
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
