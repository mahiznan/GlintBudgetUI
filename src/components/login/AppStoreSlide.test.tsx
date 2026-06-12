import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppStoreSlide from './AppStoreSlide';

describe('AppStoreSlide', () => {
  it('renders all three phone screenshots', () => {
    render(<AppStoreSlide />);
    expect(screen.getByAltText('GlintBudget light theme – dashboard')).toBeInTheDocument();
    expect(screen.getByAltText('GlintBudget – category report')).toBeInTheDocument();
    expect(screen.getByAltText('GlintBudget dark theme – dashboard')).toBeInTheDocument();
  });

  it('renders App Store download link', () => {
    render(<AppStoreSlide />);
    const link = screen.getByRole('link', { name: /download on the app store/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href');
  });

  it('App Store link opens in a new tab', () => {
    render(<AppStoreSlide />);
    const link = screen.getByRole('link', { name: /download on the app store/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
