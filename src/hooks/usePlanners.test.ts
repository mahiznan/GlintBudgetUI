import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({ status: 'authenticated', user: { uid: 'u1' } })),
}));
vi.mock('../context/SyncStatusContext', () => ({
  useSyncStatus: vi.fn(() => ({ notifyWrite: vi.fn() })),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SyncStatusProvider: ({ children }: { children: any }) => children,
}));

const mockUnsub = vi.fn();
let capturedCallback: ((snap: unknown) => void) | null = null;

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn(() => 'q'),
  where: vi.fn(() => 'w'),
  orderBy: vi.fn(() => 'o'),
  onSnapshot: vi.fn((_q, _opts, cb) => {
    capturedCallback = cb as (snap: unknown) => void;
    return mockUnsub;
  }),
  doc: vi.fn(() => 'doc-ref'),
  updateDoc: vi.fn(() => Promise.resolve()),
  Timestamp: { now: vi.fn(() => new Date()) },
}));

import { onSnapshot } from 'firebase/firestore';
import { usePlanners } from './usePlanners';
import React from 'react';
import { SyncStatusProvider } from '../context/SyncStatusContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(SyncStatusProvider, null, children)
);

function makeRawDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    data: () => ({
      user_id: 'u1',
      name: 'Monthly SGD',
      description: '',
      currency: 'SGD',
      active: true,
      archived: false,
      period: 'monthly',
      repeatable: true,
      filter_accounts: [],
      filter_vendors: [],
      filter_payments: [],
      category_budgets: [{ category: 'Food', amount: 1000 }],
      chart_view: 'bar',
      created_at: { toDate: () => new Date('2026-05-01') },
      updated_at: { toDate: () => new Date('2026-05-01') },
      ...overrides,
    }),
  };
}

describe('usePlanners', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    capturedCallback = null;
    vi.mocked(onSnapshot).mockImplementation((_q, _opts, cb) => {
      capturedCallback = cb as (snap: unknown) => void;
      return mockUnsub;
    });
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => usePlanners('u1'), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.planners).toHaveLength(0);
  });

  it('returns planners after snapshot fires', () => {
    const { result } = renderHook(() => usePlanners('u1'), { wrapper });
    act(() => {
      capturedCallback!({
        docs: [makeRawDoc()],
        metadata: { hasPendingWrites: false },
      });
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.planners).toHaveLength(1);
    expect(result.current.planners[0]!.name).toBe('Monthly SGD');
    expect(result.current.planners[0]!.categoryBudgets).toEqual([
      { category: 'Food', amount: 1000 },
    ]);
  });

  it('returns empty array and error on failure', async () => {
    renderHook(() => usePlanners('u1'), { wrapper });
    // onSnapshot error path — need to capture errCb
    vi.mocked(onSnapshot).mockImplementation((_q, _opts, _cb, errCb) => {
      (errCb as (e: Error) => void)(new Error('permission denied'));
      return mockUnsub;
    });
    const { result: r2 } = renderHook(() => usePlanners('u1'), { wrapper });
    expect(r2.current.error).toBeTruthy();
  });

  it('does not subscribe when uid is empty', () => {
    renderHook(() => usePlanners(''), { wrapper });
    expect(onSnapshot).not.toHaveBeenCalled();
  });
});
