import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FieldPicker from './FieldPicker';

const opts = [
  { name: 'HDFC', emoji: '🏦', type: 'account', parent: null },
  { name: 'SBI', emoji: null, type: 'account', parent: null },
];

describe('FieldPicker', () => {
  it('renders label and options', () => {
    render(<FieldPicker label="Account" value="" onChange={vi.fn()} options={opts} />);
    expect(screen.getByLabelText(/account/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /HDFC/i })).toBeInTheDocument();
  });

  it('shows required asterisk when required=true', () => {
    render(<FieldPicker label="Account" value="" onChange={vi.fn()} options={opts} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
