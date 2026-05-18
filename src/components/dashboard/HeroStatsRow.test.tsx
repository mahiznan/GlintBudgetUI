import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HeroStatsRow from './HeroStatsRow';

const stats = {
  totalExpenses: 12500,
  totalIncome: 50000,
  currencySymbol: '₹',
};

describe('HeroStatsRow', () => {
  it('renders income and expenses labels', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.getByText(/expenses/i)).toBeInTheDocument();
    expect(screen.getByText(/income/i)).toBeInTheDocument();
  });

  it('does not render net balance or transactions', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.queryByText(/net balance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/transactions/i)).not.toBeInTheDocument();
  });

  it('formats amounts with currency symbol', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.getByText(/₹12,500/)).toBeInTheDocument();
    expect(screen.getByText(/₹50,000/)).toBeInTheDocument();
  });
});
