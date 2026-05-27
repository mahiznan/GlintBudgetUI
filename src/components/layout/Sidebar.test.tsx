import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../firebase/client', () => ({ auth: {}, app: {} }));
vi.mock('../../firebase/auth', () => ({
  signOutCurrentUser: vi.fn(),
}));
vi.mock('../../context/ThemeContext', () => ({ useTheme: vi.fn() }));
vi.mock('./SyncPill', () => ({ default: () => <span data-testid="sync-pill" /> }));

import { useTheme } from '../../context/ThemeContext';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  beforeEach(() => {
    vi.mocked(useTheme).mockReturnValue({
      themeId: 'lime',
      setTheme: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('renders GlintBudget wordmark', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
  });

  it('renders Dashboard and Transactions nav links', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /transactions/i })).toBeInTheDocument();
  });

  it('renders Settings nav link', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('does not render any disabled items', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.queryByTitle('Coming soon')).not.toBeInTheDocument();
  });

  it('renders a Sign out button', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('calls signOutCurrentUser when Sign out is clicked', async () => {
    const { signOutCurrentUser } = await import('../../firebase/auth');
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(signOutCurrentUser).toHaveBeenCalled();
  });

  describe('theme switcher', () => {
    const setTheme = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
      vi.mocked(useTheme).mockReturnValue({ themeId: 'lime', setTheme });
    });

    it('renders a theme group with 4 swatch buttons', () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>,
      );
      const group = screen.getByRole('group', { name: /theme/i });
      expect(group.querySelectorAll('button')).toHaveLength(4);
    });

    it('marks the active theme button with aria-pressed="true"', () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>,
      );
      const active = screen.getByRole('button', { name: /lime/i });
      expect(active).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls setTheme when an inactive swatch is clicked', async () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>,
      );
      await userEvent.click(screen.getByRole('button', { name: /ocean/i }));
      expect(setTheme).toHaveBeenCalledWith('ocean');
    });
  });
});
