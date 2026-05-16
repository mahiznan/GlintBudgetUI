import { render, screen } from '@testing-library/react';
import Header from './Header';

describe('Header', () => {
  it('renders the GlintBudget wordmark', () => {
    render(<Header />);
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
  });

  it('is rendered as a banner landmark', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
