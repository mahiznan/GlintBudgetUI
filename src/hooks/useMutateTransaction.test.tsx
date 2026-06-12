import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockAddTransaction = vi.fn(() => 'test-uuid');
const mockUpdateTransaction = vi.fn();
const mockDeleteTransaction = vi.fn();

vi.mock('../context/useTransactionContext', () => ({
  useTransactionContext: vi.fn(() => ({
    transactions: [],
    loading: false,
    error: null,
    addTransaction: mockAddTransaction,
    updateTransaction: mockUpdateTransaction,
    deleteTransaction: mockDeleteTransaction,
    loadYear: vi.fn(),
  })),
}));

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
}));

import {
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  toTitleCase,
  vendorExists,
} from './useMutateTransaction';
import { SyncStatusProvider } from '../context/SyncStatusContext';
import { PreferenceProvider } from '../context/PreferenceContext';
import { AuthProvider } from '../auth/AuthProvider';
import type { Transaction } from '../firestore/types';

describe('toTitleCase', () => {
  it('converts lowercase vendor name to title case', () => {
    expect(toTitleCase('starbucks')).toBe('Starbucks');
  });

  it('converts multi-word vendor names to title case', () => {
    expect(toTitleCase('whole foods')).toBe('Whole Foods');
  });

  it('handles uppercase vendor names', () => {
    expect(toTitleCase("MCDONALD'S")).toBe("Mcdonald's");
  });

  it('trims whitespace from input', () => {
    expect(toTitleCase('  starbucks  ')).toBe('Starbucks');
  });

  it('preserves hyphens in vendor names', () => {
    expect(toTitleCase('target-express')).toBe('Target-express');
  });

  it('returns empty string for empty input', () => {
    expect(toTitleCase('')).toBe('');
  });
});

describe('vendorExists', () => {
  it('returns true for case-insensitive vendor match', () => {
    const vendors = [
      { name: 'Starbucks', category: 'Cafe' },
      { name: 'Whole Foods', category: 'Grocery' },
    ];
    expect(vendorExists('starbucks', vendors)).toBe(true);
  });

  it('returns false for vendor not in list', () => {
    const vendors = [
      { name: 'Starbucks', category: 'Cafe' },
      { name: 'Whole Foods', category: 'Grocery' },
    ];
    expect(vendorExists('Target', vendors)).toBe(false);
  });

  it('handles empty vendor list', () => {
    expect(vendorExists('Starbucks', [])).toBe(false);
  });

  it('matches vendors with different cases', () => {
    const vendors = [{ name: 'STARBUCKS', category: 'Cafe' }];
    expect(vendorExists('starbucks', vendors)).toBe(true);
  });
});

describe('vendor auto-add logic (integration via helpers)', () => {
  it('vendorExists detects duplicates case-insensitively', () => {
    const vendors = [
      { name: 'Zepto', emoji: '📱', type: 'vendor', parent: null },
      { name: 'Starbucks', emoji: '☕', type: 'vendor', parent: null },
    ];

    expect(vendorExists('zepto', vendors)).toBe(true);
    expect(vendorExists('ZEPTO', vendors)).toBe(true);
    expect(vendorExists('amazon', vendors)).toBe(false);
  });

  it('vendor trimming preserves original casing', () => {
    const trimmedLower = 'zepto'.trim();
    const trimmedUpper = '  ZEPTO  '.trim();
    const trimmedMixed = '  Zepto  '.trim();

    expect(trimmedLower).toBe('zepto');
    expect(trimmedUpper).toBe('ZEPTO');
    expect(trimmedMixed).toBe('Zepto');
  });

  it('case-insensitive match works regardless of input casing', () => {
    const vendors = [
      { name: 'Zepto', emoji: '📱', type: 'vendor', parent: null },
      { name: 'Starbucks', emoji: '☕', type: 'vendor', parent: null },
    ];

    // Even though we trim and preserve case, case-insensitive check works
    expect(vendorExists('zepto', vendors)).toBe(true);
    expect(vendorExists('ZEPTO', vendors)).toBe(true);
    expect(vendorExists('Zepto', vendors)).toBe(true);
  });
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <SyncStatusProvider>
      <PreferenceProvider>{children}</PreferenceProvider>
    </SyncStatusProvider>
  </AuthProvider>
);

const baseTx: Omit<Transaction, 'id'> = {
  user_id: 'u1', category: 'Food', subCategory: 'Groceries',
  date: new Date('2026-05-17'), account: 'HDFC', vendor: 'Zepto',
  payment: 'UPI', currency: 'INR', notes: '', amount: -500, icon: '🛒',
};

describe('useAddTransaction', () => {
  beforeEach(() => { vi.resetAllMocks(); mockAddTransaction.mockReturnValue('test-uuid'); });

  it('calls context addTransaction and returns its id', () => {
    const { result } = renderHook(() => useAddTransaction('u1'), { wrapper });
    const id = result.current.mutate(baseTx);
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
    expect(id).toBe('test-uuid');
  });

  it('trims vendor whitespace before passing to addTransaction', () => {
    const { result } = renderHook(() => useAddTransaction('u1'), { wrapper });
    result.current.mutate({ ...baseTx, vendor: '  Zepto  ' });
    const called = (mockAddTransaction.mock.calls as unknown as Array<[Omit<Transaction, 'id'>]>)[0]![0];
    expect(called.vendor).toBe('Zepto');
  });
});

describe('useUpdateTransaction', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls context updateTransaction with id and patch', () => {
    const { result } = renderHook(() => useUpdateTransaction('u1'), { wrapper });
    result.current.mutate('tx-1', { amount: -999 });
    expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', expect.objectContaining({ amount: -999 }));
  });

  it('trims vendor whitespace in patch before calling updateTransaction', () => {
    const { result } = renderHook(() => useUpdateTransaction('u1'), { wrapper });
    result.current.mutate('tx-1', { vendor: '  ZEPTO  ' });
    const patch = (mockUpdateTransaction.mock.calls as unknown as Array<[string, { vendor: string }]>)[0]![1];
    expect(patch.vendor).toBe('ZEPTO');
  });
});

describe('useDeleteTransaction', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls context deleteTransaction with id', () => {
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });
    result.current.mutate('tx-1');
    expect(mockDeleteTransaction).toHaveBeenCalledWith('tx-1');
  });
});
