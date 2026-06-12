import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

vi.mock('../../context/ThemeContext', () => ({ useTheme: vi.fn() }));
vi.mock('../../context/LayoutContext', () => ({ useLayout: vi.fn() }));
vi.mock('../../context/ColorModeContext', () => ({ useColorMode: vi.fn() }));

import { useTheme } from '../../context/ThemeContext';
import { useLayout } from '../../context/LayoutContext';
import { useColorMode } from '../../context/ColorModeContext';
import AppearanceTab from './AppearanceTab';

function setup(
  themeId = 'lime',
  layoutWidth: 'fixed' | 'full' = 'fixed',
  mode: 'system' | 'light' | 'dark' = 'light',
) {
  const setTheme = vi.fn().mockResolvedValue(undefined);
  const setLayoutWidth = vi.fn().mockResolvedValue(undefined);
  const setMode = vi.fn();
  vi.mocked(useTheme).mockReturnValue({ themeId, setTheme });
  vi.mocked(useLayout).mockReturnValue({ layoutWidth, setLayoutWidth });
  vi.mocked(useColorMode).mockReturnValue({
    mode,
    resolvedMode: mode === 'dark' ? 'dark' : 'light',
    setMode,
  });
  return { setTheme, setLayoutWidth, setMode };
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

describe('AppearanceTab — color mode', () => {
  it('renders System, Light, and Dark options', () => {
    setup();
    render(<AppearanceTab />);
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });

  it('marks the active mode with the ✓ indicator', () => {
    setup('lime', 'fixed', 'dark');
    render(<AppearanceTab />);
    const darkBtn = screen.getByText('Dark').closest('button')!;
    expect(darkBtn).toHaveTextContent('✓');
    const lightBtn = screen.getByText('Light').closest('button')!;
    expect(lightBtn).not.toHaveTextContent('✓');
  });

  it('clicking a mode calls setMode with its id', () => {
    const { setMode } = setup('lime', 'fixed', 'light');
    render(<AppearanceTab />);
    fireEvent.click(screen.getByText('Dark').closest('button')!);
    expect(setMode).toHaveBeenCalledWith('dark');
  });
});
