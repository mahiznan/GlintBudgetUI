import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthContext } from './AuthContext';
import { RequireAuth } from './RequireAuth';
import type { AuthState } from './types';

function harness(initial: AuthState, startAt = '/app') {
  return render(
    <AuthContext.Provider value={initial}>
      <MemoryRouter initialEntries={[startAt]}>
        <Routes>
          <Route path="/signin" element={<span>signin page</span>} />
          <Route
            path="/app"
            element={
              <RequireAuth>
                <span>protected content</span>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('RequireAuth', () => {
  it('shows a loading indicator while auth is loading', () => {
    harness({ status: 'loading', user: null });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).toBeNull();
  });

  it('redirects to /signin when anonymous', () => {
    harness({ status: 'anonymous', user: null });
    expect(screen.getByText('signin page')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).toBeNull();
  });

  it('renders children when authenticated', () => {
    harness({
      status: 'authenticated',
      user: { uid: 'u', name: 'R', email: null, photoUrl: null },
    });
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});
