import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'doc-ref'),
  getDoc: vi.fn(),
}));

import { getDoc } from 'firebase/firestore';
import { usePreferences } from './usePreferences';

const mockPreferenceData = {
  accounts: [{ name: 'HDFC', emoji: '🏦', type: 'account', parent: null }],
  categories: [{ name: 'Food', emoji: '🍔', type: 'category', parent: null }],
  subCategories: [],
  vendors: [],
  payments: [{ name: 'UPI', emoji: null, type: 'payment', parent: null }],
  default_currency: { name: 'Indian Rupee', code: 'INR', symbol: '₹' },
  frequent_currencies: ['INR', 'USD'],
  default_entries: ['account', 'HDFC'],
};

describe('usePreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('returns loading=true and data=null initially', () => {
    vi.mocked(getDoc).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePreferences('uid-123'));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('returns null and skips fetch when uid is null', async () => {
    const { result } = renderHook(() => usePreferences(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(getDoc).not.toHaveBeenCalled();
  });

  it('decodes snake_case fields and returns Preference on success', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: 'uid-123',
      data: () => mockPreferenceData,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => usePreferences('uid-123'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.defaultCurrency.code).toBe('INR');
    expect(result.current.data?.bookmarkedCurrencies).toEqual(['INR', 'USD']);
    expect(result.current.data?.defaultEntries).toEqual({ account: 'HDFC' });
    expect(result.current.data?.id).toBe('uid-123');
  });

  it('returns built-in defaults when document does not exist', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => usePreferences('uid-123'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.categories.length).toBeGreaterThan(0);
    expect(result.current.data?.payments.length).toBeGreaterThan(0);
    expect(result.current.data?.accounts.length).toBeGreaterThan(0);
    expect(result.current.data?.defaultCurrency.code).toBe('SGD');
    expect(result.current.data?.defaultEntries).toEqual({ account: 'Monthly Budget' });
  });

  it('appends unique Firestore entries after defaults without duplicating', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: 'uid-123',
      data: () => ({
        ...mockPreferenceData,
        payments: [
          { name: 'Cash', emoji: '💵', type: 'payment', parent: null }, // already a default
          { name: 'PayNow', emoji: '💸', type: 'payment', parent: null }, // custom addition
        ],
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => usePreferences('uid-123'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const paymentNames = result.current.data?.payments.map((p) => p.name) ?? [];
    // Default Cash appears exactly once (not duplicated from Firestore)
    expect(paymentNames.filter((n) => n === 'Cash').length).toBe(1);
    // Custom PayNow is appended after defaults
    expect(paymentNames).toContain('PayNow');
  });

  it('sets error on Firestore failure', async () => {
    vi.mocked(getDoc).mockRejectedValueOnce(new Error('permission denied'));
    const { result } = renderHook(() => usePreferences('uid-123'));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('permission denied');
  });
});

describe('usePreferences — refetch', () => {
  it('refetch re-triggers the Firestore fetch', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      id: 'u1',
      data: () => ({ accounts: [], categories: [], subCategories: [], vendors: [], payments: [] }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => usePreferences('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const callsBefore = vi.mocked(getDoc).mock.calls.length;

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(vi.mocked(getDoc).mock.calls.length).toBeGreaterThan(callsBefore));
  });
});
