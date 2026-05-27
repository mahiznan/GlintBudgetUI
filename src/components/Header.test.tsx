import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Header from './Header';

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

describe('Header', () => {
  it('renders the GlintBudget wordmark', () => {
    renderHeader();
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
  });

  it('is rendered as a banner landmark', () => {
    renderHeader();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders the logo image', () => {
    renderHeader();
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/glint.jpg');
  });

  it('does not render a sign-in link', () => {
    renderHeader();
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull();
  });

  it('does not render nav links', () => {
    renderHeader();
    expect(screen.queryByText(/features/i)).toBeNull();
    expect(screen.queryByText(/about/i)).toBeNull();
  });
});
