import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CategoryBars from './CategoryBars';
import { LOGIN_CATEGORIES } from './demoData';

describe('CategoryBars', () => {
  it('renders a row per category with its amount', () => {
    render(<CategoryBars data={LOGIN_CATEGORIES} />);
    expect(screen.getByText(/Groceries/)).toBeInTheDocument();
    expect(screen.getByText('$420')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(LOGIN_CATEGORIES.length);
  });
});
