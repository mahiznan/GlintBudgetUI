import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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

  it('does not render the iOS App Store link', () => {
    render(<Footer />);
    expect(screen.queryByText(/app store/i)).toBeNull();
    expect(screen.queryByText(/ios/i)).toBeNull();
  });

  it('renders build info centered in the footer', () => {
    render(<Footer />);
    const buildInfo = screen.getByTestId('build-info');
    expect(buildInfo.textContent).toMatch(/Build/);
    expect(buildInfo.textContent).toMatch(/UTC|\d{4}-\d{2}-\d{2}/);
    expect(buildInfo.className).toMatch(/text-center/);
  });
});
