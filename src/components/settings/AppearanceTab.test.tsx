import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

vi.mock('../../context/ThemeContext', () => ({ useTheme: vi.fn() }));
vi.mock('../../context/LayoutContext', () => ({ useLayout: vi.fn() }));

import { useTheme } from '../../context/ThemeContext';
import { useLayout } from '../../context/LayoutContext';
import AppearanceTab from './AppearanceTab';

function setup(themeId = 'lime', layoutWidth: 'fixed' | 'full' = 'fixed') {
  const setTheme = vi.fn().mockResolvedValue(undefined);
  const setLayoutWidth = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useTheme).mockReturnValue({ themeId, setTheme });
  vi.mocked(useLayout).mockReturnValue({ layoutWidth, setLayoutWidth });
  return { setTheme, setLayoutWidth };
}

describe('AppearanceTab — theme', () => {
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
    const { setTheme } = setup('lime');
    render(<AppearanceTab />);
    fireEvent.click(screen.getByText(/Ocean/).closest('button')!);
    expect(setTheme).toHaveBeenCalledWith('ocean');
  });
});

describe('AppearanceTab — layout width', () => {
  it('renders both layout width cards', () => {
    setup();
    render(<AppearanceTab />);
    expect(screen.getByText('Fixed width')).toBeInTheDocument();
    expect(screen.getByText('Full width')).toBeInTheDocument();
  });

  it('active layout card shows ✓ indicator', () => {
    setup('lime', 'full');
    render(<AppearanceTab />);
    const fullBtn = screen.getByText('Full width').closest('button')!;
    expect(fullBtn).toHaveTextContent('✓');
  });

  it('inactive layout card does not show ✓', () => {
    setup('lime', 'full');
    render(<AppearanceTab />);
    const fixedBtn = screen.getByText('Fixed width').closest('button')!;
    expect(fixedBtn).not.toHaveTextContent('✓');
  });

  it('clicking a layout card calls setLayoutWidth with its id', () => {
    const { setLayoutWidth } = setup('lime', 'fixed');
    render(<AppearanceTab />);
    fireEvent.click(screen.getByText('Full width').closest('button')!);
    expect(setLayoutWidth).toHaveBeenCalledWith('full');
  });
});
