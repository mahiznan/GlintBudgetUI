import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import TopBar from './TopBar';

describe('TopBar', () => {
  it('renders the page title', () => {
    render(
      <MemoryRouter>
        <TopBar title="Dashboard" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('does not render Add Transaction link', () => {
    render(
      <MemoryRouter>
        <TopBar title="Dashboard" />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /add transaction/i })).not.toBeInTheDocument();
  });
});
