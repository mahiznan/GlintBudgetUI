import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => [{ name: 'mock' }]),
}));

vi.mock('firebase/auth', () => {
  const onAuthStateChanged = vi.fn();
  return {
    getAuth: vi.fn(() => ({ kind: 'mock-auth' })),
    onAuthStateChanged,
  };
});

vi.mock('../firebase/client', () => ({
  auth: { kind: 'mock-auth' },
  app: { name: 'mock-app' },
}));

vi.mock('../firebase/db', () => ({
  db: { kind: 'mock-db' },
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(async () => ({ exists: () => false })),
}));

import { AuthProvider } from './AuthProvider';
import { useAuth } from './AuthContext';
import { onAuthStateChanged as onAuthStateChangedFn } from 'firebase/auth';
import { getDoc as getDocFn } from 'firebase/firestore';

const onAuthStateChanged = vi.mocked(onAuthStateChangedFn);
const getDoc = vi.mocked(getDocFn);

function Probe() {
  const auth = useAuth();
  return (
    <>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="name">{auth.user?.name ?? ''}</span>
    </>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    onAuthStateChanged.mockReset();
  });

  it('starts in loading status before the first auth callback fires', () => {
    onAuthStateChanged.mockImplementation(() => () => {});
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
  });

  it('flips to anonymous when callback fires with null user', async () => {
    let cb: (u: User | null) => Promise<void> = async () => {};
    onAuthStateChanged.mockImplementation((_, fn) => {
      cb = fn as (u: User | null) => Promise<void>;
      return () => {};
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => cb(null));
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
  });

  it('flips to authenticated and projects User into BudgetUser', async () => {
    let cb: (u: User | null) => Promise<void> = async () => {};
    onAuthStateChanged.mockImplementation((_, fn) => {
      cb = fn as (u: User | null) => Promise<void>;
      return () => {};
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () =>
      cb({
        uid: 'u-1',
        displayName: 'Rajesh M',
        email: 'r@example.com',
        photoURL: 'https://example.com/a.png',
      } as User),
    );
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('name')).toHaveTextContent('Rajesh M');
  });

  it('unsubscribes on unmount', () => {
    const unsubscribe = vi.fn();
    onAuthStateChanged.mockImplementation(() => unsubscribe);
    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not call getDoc again when the same UID fires a second auth event', async () => {
    let cb: (u: User | null) => Promise<void> = async () => {};
    onAuthStateChanged.mockImplementation((_, fn) => {
      cb = fn as (u: User | null) => Promise<void>;
      return () => {};
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    const testUser = {
      uid: 'u1',
      displayName: 'Alice',
      email: 'alice@example.com',
      photoURL: null,
    } as User;

    // First auth event
    await act(async () => cb(testUser));
    const firstCallCount = getDoc.mock.calls.length;

    // Second auth event with same UID
    await act(async () => cb(testUser));
    expect(getDoc.mock.calls.length).toBe(firstCallCount);
  });
});
