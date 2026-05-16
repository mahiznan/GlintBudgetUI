import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders Header with wordmark', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders Hero with tagline', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', {
        name: /Track every dollar\.\s*Across every currency\./i,
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  it('renders FeatureStrip with three features', () => {
    render(<App />);
    expect(screen.getByText(/Multi-currency/i)).toBeInTheDocument();
    expect(screen.getByText(/Smart reports/i)).toBeInTheDocument();
    expect(screen.getByText(/iOS, soon web/i)).toBeInTheDocument();
  });

  it('renders Footer', () => {
    render(<App />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
