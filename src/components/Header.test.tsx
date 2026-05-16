import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import type { AuthState } from '../auth/types';
import Header from './Header';

function renderWith(state: AuthState) {
  return render(
    <AuthContext.Provider value={state}>
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('Header', () => {
  it('renders the GlintBudget wordmark', () => {
    renderWith({ status: 'anonymous', user: null });
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
  });

  it('is rendered as a banner landmark', () => {
    renderWith({ status: 'anonymous', user: null });
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('shows a Sign in link when anonymous', () => {
    renderWith({ status: 'anonymous', user: null });
    const link = screen.getByRole('link', { name: /sign in/i });
    expect(link).toHaveAttribute('href', '/signin');
  });

  it('shows an Open dashboard link when authenticated', () => {
    renderWith({
      status: 'authenticated',
      user: { uid: 'u', name: 'R', email: null, photoUrl: null },
    });
    const link = screen.getByRole('link', { name: /open dashboard/i });
    expect(link).toHaveAttribute('href', '/app');
  });

  it('renders no auth-state-dependent link while loading', () => {
    renderWith({ status: 'loading', user: null });
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /open dashboard/i })).toBeNull();
  });
});
