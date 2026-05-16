import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import Landing from './Landing';

describe('Landing route', () => {
  it('renders the GlintBudget wordmark, hero tagline, and footer', () => {
    render(
      <AuthContext.Provider value={{ status: 'anonymous', user: null }}>
        <MemoryRouter>
          <Landing />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
