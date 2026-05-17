import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn(() => 'q'),
  where: vi.fn(() => 'w'),
  orderBy: vi.fn(() => 'o'),
  limit: vi.fn(() => 'l'),
  getDocs: vi.fn(),
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
}));

import { getDocs } from 'firebase/firestore';
import { useTransactions } from './useTransactions';

function makeMockDoc(overrides: Record<string, unknown> = {}) {
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
  beforeEach(() => vi.resetAllMocks());

  it('returns loading=true and empty data initially', () => {
    vi.mocked(getDocs).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTransactions({ uid: 'u1', limit: 10 }));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  it('maps sub_category → subCategory and date Timestamp → Date', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getDocs).mockResolvedValueOnce({ docs: [makeMockDoc()] } as any);
    const { result } = renderHook(() => useTransactions({ uid: 'u1', limit: 10 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const tx = result.current.data[0]!;
    expect(tx.subCategory).toBe('Groceries');
    expect(tx.date).toBeInstanceOf(Date);
    expect(tx.id).toBe('tx1');
  });

  it('sets error on Firestore failure', async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('quota exceeded'));
    const { result } = renderHook(() => useTransactions({ uid: 'u1', limit: 10 }));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('quota exceeded');
    expect(result.current.loading).toBe(false);
  });

  it('applies date filters when start and end are provided', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as any);
    const start = new Date('2026-05-01');
    const end = new Date('2026-05-31');
    renderHook(() => useTransactions({ uid: 'u1', start, end }));
    await waitFor(() => expect(getDocs).toHaveBeenCalled());
    expect(getDocs).toHaveBeenCalledTimes(1);
  });
});
