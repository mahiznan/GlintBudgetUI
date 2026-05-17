import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HeroStatsRow from './HeroStatsRow';

const stats = {
  totalExpenses: 12500,
  totalIncome: 50000,
  netBalance: 37500,
  txCount: 24,
  currencySymbol: '₹',
};

describe('HeroStatsRow', () => {
  it('renders all four stat labels', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.getByText(/expenses/i)).toBeInTheDocument();
    expect(screen.getByText(/income/i)).toBeInTheDocument();
    expect(screen.getByText(/net balance/i)).toBeInTheDocument();
    expect(screen.getByText(/transactions/i)).toBeInTheDocument();
  });

  it('formats amounts with currency symbol', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.getByText(/₹12,500/)).toBeInTheDocument();
    expect(screen.getByText(/₹50,000/)).toBeInTheDocument();
  });

  it('shows transaction count', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.getByText('24')).toBeInTheDocument();
  });
});
