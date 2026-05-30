import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));

const mockUnsub = vi.fn();
let capturedCallback: ((snap: unknown) => void) | null = null;

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn(() => 'q'),
  where: vi.fn(() => 'w'),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSnapshot: vi.fn((_q, cb, _) => {
    capturedCallback = cb as (snap: unknown) => void;
    return mockUnsub;
  }),
}));

import { onSnapshot } from 'firebase/firestore';
import { useAllTransactionVendors } from './useAllTransactionVendors';

function makeSnap(vendors: string[]) {
  return {
    docs: vendors.map((vendor, i) => ({
      id: `tx${i}`,
      data: () => ({ vendor }),
    })),
  };
}

describe('useAllTransactionVendors', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    capturedCallback = null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    vi.mocked(onSnapshot).mockImplementation((_q, cb, _) => {
      capturedCallback = cb as (snap: unknown) => void;
      return mockUnsub;
    });
  });

  it('starts with loading=true and empty set', () => {
    const { result } = renderHook(() => useAllTransactionVendors('u1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.vendorNames.size).toBe(0);
  });

  it('returns unique non-empty vendor names after snapshot', async () => {
    const { result } = renderHook(() => useAllTransactionVendors('u1'));
    act(() => {
      capturedCallback!(makeSnap(['Starbucks', 'Zepto', 'Starbucks', '']));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.vendorNames).toEqual(new Set(['Starbucks', 'Zepto']));
  });

  it('excludes whitespace-only vendor strings', async () => {
    const { result } = renderHook(() => useAllTransactionVendors('u1'));
    act(() => {
      capturedCallback!(makeSnap(['  ', 'Zepto']));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.vendorNames).toEqual(new Set(['Zepto']));
  });

  it('returns empty set and loading=false when uid is empty', () => {
    const { result } = renderHook(() => useAllTransactionVendors(''));
    expect(result.current.loading).toBe(false);
    expect(result.current.vendorNames.size).toBe(0);
  });
});
