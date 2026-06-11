import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CategoryDonut from './CategoryDonut';
import { LOGIN_CATEGORIES, LOGIN_TOTAL } from './demoData';

describe('CategoryDonut', () => {
  it('renders the total and a conic-gradient image', () => {
    render(<CategoryDonut data={LOGIN_CATEGORIES} total={LOGIN_TOTAL} />);
    expect(screen.getByText('$1,250')).toBeInTheDocument();
    const img = screen.getByRole('img', { name: /spending breakdown/i });
    expect(img.style.background).toContain('conic-gradient');
  });
});
