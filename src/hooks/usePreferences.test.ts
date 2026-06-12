import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));

const mockGetDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'doc-ref'),
  getDoc: (ref: unknown) => mockGetDoc(ref),
}));

import { fetchPreferences, mergeWithDefaults } from './usePreferences';
import type { BudgetData } from '../firestore/types';

const mockPreferenceData = {
  accounts: [{ name: 'HDFC', emoji: '🏦', type: 'account', parent: null }],
  categories: [{ name: 'Food', emoji: '🍔', type: 'category', parent: null }],
  subCategories: [],
  vendors: [],
  payments: [{ name: 'Cash', emoji: '💵', type: 'payment', parent: null }],
  default_currency: { name: 'Indian Rupee', code: 'INR', symbol: '₹' },
  frequent_currencies: ['INR', 'USD'],
  default_entries: { account: 'HDFC' },
};

function makeSnap(data: Record<string, unknown> | null, id = 'uid-123') {
  return { exists: () => data !== null, id, data: () => data ?? {} };
}

describe('fetchPreferences', () => {
  beforeEach(() => vi.resetAllMocks());

  it('decodes snake_case fields and returns Preference', async () => {
    mockGetDoc.mockResolvedValueOnce(makeSnap(mockPreferenceData));
    const result = await fetchPreferences('uid-123');
    expect(result.defaultCurrency.code).toBe('INR');
    expect(result.bookmarkedCurrencies).toEqual(['INR', 'USD']);
    expect(result.defaultEntries).toEqual({ account: 'HDFC' });
    expect(result.id).toBe('uid-123');
  });

  it('returns built-in defaults when document does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce(makeSnap(null));
    const result = await fetchPreferences('uid-123');
    expect(result.categories.length).toBeGreaterThan(0);
  });

  it('appends unique Firestore entries after defaults without duplicating', async () => {
    mockGetDoc.mockResolvedValueOnce(
      makeSnap({
        ...mockPreferenceData,
        payments: [
          { name: 'Cash', emoji: '💵', type: 'payment', parent: null },
          { name: 'PayNow', emoji: '💸', type: 'payment', parent: null },
        ],
      }),
    );
    const result = await fetchPreferences('uid-123');
    const names = result.payments.map((p) => p.name);
    expect(names.filter((n) => n === 'Cash').length).toBe(1);
    expect(names).toContain('PayNow');
  });

  it('propagates getDoc errors', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('permission denied'));
    await expect(fetchPreferences('uid-123')).rejects.toThrow('permission denied');
  });
});

describe('mergeWithDefaults', () => {
  it('keeps defaults and appends unique Firestore items', () => {
    const defaults: BudgetData[] = [{ name: 'Cash', emoji: '💵', type: 'payment', parent: null }];
    const fromFirestore: BudgetData[] = [
      { name: 'PayNow', emoji: '💸', type: 'payment', parent: null },
    ];
    const result = mergeWithDefaults(defaults, fromFirestore);
    expect(result.map((r) => r.name)).toContain('Cash');
    expect(result.map((r) => r.name)).toContain('PayNow');
  });

  it('prefers Firestore version for matching names (emoji override)', () => {
    const defaults: BudgetData[] = [{ name: 'Cash', emoji: '💵', type: 'payment', parent: null }];
    const fromFirestore: BudgetData[] = [
      { name: 'cash', emoji: '💰', type: 'payment', parent: null },
    ];
    const result = mergeWithDefaults(defaults, fromFirestore);
    expect(result.find((r) => r.name.toLowerCase() === 'cash')?.emoji).toBe('💰');
    expect(result.filter((r) => r.name.toLowerCase() === 'cash')).toHaveLength(1);
  });
});
