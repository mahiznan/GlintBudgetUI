vi.mock('../components/layout/SyncPill', () => ({ default: () => <span data-testid="sync-pill" /> }));

vi.mock('../context/TransactionContext', () => ({
  useTransactionContext: () => ({
    transactions: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../components/transactions/AddTransactionDrawer', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="New Transaction">drawer</div> : null,
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    themeId: 'lime',
    setTheme: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../context/LayoutContext', () => ({
  useLayout: vi.fn(() => ({
    layoutWidth: 'fixed' as const,
    setLayoutWidth: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import { useLayout } from '../context/LayoutContext';

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

describe('AppShell — FAB', () => {
  it('renders an "Add transaction" FAB button', () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument();
  });

  it('clicking the FAB opens the AddTransactionDrawer', async () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add transaction/i }));
    expect(screen.getByRole('dialog', { name: /new transaction/i })).toBeInTheDocument();
  });
});

describe('AppShell — layout width', () => {
  beforeEach(() => {
    vi.mocked(useLayout).mockReturnValue({
      layoutWidth: 'fixed',
      setLayoutWidth: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('applies max-w-5xl class in fixed mode', () => {
    const { container } = render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(container.querySelector('main .max-w-5xl')).not.toBeNull();
  });

  it('does not apply max-w-5xl class in full mode', () => {
    vi.mocked(useLayout).mockReturnValue({
      layoutWidth: 'full',
      setLayoutWidth: vi.fn().mockResolvedValue(undefined),
    });
    const { container } = render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(container.querySelector('main .max-w-5xl')).toBeNull();
  });
});
