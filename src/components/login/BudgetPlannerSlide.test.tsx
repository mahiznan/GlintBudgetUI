import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BudgetPlannerSlide from './BudgetPlannerSlide';

describe('BudgetPlannerSlide', () => {
  it('renders the headline', () => {
    render(<BudgetPlannerSlide />);
    expect(screen.getByText(/plan your spend/i)).toBeInTheDocument();
    expect(screen.getByText(/own every dollar/i)).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<BudgetPlannerSlide />);
    expect(screen.getByText(/set category budgets/i)).toBeInTheDocument();
  });

  it('renders all four category names', () => {
    render(<BudgetPlannerSlide />);
    expect(screen.getByText(/groceries/i)).toBeInTheDocument();
    expect(screen.getByText(/bills/i)).toBeInTheDocument();
    expect(screen.getByText(/dining/i)).toBeInTheDocument();
    expect(screen.getByText(/shopping/i)).toBeInTheDocument();
  });

  it('renders the remaining footer text', () => {
    render(<BudgetPlannerSlide />);
    expect(screen.getByText(/\$255 remaining/i)).toBeInTheDocument();
  });
});
