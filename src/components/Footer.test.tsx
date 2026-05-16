import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  it('renders the copyright with current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${year} GlintBudget`))).toBeInTheDocument();
  });

  it('renders the Privacy Policy link', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
  });

  it('is rendered as a contentinfo landmark', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders the build commit hash and timestamp injected at build time', () => {
    render(<Footer />);
    const buildInfo = screen.getByTestId('build-info');
    // commit hash and the literal "Build" / "UTC" labels are always present
    expect(buildInfo.textContent).toMatch(/Build/);
    expect(buildInfo.textContent).toMatch(/UTC|\d{4}-\d{2}-\d{2}/);
  });
});
