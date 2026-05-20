import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';

vi.mock('../firebase/client', () => ({ auth: { kind: 'mock-auth' }, app: {} }));
vi.mock('../firebase/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOutCurrentUser: vi.fn(),
}));
vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'doc-ref'),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
}));
vi.mock('../context/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    themeId: 'lime',
    setTheme: vi.fn().mockResolvedValue(undefined),
  })),
}));

import AppShell from './AppShell';

const authedCtx = {
  status: 'authenticated' as const,
  user: { uid: 'u1', name: 'Rajesh M', email: 'r@e.com', photoUrl: null },
};

describe('AppShell route', () => {
  it('renders the GlintBudget wordmark in the sidebar', () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
  });

  it('renders Dashboard nav link', () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
  });
});

describe('AppShell nav links', () => {
  it('renders the Transactions nav link', () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('link', { name: /transactions/i })).toBeInTheDocument();
  });

  it('renders the Settings nav link', () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });
});

