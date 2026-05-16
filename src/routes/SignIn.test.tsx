import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import type { AuthState } from '../auth/types';

const signInWithGoogle = vi.hoisted(() => vi.fn());

vi.mock('../firebase/client', () => ({
  auth: { kind: 'mock-auth' },
}));

vi.mock('../firebase/auth', () => ({
  signInWithGoogle,
  signOutCurrentUser: vi.fn(),
}));

import SignIn from './SignIn';

function harness(initial: AuthState) {
  return render(
    <AuthContext.Provider value={initial}>
      <MemoryRouter initialEntries={['/signin']}>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/app" element={<span>dashboard</span>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('SignIn route', () => {
  beforeEach(() => {
    signInWithGoogle.mockReset();
  });

  it('renders a "Continue with Google" button when anonymous', () => {
    harness({ status: 'anonymous', user: null });
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('calls signInWithGoogle on click', async () => {
    signInWithGoogle.mockResolvedValue(undefined);
    harness({ status: 'anonymous', user: null });
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('redirects to /app when already authenticated', () => {
    harness({
      status: 'authenticated',
      user: { uid: 'u', name: 'R', email: null, photoUrl: null },
    });
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('shows the popup-blocked message when signInWithGoogle throws auth/popup-blocked', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/popup-blocked' });
    harness({ status: 'anonymous', user: null });
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await waitFor(() =>
      expect(screen.getByText(/popup blocked/i)).toBeInTheDocument(),
    );
  });

  it('stays silent when the user closes the popup themselves', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
    harness({ status: 'anonymous', user: null });
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a generic failure message on any other error', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/network-request-failed' });
    harness({ status: 'anonymous', user: null });
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await waitFor(() =>
      expect(screen.getByText(/sign-in failed/i)).toBeInTheDocument(),
    );
  });
});
