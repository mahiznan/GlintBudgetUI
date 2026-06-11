import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TransactionChip from './TransactionChip';

describe('TransactionChip', () => {
  it('renders the label and amount', () => {
    render(<TransactionChip emoji="☕" label="Coffee" amount="-$4.20" />);
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('-$4.20')).toBeInTheDocument();
  });
});
