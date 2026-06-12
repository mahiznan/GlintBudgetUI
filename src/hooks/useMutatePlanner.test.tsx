import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddPlanner = vi.fn(() => 'test-uuid');
const mockUpdatePlanner = vi.fn();
const mockArchivePlanner = vi.fn();
const mockDeletePlanner = vi.fn();

vi.mock('../context/usePlannerContext', () => ({
  usePlannerContext: () => ({
    planners: [],
    loading: false,
    error: null,
    addPlanner: mockAddPlanner,
    updatePlanner: mockUpdatePlanner,
    archivePlanner: mockArchivePlanner,
    deletePlanner: mockDeletePlanner,
  }),
}));

import {
  useAddPlanner,
  useUpdatePlanner,
  useArchivePlanner,
  useDeletePlanner,
} from './useMutatePlanner';
import { SyncStatusProvider } from '../context/SyncStatusContext';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SyncStatusProvider, null, children);

describe('useAddPlanner', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls context addPlanner and returns its id', () => {
    mockAddPlanner.mockReturnValue('test-uuid');
    const { result } = renderHook(() => useAddPlanner(), { wrapper });
    const id = result.current.mutate({
      user_id: 'u1',
      name: 'Monthly',
      description: '',
      currency: 'SGD',
      active: true,
      archived: false,
      period: 'monthly',
      repeatable: true,
      filterAccounts: [],
      filterVendors: [],
      filterPayments: [],
      categoryBudgets: [],
      chartView: 'bar',
    });
    expect(mockAddPlanner).toHaveBeenCalledTimes(1);
    expect(id).toBe('test-uuid');
  });
});

describe('useUpdatePlanner', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls context updatePlanner with id and patch', () => {
    const { result } = renderHook(() => useUpdatePlanner(), { wrapper });
    result.current.mutate('p1', { name: 'Renamed' });
    expect(mockUpdatePlanner).toHaveBeenCalledWith('p1', { name: 'Renamed' });
  });
});

describe('useArchivePlanner', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls context archivePlanner with id', () => {
    const { result } = renderHook(() => useArchivePlanner(), { wrapper });
    result.current.mutate('p1');
    expect(mockArchivePlanner).toHaveBeenCalledWith('p1');
  });
});

describe('useDeletePlanner', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls context deletePlanner with id', () => {
    const { result } = renderHook(() => useDeletePlanner(), { wrapper });
    result.current.mutate('p1');
    expect(mockDeletePlanner).toHaveBeenCalledWith('p1');
  });
});
