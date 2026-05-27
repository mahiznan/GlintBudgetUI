import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'pref-ref'),
  setDoc: vi.fn(() => Promise.resolve()),
}));

import { setDoc } from 'firebase/firestore';
import { useUpdatePreference } from './useUpdatePreference';
import { SyncStatusProvider } from '../context/SyncStatusContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SyncStatusProvider>{children}</SyncStatusProvider>
);

describe('useUpdatePreference', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls setDoc with merge:true synchronously', () => {
    const { result } = renderHook(() => useUpdatePreference('u1'), { wrapper });
    result.current.mutate({ accounts: [] });
    expect(vi.mocked(setDoc)).toHaveBeenCalledWith('pref-ref', { accounts: [] }, { merge: true });
  });

  it('encodes default_entries as alternating flat array', () => {
    const { result } = renderHook(() => useUpdatePreference('u1'), { wrapper });
    result.current.mutate({ default_entries: { account: 'HDFC', category: 'Food' } });
    const callArgs = vi.mocked(setDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(callArgs['default_entries']).toEqual(['account', 'HDFC', 'category', 'Food']);
  });
});
