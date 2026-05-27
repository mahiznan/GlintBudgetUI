import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { SyncStatusProvider, useSyncStatus } from './SyncStatusContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SyncStatusProvider>{children}</SyncStatusProvider>
);

describe('SyncStatusContext', () => {
  afterEach(() => vi.useRealTimers());

  it('starts as synced', () => {
    const { result } = renderHook(() => useSyncStatus(), { wrapper });
    expect(result.current.status).toBe('synced');
  });

  it('transitions to syncing immediately after notifyWrite', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSyncStatus(), { wrapper });
    act(() => {
      result.current.notifyWrite();
    });
    expect(result.current.status).toBe('syncing');
  });

  it('transitions back to synced when notifySnapshot(false) is called', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSyncStatus(), { wrapper });
    act(() => {
      result.current.notifyWrite();
    });
    act(() => {
      result.current.notifySnapshot(false);
    });
    expect(result.current.status).toBe('synced');
  });

  it('stays syncing while notifySnapshot(true) is called within 3 s', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSyncStatus(), { wrapper });
    act(() => {
      result.current.notifyWrite();
    });
    act(() => {
      result.current.notifySnapshot(true);
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.status).toBe('syncing');
  });

  it('transitions to pending after 3 s without confirmation', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSyncStatus(), { wrapper });
    act(() => {
      result.current.notifyWrite();
    });
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(result.current.status).toBe('pending');
  });

  it('returns to synced from pending when notifySnapshot(false) arrives', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSyncStatus(), { wrapper });
    act(() => {
      result.current.notifyWrite();
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.status).toBe('pending');
    act(() => {
      result.current.notifySnapshot(false);
    });
    expect(result.current.status).toBe('synced');
  });
});
