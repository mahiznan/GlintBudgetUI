import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

vi.mock('../../context/ThemeContext', () => ({ useTheme: vi.fn() }));

import { useTheme } from '../../context/ThemeContext';
import AppearanceTab from './AppearanceTab';

function setup(themeId = 'lime') {
  const setTheme = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useTheme).mockReturnValue({ themeId, setTheme });
  return setTheme;
}

describe('AppearanceTab', () => {
  it('renders all 4 theme swatches', () => {
    setup();
    render(<AppearanceTab />);
    expect(screen.getByText(/Lime/)).toBeInTheDocument();
    expect(screen.getByText(/Forest/)).toBeInTheDocument();
    expect(screen.getByText(/Ocean/)).toBeInTheDocument();
    expect(screen.getByText(/Amber/)).toBeInTheDocument();
  });

  it('active theme swatch shows ✓ indicator', () => {
    setup('forest');
    render(<AppearanceTab />);
    const forestBtn = screen.getByText(/Forest/).closest('button')!;
    expect(forestBtn).toHaveTextContent('✓');
  });

  it('inactive theme swatches do not show ✓', () => {
    setup('forest');
    render(<AppearanceTab />);
    const limeBtn = screen.getByText(/Lime/).closest('button')!;
    expect(limeBtn).not.toHaveTextContent('✓');
  });

  it('clicking a swatch calls setTheme with its id', () => {
    const setTheme = setup('lime');
    render(<AppearanceTab />);
    fireEvent.click(screen.getByText(/Ocean/).closest('button')!);
    expect(setTheme).toHaveBeenCalledWith('ocean');
  });
});
