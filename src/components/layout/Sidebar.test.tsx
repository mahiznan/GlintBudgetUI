import { render, screen } from '@testing-library/react';
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
});
