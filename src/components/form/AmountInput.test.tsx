import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AmountInput from './AmountInput';

describe('AmountInput', () => {
  const baseProps = {
    value: '',
    onChange: vi.fn(),
    currencyCode: 'INR',
    currencySymbol: '₹',
    onCurrencyClick: vi.fn(),
  };

  it('renders the currency code in the badge', () => {
    render(<AmountInput {...baseProps} />);
    expect(screen.getByRole('button', { name: /currency/i })).toHaveTextContent('INR');
  });

  it('renders the amount input with placeholder 0.00', () => {
    render(<AmountInput {...baseProps} />);
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  it('calls onCurrencyClick when the currency badge is clicked', async () => {
    const user = userEvent.setup();
    const onCurrencyClick = vi.fn();
    render(<AmountInput {...baseProps} onCurrencyClick={onCurrencyClick} />);
    await user.click(screen.getByRole('button', { name: /currency/i }));
    expect(onCurrencyClick).toHaveBeenCalled();
  });

  it('calls onChange when the user types in the amount input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AmountInput {...baseProps} onChange={onChange} />);
    await user.type(screen.getByPlaceholderText('0.00'), '1250');
    expect(onChange).toHaveBeenCalled();
  });

  it('calls onNext when Enter is pressed in the amount input', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<AmountInput {...baseProps} value="100" onNext={onNext} />);
    await user.click(screen.getByPlaceholderText('0.00'));
    await user.keyboard('{Enter}');
    expect(onNext).toHaveBeenCalled();
  });

  it('renders an error message when error prop is provided', () => {
    render(<AmountInput {...baseProps} error="Amount is required" />);
    expect(screen.getByText('Amount is required')).toBeInTheDocument();
  });
});
