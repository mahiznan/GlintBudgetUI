import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import Hero from './Hero';

vi.mock('../firebase/client', () => ({ auth: { kind: 'mock-auth' } }));
vi.mock('../firebase/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOutCurrentUser: vi.fn(),
}));

function renderHero() {
  return render(
    <AuthContext.Provider value={{ status: 'anonymous', user: null }}>
      <MemoryRouter>
        <Hero />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('Hero', () => {
  it('renders the headline', () => {
    renderHero();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/personal finance/i)).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    renderHero();
    expect(screen.getByText(/Add transactions in seconds/i)).toBeInTheDocument();
  });

  it('renders all four bullet points', () => {
    renderHero();
    expect(screen.getByText(/Add a transaction in under 5 seconds/i)).toBeInTheDocument();
    expect(screen.getByText(/Spending patterns revealed automatically/i)).toBeInTheDocument();
    expect(screen.getByText(/Works on desktop, tablet, and mobile/i)).toBeInTheDocument();
    expect(screen.getByText(/Multi-currency support built in/i)).toBeInTheDocument();
  });

  it('renders the sign-in card inside the hero', () => {
    renderHero();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('contains no iOS references', () => {
    renderHero();
    expect(screen.queryByText(/iphone/i)).toBeNull();
    expect(screen.queryByText(/ios/i)).toBeNull();
  });
});
