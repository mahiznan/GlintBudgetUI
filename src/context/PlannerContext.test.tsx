import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('../firebase/client', () => ({ auth: {}, app: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn(() => 'q'),
  where: vi.fn(() => 'w'),
  orderBy: vi.fn(() => 'o'),
  onSnapshot: vi.fn(() => () => {}),
  doc: vi.fn(() => 'doc-ref'),
  updateDoc: vi.fn(),
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date() })) },
}));

vi.mock('./SyncStatusContext', () => ({
  useSyncStatus: vi.fn(() => ({ notifySnapshot: vi.fn(), notifyWrite: vi.fn() })),
  SyncStatusProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { AuthContext } from '../auth/AuthContext';
import { PlannerProvider } from './PlannerProvider';
import { usePlannerContext } from './usePlannerContext';

function Consumer() {
  const { loading } = usePlannerContext();
  return <div>{loading ? 'loading' : 'done'}</div>;
}

describe('PlannerContext', () => {
  it('provides planner state to consumers', () => {
    render(
      <AuthContext.Provider
        value={{ status: 'authenticated', user: { uid: 'u1', name: null, email: null, photoUrl: null } }}
      >
        <PlannerProvider>
          <Consumer />
        </PlannerProvider>
      </AuthContext.Provider>,
    );
    expect(screen.getByText(/loading|done/)).toBeInTheDocument();
  });

  it('throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      'usePlannerContext must be used within PlannerProvider',
    );
    spy.mockRestore();
  });
});
