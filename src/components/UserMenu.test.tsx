import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BudgetUser } from '../auth/types';

const signOutCurrentUser = vi.hoisted(() => vi.fn());

vi.mock('../firebase/client', () => ({
  auth: { kind: 'mock-auth' },
}));

vi.mock('../firebase/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOutCurrentUser,
}));

import UserMenu from './UserMenu';

const user: BudgetUser = {
  uid: 'u-1',
  name: 'Rajesh M',
  email: 'r@example.com',
  photoUrl: 'https://example.com/a.png',
};

describe('UserMenu', () => {
  beforeEach(() => signOutCurrentUser.mockReset());

  it('renders the user name as the trigger label', () => {
    render(<UserMenu user={user} />);
    expect(screen.getByRole('button', { name: /rajesh m/i })).toBeInTheDocument();
  });

  it('falls back to email when name is null', () => {
    render(<UserMenu user={{ ...user, name: null }} />);
    expect(screen.getByRole('button', { name: /r@example\.com/i })).toBeInTheDocument();
  });

  it('opens the menu on click and shows Sign out', async () => {
    render(<UserMenu user={user} />);
    await userEvent.click(screen.getByRole('button', { name: /rajesh m/i }));
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
  });

  it('calls signOutCurrentUser when Sign out is clicked', async () => {
    signOutCurrentUser.mockResolvedValue(undefined);
    render(<UserMenu user={user} />);
    await userEvent.click(screen.getByRole('button', { name: /rajesh m/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /sign out/i }));
    expect(signOutCurrentUser).toHaveBeenCalledTimes(1);
  });
});
