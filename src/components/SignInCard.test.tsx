import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<SignInCard />} />
          <Route path="/app" element={<span>dashboard</span>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('SignInCard', () => {
  const originalError = console.error.bind(console);
  beforeEach(() => {
    signInWithGoogle.mockReset();
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) return;
      originalError(...args);
    };
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders a "Sign in with Google" button when anonymous', () => {
    renderWith({ status: 'anonymous', user: null });
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('calls signInWithGoogle on click', async () => {
    signInWithGoogle.mockResolvedValue(undefined);
    renderWith({ status: 'anonymous', user: null });
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledTimes(1));
  });

  it('redirects to /app when already authenticated', async () => {
    renderWith({
      status: 'authenticated',
      user: { uid: 'u', name: 'R', email: null, photoUrl: null },
    });
    await waitFor(() => expect(screen.getByText('dashboard')).toBeInTheDocument());
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
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('shows a generic failure message on any other error', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/network-request-failed' });
    renderWith({ status: 'anonymous', user: null });
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => expect(screen.getByText(/sign-in failed/i)).toBeInTheDocument());
  });
});
