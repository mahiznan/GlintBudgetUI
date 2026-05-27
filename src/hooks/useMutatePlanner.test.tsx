import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  doc: vi.fn(() => 'doc-ref'),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  Timestamp: {
    fromDate: vi.fn((d: Date) => d),
    now: vi.fn(() => new Date()),
  },
}));

import { setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  useAddPlanner,
  useUpdatePlanner,
  useArchivePlanner,
  useDeletePlanner,
} from './useMutatePlanner';
import { SyncStatusProvider } from '../context/SyncStatusContext';
import type { BudgetPlanner } from '../firestore/types';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SyncStatusProvider, null, children);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const basePlanner: Omit<BudgetPlanner, 'id' | 'createdAt' | 'updatedAt'> = {
  user_id: 'u1',
  name: 'Monthly SGD',
  description: '',
  currency: 'SGD',
  active: true,
  archived: false,
  period: 'monthly',
  repeatable: true,
  filterAccounts: [],
  filterVendors: [],
  filterPayments: [],
  categoryBudgets: [{ category: 'Food', amount: 1000 }],
  chartView: 'bar',
};

describe('useAddPlanner', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls setDoc and returns a UUID', () => {
    const { result } = renderHook(() => useAddPlanner(), { wrapper });
    const id = result.current.mutate(basePlanner);
    expect(id).toMatch(UUID_RE);
    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  it('encodes categoryBudgets and snake_case fields', () => {
    const { result } = renderHook(() => useAddPlanner(), { wrapper });
    result.current.mutate(basePlanner);
    const payload = vi.mocked(setDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(payload['user_id']).toBe('u1');
    expect(payload['category_budgets']).toEqual([{ category: 'Food', amount: 1000 }]);
    expect(payload['chart_view']).toBe('bar');
    expect(payload['filter_accounts']).toEqual([]);
  });
});

describe('useUpdatePlanner', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls updateDoc with encoded patch', () => {
    const { result } = renderHook(() => useUpdatePlanner(), { wrapper });
    result.current.mutate('p1', { name: 'Renamed', chartView: 'radial' });
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const patch = vi.mocked(updateDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(patch['name']).toBe('Renamed');
    expect(patch['chart_view']).toBe('radial');
  });
});

describe('useArchivePlanner', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls updateDoc with archived=true and active=false', () => {
    const { result } = renderHook(() => useArchivePlanner(), { wrapper });
    result.current.mutate('p1');
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const patch = vi.mocked(updateDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(patch['archived']).toBe(true);
    expect(patch['active']).toBe(false);
  });
});

describe('useDeletePlanner', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls deleteDoc', () => {
    const { result } = renderHook(() => useDeletePlanner(), { wrapper });
    result.current.mutate('p1');
    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });
});
