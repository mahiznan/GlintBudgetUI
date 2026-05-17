import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AmountInput from './AmountInput';

describe('AmountInput', () => {
  it('renders with currency symbol', () => {
    render(<AmountInput value="" onChange={vi.fn()} currencySymbol="₹" />);
    expect(screen.getByText('₹')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('shows error message when provided', () => {
    render(<AmountInput value="" onChange={vi.fn()} currencySymbol="₹" error="Amount is required" />);
    expect(screen.getByText('Amount is required')).toBeInTheDocument();
  });

  it('calls onChange with typed value', async () => {
    const onChange = vi.fn();
    render(<AmountInput value="" onChange={onChange} currencySymbol="₹" />);
    await userEvent.type(screen.getByRole('spinbutton'), '500');
    expect(onChange).toHaveBeenCalled();
  });
});
