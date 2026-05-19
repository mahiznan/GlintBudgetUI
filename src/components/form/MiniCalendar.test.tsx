import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import MiniCalendar from './MiniCalendar';

describe('MiniCalendar', () => {
  it('renders the month and year of the given value', () => {
    render(<MiniCalendar value="2026-05-19" onChange={vi.fn()} activeType="expense" />);
    expect(screen.getByText(/may 2026/i)).toBeInTheDocument();
  });

  it('calls onChange with the YYYY-MM-DD string of the clicked day', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MiniCalendar value="2026-05-19" onChange={onChange} activeType="expense" />);
    // All day cells are buttons. Find the one whose text is exactly "20".
    const dayButtons = screen.getAllByRole('button').filter(
      (b) => !b.getAttribute('aria-label') && b.textContent === '20'
    );
    await user.click(dayButtons[0]!);
    expect(onChange).toHaveBeenCalledWith('2026-05-20');
  });

  it('advances to the next month when the next-month button is clicked', async () => {
    const user = userEvent.setup();
    render(<MiniCalendar value="2026-05-19" onChange={vi.fn()} activeType="expense" />);
    await user.click(screen.getByRole('button', { name: /next month/i }));
    expect(screen.getByText(/june 2026/i)).toBeInTheDocument();
  });

  it('retreats to the previous month when the previous-month button is clicked', async () => {
    const user = userEvent.setup();
    render(<MiniCalendar value="2026-05-19" onChange={vi.fn()} activeType="expense" />);
    await user.click(screen.getByRole('button', { name: /previous month/i }));
    expect(screen.getByText(/april 2026/i)).toBeInTheDocument();
  });

  it('applies the income gradient to the selected day when activeType is income', () => {
    const { container } = render(
      <MiniCalendar value="2026-05-19" onChange={vi.fn()} activeType="income" />
    );
    // Find all day buttons and filter for the one with text content "19" (the selected day)
    const dayButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) => !b.getAttribute('aria-label') && b.textContent === '19'
    );
    const selectedButton = dayButtons[0];
    expect(selectedButton).toBeDefined();
    // Check that the selected day has the income gradient applied
    const style = selectedButton!.getAttribute('style');
    expect(style).toContain('var(--brand-gradient)');
  });
});
