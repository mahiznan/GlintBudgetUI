import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import FieldPicker from './FieldPicker';
import type { BudgetData } from '../../firestore/types';

const OPTIONS: BudgetData[] = [
  { name: 'Food', emoji: '🍔', type: 'category', parent: null },
  { name: 'Transport', emoji: '🚗', type: 'category', parent: null },
];

const baseProps = {
  label: 'Category',
  value: '',
  onChange: vi.fn(),
  options: OPTIONS,
  iconBg: '#fdf4ff',
  icon: '📂',
  isOpen: false,
  onOpen: vi.fn(),
  onClose: vi.fn(),
};

describe('FieldPicker', () => {
  it('renders the field label and placeholder when closed', () => {
    render(<FieldPicker {...baseProps} />);
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText(/select category/i)).toBeInTheDocument();
  });

  it('renders the selected value when one is set', () => {
    render(<FieldPicker {...baseProps} value="Food" />);
    expect(screen.getByText('Food')).toBeInTheDocument();
  });

  it('does NOT render the search input when isOpen is false', () => {
    render(<FieldPicker {...baseProps} />);
    expect(screen.queryByPlaceholderText(/search category/i)).not.toBeInTheDocument();
  });

  it('renders the search input when isOpen is true', () => {
    render(<FieldPicker {...baseProps} isOpen={true} />);
    expect(screen.getByPlaceholderText(/search category/i)).toBeInTheDocument();
  });

  it('calls onOpen when the row button is clicked', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<FieldPicker {...baseProps} onOpen={onOpen} />);
    await user.click(screen.getByRole('button', { name: /category/i }));
    expect(onOpen).toHaveBeenCalled();
  });

  it('calls onChange and onClose when a suggestion is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(<FieldPicker {...baseProps} isOpen={true} onChange={onChange} onClose={onClose} />);
    await user.click(screen.getByText('Food'));
    expect(onChange).toHaveBeenCalledWith('Food');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onNext after selecting a value', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<FieldPicker {...baseProps} isOpen={true} onNext={onNext} />);
    await user.click(screen.getByText('Food'));
    expect(onNext).toHaveBeenCalled();
  });

  it('renders an asterisk for required fields', () => {
    render(<FieldPicker {...baseProps} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders an error message when error prop is set', () => {
    render(<FieldPicker {...baseProps} error="Category is required" />);
    expect(screen.getByText('Category is required')).toBeInTheDocument();
  });
});
