import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TypeToggle from './TypeToggle';

describe('TypeToggle', () => {
  it('renders Expense and Income buttons', () => {
    render(<TypeToggle value="expense" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument();
  });

  it('calls onChange when Income clicked', async () => {
    const onChange = vi.fn();
    render(<TypeToggle value="expense" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /income/i }));
    expect(onChange).toHaveBeenCalledWith('income');
  });
});
