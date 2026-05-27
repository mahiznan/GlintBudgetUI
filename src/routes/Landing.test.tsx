import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import Landing from './Landing';

vi.mock('../firebase/client', () => ({ auth: { kind: 'mock-auth' } }));
vi.mock('../firebase/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOutCurrentUser: vi.fn(),
}));

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
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
  });

  it('renders an h1 heading', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders the footer landmark', () => {
    renderLanding();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders the sign-in card', () => {
    renderLanding();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('contains no iOS references on the page', () => {
    renderLanding();
    expect(screen.queryByText(/iphone/i)).toBeNull();
    expect(screen.queryByText(/ios app/i)).toBeNull();
  });
});
