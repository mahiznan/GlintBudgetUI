import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));

const mockCommit = vi.fn();
const mockUpdate = vi.fn();
const mockBatch = { update: mockUpdate, commit: mockCommit };

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col-ref'),
  query: vi.fn(() => 'query-ref'),
  where: vi.fn(() => 'where-clause'),
  getDocs: vi.fn(),
  writeBatch: vi.fn(() => mockBatch),
}));

import { getDocs, writeBatch } from 'firebase/firestore';
import { useBulkRenameVendor } from './useBulkRenameVendor';
import { SyncStatusProvider } from '../context/SyncStatusContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SyncStatusProvider>{children}</SyncStatusProvider>
);

function makeSnap(count: number) {
  return {
    docs: Array.from({ length: count }, (_, i) => ({ ref: `ref-${i}` })),
  };
}

describe('useBulkRenameVendor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(writeBatch).mockReturnValue(mockBatch as never);
    mockCommit.mockResolvedValue(undefined);
  });

  it('calls getDocs with correct collection and query', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeSnap(0) as never);
    const { result } = renderHook(() => useBulkRenameVendor(), { wrapper });
    result.current.mutate('uid-1', 'Starbucks', 'Starbucks Coffee');
    await waitFor(() => expect(getDocs).toHaveBeenCalledWith('query-ref'));
  });

  it('updates all docs in a single batch when count ≤ 500', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeSnap(3) as never);
    const { result } = renderHook(() => useBulkRenameVendor(), { wrapper });
    result.current.mutate('uid-1', 'Starbucks', 'Starbucks Coffee');
    await waitFor(() => expect(mockCommit).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledTimes(3);
    expect(mockUpdate).toHaveBeenCalledWith('ref-0', { vendor: 'Starbucks Coffee' });
  });

  it('splits into two batches when doc count is 501', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeSnap(501) as never);
    const { result } = renderHook(() => useBulkRenameVendor(), { wrapper });
    result.current.mutate('uid-1', 'Old', 'New');
    await waitFor(() => expect(mockCommit).toHaveBeenCalledTimes(2));
    expect(writeBatch).toHaveBeenCalledTimes(2);
  });

  it('does not call writeBatch when no matching transactions exist', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeSnap(0) as never);
    const { result } = renderHook(() => useBulkRenameVendor(), { wrapper });
    result.current.mutate('uid-1', 'Old', 'New');
    await waitFor(() => expect(getDocs).toHaveBeenCalled());
    expect(mockCommit).not.toHaveBeenCalled();
  });
});
