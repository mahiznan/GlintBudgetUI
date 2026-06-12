import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'doc-ref'),
  setDoc: vi.fn(() => Promise.resolve()),
}));

const mockApplyPreferenceUpdate = vi.fn();
vi.mock('../context/PreferenceContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/PreferenceContext')>();
  return {
    ...actual,
    usePreferenceContext: () => ({
      preference: null,
      loading: false,
      error: null,
      applyPreferenceUpdate: mockApplyPreferenceUpdate,
    }),
  };
});

import { setDoc } from 'firebase/firestore';
import { useUpdatePreference } from './useUpdatePreference';
import { SyncStatusProvider } from '../context/SyncStatusContext';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SyncStatusProvider, null, children);

describe('useUpdatePreference', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls applyPreferenceUpdate immediately (optimistic)', () => {
    const { result } = renderHook(() => useUpdatePreference('u1'), { wrapper });
    result.current.mutate({ theme: 'ocean' });
    expect(mockApplyPreferenceUpdate).toHaveBeenCalledWith({ theme: 'ocean' });
  });

  it('calls setDoc with merge:true', () => {
    const { result } = renderHook(() => useUpdatePreference('u1'), { wrapper });
    result.current.mutate({ theme: 'ocean' });
    expect(setDoc).toHaveBeenCalledWith('doc-ref', { theme: 'ocean' }, { merge: true });
  });
});
