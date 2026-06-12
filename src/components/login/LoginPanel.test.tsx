import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../auth/AuthContext';
import type { AuthState } from '../../auth/types';

const signInWithGoogle = vi.hoisted(() => vi.fn());
vi.mock('../../firebase/client', () => ({ auth: { kind: 'mock-auth' } }));
vi.mock('../../firebase/auth', () => ({ signInWithGoogle, signOutCurrentUser: vi.fn() }));

import LoginPanel from './LoginPanel';

function renderPanel(state: AuthState = { status: 'anonymous', user: null }) {
  return render(
    <AuthContext.Provider value={state}>
      <MemoryRouter>
        <LoginPanel />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

async function clickSignIn() {
  // Wrap in act so the post-await state update (setError/setBusy) settles in-band,
  // avoiding the "not wrapped in act" warning and a spurious unhandled-rejection report.
  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
  });
}

describe('LoginPanel', () => {
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

  it('renders the welcome heading and Google button', () => {
    renderPanel();
    expect(screen.getByText(/welcome to glintbudget/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('calls signInWithGoogle on click', async () => {
    signInWithGoogle.mockResolvedValue(undefined);
    renderPanel();
    await clickSignIn();
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledTimes(1));
  });

  it('surfaces the popup-blocked error', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/popup-blocked' });
    renderPanel();
    await clickSignIn();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/popup blocked/i));
  });
});
