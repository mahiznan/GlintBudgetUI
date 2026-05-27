import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));

const mockUnsub = vi.fn();
let capturedCallback: ((snap: unknown) => void) | null = null;
let capturedErrorCallback: ((err: Error) => void) | null = null;

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn(() => 'q'),
  where: vi.fn(() => 'w'),
  orderBy: vi.fn(() => 'o'),
  limit: vi.fn(() => 'l'),
  onSnapshot: vi.fn((_q, _opts, cb, errCb) => {
    capturedCallback = cb as (snap: unknown) => void;
    capturedErrorCallback = errCb as (err: Error) => void;
    return mockUnsub;
  }),
}));

import { onSnapshot } from 'firebase/firestore';
import { useTransactions } from './useTransactions';

function makeSnap(docs: unknown[], hasPendingWrites = false) {
  return { docs, metadata: { hasPendingWrites } };
}

function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx1',
    data: () => ({
      user_id: 'u1',
      category: 'Food',
      sub_category: 'Groceries',
      date: { toDate: () => new Date('2026-05-17') },
      account: 'HDFC',
      vendor: 'Zepto',
      payment: 'UPI',
      currency: 'INR',
      notes: 'weekly shop',
      amount: 500,
      icon: '🛒',
      ...overrides,
    }),
  };
}

describe('useTransactions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    capturedCallback = null;
    capturedErrorCallback = null;
    vi.mocked(onSnapshot).mockImplementation((_q, _opts, cb, errCb) => {
      capturedCallback = cb as (snap: unknown) => void;
      capturedErrorCallback = errCb as (err: Error) => void;
      return mockUnsub;
    });
  });

  it('returns loading=true and empty data initially', () => {
    const { result } = renderHook(() => useTransactions({ uid: 'u1' }));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  it('maps sub_category → subCategory and date Timestamp → Date on snapshot', async () => {
    const { result } = renderHook(() => useTransactions({ uid: 'u1' }));
    act(() => { capturedCallback!(makeSnap([makeDoc()])); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const tx = result.current.data[0]!;
    expect(tx.subCategory).toBe('Groceries');
    expect(tx.date).toBeInstanceOf(Date);
    expect(tx.id).toBe('tx1');
  });

  it('exposes hasPendingWrites: true from snapshot metadata', async () => {
    const { result } = renderHook(() => useTransactions({ uid: 'u1' }));
    act(() => { capturedCallback!(makeSnap([makeDoc()], true)); });
    await waitFor(() => expect(result.current.hasPendingWrites).toBe(true));
  });

  it('exposes hasPendingWrites: false when snapshot confirms', async () => {
    const { result } = renderHook(() => useTransactions({ uid: 'u1' }));
    act(() => { capturedCallback!(makeSnap([makeDoc()], true)); });
    act(() => { capturedCallback!(makeSnap([makeDoc()], false)); });
    await waitFor(() => expect(result.current.hasPendingWrites).toBe(false));
  });

  it('sets error when onSnapshot calls the error callback', async () => {
    const { result } = renderHook(() => useTransactions({ uid: 'u1' }));
    act(() => { capturedErrorCallback!(new Error('quota exceeded')); });
    await waitFor(() => expect(result.current.error?.message).toBe('quota exceeded'));
    expect(result.current.loading).toBe(false);
  });

  it('unsubscribes the listener on unmount', () => {
    const { unmount } = renderHook(() => useTransactions({ uid: 'u1' }));
    unmount();
    expect(mockUnsub).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe when uid is empty', () => {
    renderHook(() => useTransactions({ uid: '' }));
    expect(onSnapshot).not.toHaveBeenCalled();
  });
});
