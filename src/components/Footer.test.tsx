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

  it('renders build info with commit and timestamp', () => {
    render(<Footer />);
    const buildInfo = screen.getByTestId('build-info');
    expect(buildInfo.textContent).toMatch(/Build/);
    expect(buildInfo.textContent).toMatch(/UTC|\d{4}-\d{2}-\d{2}/);
  });

  it('renders build info in the same row as the Privacy Policy link', () => {
    render(<Footer />);
    const buildInfo = screen.getByTestId('build-info');
    const privacyLink = screen.getByRole('link', { name: /privacy policy/i });
    expect(buildInfo.closest('footer > div')).toBe(privacyLink.closest('footer > div'));
  });

  it('renders build info as a middle item, not nested inside the Privacy Policy container', () => {
    render(<Footer />);
    const buildInfo = screen.getByTestId('build-info');
    const privacyLink = screen.getByRole('link', { name: /privacy policy/i });
    expect(buildInfo.parentElement).not.toBe(privacyLink.parentElement);
  });

  it('build info uses theme font not monospace', () => {
    render(<Footer />);
    const buildInfo = screen.getByTestId('build-info');
    expect(buildInfo.className).not.toMatch(/font-mono/);
  });
});
