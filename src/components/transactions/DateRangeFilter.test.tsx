import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DateRangeFilter from './DateRangeFilter';

describe('DateRangeFilter', () => {
  it('renders period tab buttons', () => {
    render(<DateRangeFilter period="month" onPeriodChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /week/i })).toBeInTheDocument();
  });

  it('marks active period tab', () => {
    render(<DateRangeFilter period="week" onPeriodChange={vi.fn()} />);
    const weekBtn = screen.getByRole('button', { name: /week/i });
    expect(weekBtn.className).toMatch(/text-white/);
  });

  it('calls onPeriodChange when clicked', async () => {
    const onChange = vi.fn();
    render(<DateRangeFilter period="month" onPeriodChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /year/i }));
    expect(onChange).toHaveBeenCalledWith('year');
  });
});
