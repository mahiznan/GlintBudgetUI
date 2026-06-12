import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));

const mockGetDocs = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn((_col: unknown, ...constraints: unknown[]) => ({ col: _col, constraints })),
  where: vi.fn((...args: unknown[]) => ({ type: 'where', args })),
  orderBy: vi.fn((...args: unknown[]) => ({ type: 'orderBy', args })),
  getDocs: (q: unknown) => mockGetDocs(q),
}));

import { fetchPlanners } from './usePlanners';

function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    data: () => ({
      user_id: 'u1',
      name: 'Monthly SGD',
      description: '',
      currency: 'SGD',
      active: true,
      archived: false,
      period: 'monthly',
      repeatable: true,
      filter_accounts: [],
      filter_vendors: [],
      filter_payments: [],
      category_budgets: [{ category: 'Food', amount: 1000 }],
      chart_view: 'bar',
      created_at: { toDate: () => new Date('2026-05-01') },
      updated_at: { toDate: () => new Date('2026-05-01') },
      ...overrides,
    }),
  };
}

describe('fetchPlanners', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns [] without calling getDocs when uid is empty', async () => {
    const result = await fetchPlanners('');
    expect(result).toEqual([]);
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it('maps snake_case fields to camelCase BudgetPlanner', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [makeDoc()] });
    const result = await fetchPlanners('u1');
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Monthly SGD');
    expect(result[0]!.filterAccounts).toEqual([]);
    expect(result[0]!.categoryBudgets).toEqual([{ category: 'Food', amount: 1000 }]);
    expect(result[0]!.chartView).toBe('bar');
    expect(result[0]!.createdAt).toBeInstanceOf(Date);
  });

  it('propagates getDocs errors', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('permission denied'));
    await expect(fetchPlanners('u1')).rejects.toThrow('permission denied');
  });
});
