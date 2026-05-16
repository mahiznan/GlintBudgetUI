import { render, screen } from '@testing-library/react';
import FeatureStrip from './FeatureStrip';

describe('FeatureStrip', () => {
  it('renders three features', () => {
    render(<FeatureStrip />);
    expect(screen.getByText(/Multi-currency/i)).toBeInTheDocument();
    expect(screen.getByText(/Smart reports/i)).toBeInTheDocument();
    expect(screen.getByText(/iOS, soon web/i)).toBeInTheDocument();
  });

  it('renders the per-transaction currency override description', () => {
    render(<FeatureStrip />);
    expect(
      screen.getByText(/Default currency with per-transaction overrides/i),
    ).toBeInTheDocument();
  });

  it('has id="features" for in-page anchor links', () => {
    const { container } = render(<FeatureStrip />);
    expect(container.querySelector('#features')).toBeInTheDocument();
  });
});
