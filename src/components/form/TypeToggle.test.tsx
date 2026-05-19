import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TypeToggle from './TypeToggle';

describe('TypeToggle', () => {
  it('renders both expense and income buttons', () => {
    render(<TypeToggle value="expense" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument();
  });

  it('calls onChange("income") when the income button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TypeToggle value="expense" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /income/i }));
    expect(onChange).toHaveBeenCalledWith('income');
  });

  it('calls onChange("expense") when the expense button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TypeToggle value="income" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /expense/i }));
    expect(onChange).toHaveBeenCalledWith('expense');
  });

  it('inactive button has data-inactive attribute for styling', () => {
    render(<TypeToggle value="expense" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /income/i })).toHaveAttribute('data-inactive', 'true');
    expect(screen.getByRole('button', { name: /expense/i })).not.toHaveAttribute('data-inactive');
  });
});
