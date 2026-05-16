import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';

vi.mock('../firebase/client', () => ({
  auth: { kind: 'mock-auth' },
}));

vi.mock('../firebase/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOutCurrentUser: vi.fn(),
}));

import AppShell from './AppShell';

describe('AppShell route', () => {
  it('renders the GlintBudget wordmark, welcome line, and UserMenu when authenticated', () => {
    render(
      <AuthContext.Provider
        value={{
          status: 'authenticated',
          user: { uid: 'u', name: 'Rajesh M', email: 'r@e.com', photoUrl: null },
        }}
      >
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
    expect(screen.getByText(/welcome back, rajesh/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rajesh m/i })).toBeInTheDocument();
    expect(screen.getByText(/coming in later stages/i)).toBeInTheDocument();
  });
});
