import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'pref-ref'),
  setDoc: vi.fn(() => Promise.resolve()),
}));

import { setDoc } from 'firebase/firestore';
import { useUpdatePreference } from './useUpdatePreference';

describe('useUpdatePreference', () => {
  it('calls setDoc with merge:true', async () => {
    const { result } = renderHook(() => useUpdatePreference('u1'));
    await act(async () => {
      await result.current.mutate({ accounts: [] });
    });
    expect(vi.mocked(setDoc)).toHaveBeenCalledWith(
      'pref-ref',
      { accounts: [] },
      { merge: true },
    );
  });

  it('sets loading true during mutation and false after', async () => {
    let resolve!: () => void;
    vi.mocked(setDoc).mockImplementationOnce(
      () => new Promise<void>((res) => { resolve = res; }),
    );
    const { result } = renderHook(() => useUpdatePreference('u1'));
    act(() => { void result.current.mutate({ vendors: [] }); });
    expect(result.current.loading).toBe(true);
    await act(async () => { resolve(); });
    expect(result.current.loading).toBe(false);
  });

  it('sets error on failure', async () => {
    vi.mocked(setDoc).mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useUpdatePreference('u1'));
    await act(async () => {
      await result.current.mutate({ payments: [] }).catch(() => {});
    });
    expect(result.current.error?.message).toBe('network');
  });

  it('clears error on next successful mutate', async () => {
    vi.mocked(setDoc).mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useUpdatePreference('u1'));
    await act(async () => { await result.current.mutate({}).catch(() => {}); });
    expect(result.current.error).not.toBeNull();

    vi.mocked(setDoc).mockResolvedValueOnce(undefined as never);
    await act(async () => { await result.current.mutate({}); });
    expect(result.current.error).toBeNull();
  });
});
