import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FeatureStrip from './FeatureStrip';

describe('FeatureStrip', () => {
  it('renders the section label', () => {
    render(<FeatureStrip />);
    expect(
      screen.getByText(/Everything you need to manage your money/i),
    ).toBeInTheDocument();
  });

  it('renders all three feature titles', () => {
    render(<FeatureStrip />);
    expect(screen.getByText(/Multi-currency/i)).toBeInTheDocument();
    expect(screen.getByText(/Smart reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Mobile-friendly/i)).toBeInTheDocument();
  });

  it('does not contain any iOS references', () => {
    render(<FeatureStrip />);
    expect(screen.queryByText(/ios/i)).toBeNull();
    expect(screen.queryByText(/iphone/i)).toBeNull();
  });

  it('has id="features" for in-page anchor links', () => {
    const { container } = render(<FeatureStrip />);
    expect(container.querySelector('#features')).toBeInTheDocument();
  });
});
