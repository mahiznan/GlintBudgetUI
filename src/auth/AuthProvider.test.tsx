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
}));

import { AuthProvider } from './AuthProvider';
import { useAuth } from './AuthContext';
import { onAuthStateChanged as onAuthStateChangedFn } from 'firebase/auth';

const onAuthStateChanged = vi.mocked(onAuthStateChangedFn);

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

  it('flips to anonymous when callback fires with null user', () => {
    let cb: (u: User | null) => void = () => {};
    onAuthStateChanged.mockImplementation((_, fn) => {
      cb = fn as (u: User | null) => void;
      return () => {};
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    act(() => cb(null));
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
  });

  it('flips to authenticated and projects User into BudgetUser', () => {
    let cb: (u: User | null) => void = () => {};
    onAuthStateChanged.mockImplementation((_, fn) => {
      cb = fn as (u: User | null) => void;
      return () => {};
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    act(() =>
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
});
