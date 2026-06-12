import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));

const mockGetDocs = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn((_col: unknown, ...constraints: unknown[]) => ({ col: _col, constraints })),
  where: vi.fn((...args: unknown[]) => ({ type: 'where', args })),
  orderBy: vi.fn((...args: unknown[]) => ({ type: 'orderBy', args })),
  limit: vi.fn((...args: unknown[]) => ({ type: 'limit', args })),
  getDocs: (q: unknown) => mockGetDocs(q),
}));

import { fetchTransactions } from './useTransactions';

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

describe('fetchTransactions', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns [] without calling getDocs when uid is empty', async () => {
    const result = await fetchTransactions({ uid: '' });
    expect(result).toEqual([]);
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it('maps sub_category → subCategory and Timestamp.toDate() → Date', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [makeDoc()] });
    const result = await fetchTransactions({ uid: 'u1' });
    expect(result).toHaveLength(1);
    expect(result[0]!.subCategory).toBe('Groceries');
    expect(result[0]!.date).toBeInstanceOf(Date);
    expect(result[0]!.id).toBe('tx1');
  });

  it('defaults notes and icon to empty string when absent', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [makeDoc({ notes: undefined, icon: undefined })],
    });
    const result = await fetchTransactions({ uid: 'u1' });
    expect(result[0]!.notes).toBe('');
    expect(result[0]!.icon).toBe('');
  });

  it('includes start constraint when provided', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    const start = new Date('2026-01-01');
    await fetchTransactions({ uid: 'u1', start });
    const q = mockGetDocs.mock.calls[0]![0] as { constraints: Array<{ type: string; args: unknown[] }> };
    const whereConstraints = q.constraints.filter(c => c.type === 'where');
    expect(whereConstraints).toContainEqual(
      expect.objectContaining({ args: ['date', '>=', start] }),
    );
  });

  it('includes end constraint when provided', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    const end = new Date('2026-12-31');
    await fetchTransactions({ uid: 'u1', end });
    const q = mockGetDocs.mock.calls[0]![0] as { constraints: Array<{ type: string; args: unknown[] }> };
    const whereConstraints = q.constraints.filter(c => c.type === 'where');
    expect(whereConstraints).toContainEqual(
      expect.objectContaining({ args: ['date', '<=', end] }),
    );
  });

  it('propagates getDocs errors', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(fetchTransactions({ uid: 'u1' })).rejects.toThrow('quota exceeded');
  });
});
