import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  doc: vi.fn(() => 'doc-ref'),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
}));

import { setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  it('calls setDoc with snake_case sub_category and returns uuid synchronously', () => {
    const { result } = renderHook(() => useAddTransaction('u1'), { wrapper });
    const id = result.current.mutate(baseTx);
    expect(id).toMatch(UUID_RE);
    expect(setDoc).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(setDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(callArgs['sub_category']).toBe('Groceries');
    expect(callArgs['subCategory']).toBeUndefined();
    expect(callArgs['id']).toMatch(UUID_RE);
  });

  it('mutate returns the same id that was passed to setDoc', () => {
    const { result } = renderHook(() => useAddTransaction('u1'), { wrapper });
    const id = result.current.mutate(baseTx);
    const callArgs = vi.mocked(setDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(id).toBe(callArgs['id']);
  });

  it('trims vendor name and preserves original casing', () => {
    const { result } = renderHook(() => useAddTransaction('u1'), { wrapper });
    const txWithSpacedVendor = { ...baseTx, vendor: '  zepto  ' };
    result.current.mutate(txWithSpacedVendor);

    const callArgs = vi.mocked(setDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(callArgs['vendor']).toBe('zepto');
  });
});

describe('useUpdateTransaction', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls updateDoc with snake_case fields synchronously', () => {
    const { result } = renderHook(() => useUpdateTransaction('u1'), { wrapper });
    result.current.mutate('tx-1', { amount: 999, subCategory: 'Dining' });
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(updateDoc).mock.calls[0]![1] as unknown as Record<string, unknown>;
    expect(callArgs['amount']).toBe(999);
    expect(callArgs['sub_category']).toBe('Dining');
  });

  it('trims vendor name and preserves original casing on update', () => {
    const { result } = renderHook(() => useUpdateTransaction('u1'), { wrapper });
    result.current.mutate('tx-1', { vendor: '  ZEPTO  ' });

    expect(updateDoc).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(updateDoc).mock.calls[0]![1] as unknown as Record<string, unknown>;
    expect(callArgs['vendor']).toBe('ZEPTO');
  });
});

describe('useDeleteTransaction', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls deleteDoc synchronously', () => {
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });
    result.current.mutate('tx-1');
    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });
});
