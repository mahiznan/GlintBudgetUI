import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));

const mockUnsub = vi.fn();
let capturedCallback: ((snap: unknown) => void) | null = null;
let capturedErrorCallback: ((err: Error) => void) | null = null;

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'doc-ref'),
  onSnapshot: vi.fn((_ref, _opts, cb, errCb) => {
    capturedCallback = cb as (snap: unknown) => void;
    capturedErrorCallback = errCb as (err: Error) => void;
    return mockUnsub;
  }),
}));

import { onSnapshot } from 'firebase/firestore';
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

function makeSnap(data: Record<string, unknown> | null, hasPendingWrites = false, id = 'uid-123') {
  return {
    exists: () => data !== null,
    id,
    data: () => data ?? {},
    metadata: { hasPendingWrites },
  };
}

describe('usePreferences', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    capturedCallback = null;
    capturedErrorCallback = null;
    vi.mocked(onSnapshot).mockImplementation((_ref, _opts, cb, errCb) => {
      capturedCallback = cb as (snap: unknown) => void;
      capturedErrorCallback = errCb as (err: Error) => void;
      return mockUnsub;
    });
  });

  it('returns loading=true and data=null initially', () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('returns loading=false and data=null when uid is null (no subscription)', () => {
    const { result } = renderHook(() => usePreferences(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('decodes snake_case fields and returns Preference on snapshot', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => { capturedCallback!(makeSnap(mockPreferenceData)); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.defaultCurrency.code).toBe('INR');
    expect(result.current.data?.bookmarkedCurrencies).toEqual(['INR', 'USD']);
    expect(result.current.data?.defaultEntries).toEqual({ account: 'HDFC' });
    expect(result.current.data?.id).toBe('uid-123');
  });

  it('returns built-in defaults when document does not exist', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => { capturedCallback!(makeSnap(null)); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.categories.length).toBeGreaterThan(0);
    expect(result.current.data?.defaultCurrency.code).toBe('SGD');
  });

  it('exposes hasPendingWrites: true from snapshot metadata', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => { capturedCallback!(makeSnap(mockPreferenceData, true)); });
    await waitFor(() => expect(result.current.hasPendingWrites).toBe(true));
  });

  it('exposes hasPendingWrites: false when snapshot confirms', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => { capturedCallback!(makeSnap(mockPreferenceData, true)); });
    act(() => { capturedCallback!(makeSnap(mockPreferenceData, false)); });
    await waitFor(() => expect(result.current.hasPendingWrites).toBe(false));
  });

  it('sets error when onSnapshot calls the error callback', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => { capturedErrorCallback!(new Error('permission denied')); });
    await waitFor(() => expect(result.current.error?.message).toBe('permission denied'));
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => usePreferences('uid-123'));
    unmount();
    expect(mockUnsub).toHaveBeenCalledTimes(1);
  });

  it('appends unique Firestore entries after defaults without duplicating', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => {
      capturedCallback!(makeSnap({
        ...mockPreferenceData,
        payments: [
          { name: 'Cash', emoji: '💵', type: 'payment', parent: null },
          { name: 'PayNow', emoji: '💸', type: 'payment', parent: null },
        ],
      }));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const names = result.current.data?.payments.map((p) => p.name) ?? [];
    expect(names.filter((n) => n === 'Cash').length).toBe(1);
    expect(names).toContain('PayNow');
  });

  it('decodes archivedAccounts from Firestore', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => {
      capturedCallback!(
        makeSnap({
          ...mockPreferenceData,
          archivedAccounts: [{ name: 'Old Wallet', emoji: '👛', type: 'account', parent: null }],
        }),
      );
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.archivedAccounts).toHaveLength(1);
    expect(result.current.data?.archivedAccounts[0]!.name).toBe('Old Wallet');
  });

  it('defaults archivedAccounts to [] when field is absent', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => { capturedCallback!(makeSnap(mockPreferenceData)); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.archivedAccounts).toEqual([]);
  });

  it('mergeWithDefaults prefers Firestore version when names match (allows emoji override)', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => {
      capturedCallback!(
        makeSnap({
          ...mockPreferenceData,
          accounts: [{ name: 'Monthly Budget', emoji: '💰', type: 'account', parent: null }],
        }),
      );
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const monthly = result.current.data?.accounts.find((a) => a.name === 'Monthly Budget');
    expect(monthly?.emoji).toBe('💰');
    // still only one "Monthly Budget" (no duplicate)
    expect(result.current.data?.accounts.filter((a) => a.name === 'Monthly Budget')).toHaveLength(1);
  });
});
