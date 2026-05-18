import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../firebase/client', () => ({ auth: {}, app: {} }));
vi.mock('../../firebase/auth', () => ({
  signOutCurrentUser: vi.fn(),
}));

import Sidebar from './Sidebar';

describe('Sidebar', () => {
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
});
