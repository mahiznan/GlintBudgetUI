import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import Landing from './Landing';

vi.mock('../hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('../firebase/client', () => ({ auth: { kind: 'mock-auth' } }));
vi.mock('../firebase/auth', () => ({ signInWithGoogle: vi.fn(), signOutCurrentUser: vi.fn() }));

function renderLanding() {
  return render(
    <AuthContext.Provider value={{ status: 'anonymous', user: null }}>
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('Landing route', () => {
  it('renders the GlintBudget wordmark', () => {
    renderLanding();
    expect(screen.getByRole('img', { name: /glintbudget logo/i })).toBeInTheDocument();
  });

  it('renders the hero heading', () => {
    renderLanding();
    // The carousel keeps all slides mounted, so several h1s exist; assert the first slide's.
    expect(screen.getByRole('heading', { level: 1, name: /see your money/i })).toBeInTheDocument();
  });

  it('renders the Google sign-in button', () => {
    renderLanding();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });
});
