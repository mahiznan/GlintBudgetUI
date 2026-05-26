import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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

import SignInCard from './SignInCard';

function renderWith(state: AuthState) {
  return render(
    <AuthContext.Provider value={state}>
      <MemoryRouter>
        <SignInCard />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('SignInCard', () => {
  beforeEach(() => {
    signInWithGoogle.mockReset();
  });

  it('renders a "Sign in with Google" button when anonymous', () => {
    renderWith({ status: 'anonymous', user: null });
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('calls signInWithGoogle on click', async () => {
    signInWithGoogle.mockResolvedValue(undefined);
    renderWith({ status: 'anonymous', user: null });
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('shows "Open dashboard" link when authenticated', () => {
    renderWith({
      status: 'authenticated',
      user: { uid: 'u', name: 'R', email: null, photoUrl: null },
    });
    const link = screen.getByRole('link', { name: /open dashboard/i });
    expect(link).toHaveAttribute('href', '/app');
  });

  it('shows the popup-blocked message when signInWithGoogle throws auth/popup-blocked', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/popup-blocked' });
    renderWith({ status: 'anonymous', user: null });
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => expect(screen.getByText(/popup blocked/i)).toBeInTheDocument());
  });

  it('stays silent when the user closes the popup themselves', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
    renderWith({ status: 'anonymous', user: null });
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a generic failure message on any other error', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/network-request-failed' });
    renderWith({ status: 'anonymous', user: null });
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => expect(screen.getByText(/sign-in failed/i)).toBeInTheDocument());
  });
});
