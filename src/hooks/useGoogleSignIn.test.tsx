import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import type { AuthState } from '../auth/types';

const signInWithGoogle = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());

vi.mock('../firebase/client', () => ({ auth: { kind: 'mock-auth' } }));
vi.mock('../firebase/auth', () => ({ signInWithGoogle, signOutCurrentUser: vi.fn() }));
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

import { useGoogleSignIn } from './useGoogleSignIn';

function wrapper(state: AuthState) {
  return ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={state}>
      <MemoryRouter>{children}</MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('useGoogleSignIn', () => {
  beforeEach(() => {
    signInWithGoogle.mockReset();
    navigate.mockReset();
  });

  it('calls signInWithGoogle when signIn runs', async () => {
    signInWithGoogle.mockResolvedValue(undefined);
    const { result } = renderHook(() => useGoogleSignIn(), {
      wrapper: wrapper({ status: 'anonymous', user: null }),
    });
    await act(() => result.current.signIn());
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('maps popup-blocked to a helpful message', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/popup-blocked' });
    const { result } = renderHook(() => useGoogleSignIn(), {
      wrapper: wrapper({ status: 'anonymous', user: null }),
    });
    await act(() => result.current.signIn());
    await waitFor(() => expect(result.current.error).toMatch(/popup blocked/i));
  });

  it('stays silent when the user closes the popup', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
    const { result } = renderHook(() => useGoogleSignIn(), {
      wrapper: wrapper({ status: 'anonymous', user: null }),
    });
    await act(() => result.current.signIn());
    expect(result.current.error).toBeNull();
  });

  it('redirects to /app when already authenticated', () => {
    renderHook(() => useGoogleSignIn(), {
      wrapper: wrapper({
        status: 'authenticated',
        user: { uid: 'u', name: 'R', email: null, photoUrl: null },
      }),
    });
    expect(navigate).toHaveBeenCalledWith('/app', { replace: true });
  });
});
