import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'lime', setTheme: vi.fn() }),
}));

import CategoryBreakdown from './CategoryBreakdown';
import type { CategoryItem } from './CategoryBreakdown';

const makeCategory = (name: string, total: number, pct: number): CategoryItem => ({
  name,
  icon: '🛒',
  total,
  pct,
});

describe('CategoryBreakdown', () => {
  it('renders By Category heading', () => {
    render(
      <CategoryBreakdown categories={[]} mode="expense" onModeChange={vi.fn()} currencySymbol="₹" />
    );
    expect(screen.getByText(/by category/i)).toBeInTheDocument();
  });

  it('renders Expense and Income toggle buttons', () => {
    render(
      <CategoryBreakdown categories={[]} mode="expense" onModeChange={vi.fn()} currencySymbol="₹" />
    );
    expect(screen.getByRole('button', { name: /expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument();
  });

  it('active expense button uses expense gradient, not bg-red-600', () => {
    render(
      <CategoryBreakdown categories={[]} mode="expense" onModeChange={vi.fn()} currencySymbol="₹" />
    );
    const btn = screen.getByRole('button', { name: /expense/i });
    expect(btn).not.toHaveClass('bg-red-600');
    expect(btn.style.background).toBe('var(--expense-gradient)');
  });

  it('active income button uses brand gradient', () => {
    render(
      <CategoryBreakdown categories={[]} mode="income" onModeChange={vi.fn()} currencySymbol="₹" />
    );
    const btn = screen.getByRole('button', { name: /income/i });
    expect(btn.style.background).toBe('var(--brand-gradient)');
  });

  it('renders provided categories', () => {
    const cats = [makeCategory('Food', 1500, 60), makeCategory('Transport', 600, 24)];
    render(
      <CategoryBreakdown categories={cats} mode="expense" onModeChange={vi.fn()} currencySymbol="₹" />
    );
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('calls onModeChange with "income" when Income button is clicked', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(
      <CategoryBreakdown categories={[]} mode="expense" onModeChange={onModeChange} currencySymbol="₹" />
    );
    await user.click(screen.getByRole('button', { name: /income/i }));
    expect(onModeChange).toHaveBeenCalledWith('income');
  });

  it('shows expense empty state when mode is expense and categories is empty', () => {
    render(
      <CategoryBreakdown categories={[]} mode="expense" onModeChange={vi.fn()} currencySymbol="₹" />
    );
    expect(screen.getByText(/no expenses for this period/i)).toBeInTheDocument();
  });

  it('shows income empty state when mode is income and categories is empty', () => {
    render(
      <CategoryBreakdown categories={[]} mode="income" onModeChange={vi.fn()} currencySymbol="₹" />
    );
    expect(screen.getByText(/no income for this period/i)).toBeInTheDocument();
  });
});
