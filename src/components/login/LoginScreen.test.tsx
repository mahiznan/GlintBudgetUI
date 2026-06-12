import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../auth/AuthContext';

// Reduced motion ON disables the carousel timer for a deterministic test.
vi.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('../../firebase/client', () => ({ auth: { kind: 'mock-auth' } }));
vi.mock('../../firebase/auth', () => ({ signInWithGoogle: vi.fn(), signOutCurrentUser: vi.fn() }));

import LoginScreen from './LoginScreen';

function renderScreen() {
  return render(
    <AuthContext.Provider value={{ status: 'anonymous', user: null }}>
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('LoginScreen', () => {
  it('renders the brand wordmark', () => {
    renderScreen();
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
  });

  it('renders the persistent Google sign-in button', () => {
    renderScreen();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('renders the first slide heading', () => {
    renderScreen();
    expect(screen.getByRole('heading', { level: 1, name: /see your money/i })).toBeInTheDocument();
  });
});
