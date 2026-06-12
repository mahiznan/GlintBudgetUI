import { createContext, useContext } from 'react';
import type { ColorMode, ResolvedMode } from '../lib/colorMode';

export interface ColorModeContextValue {
  /** The user's stored selection. */
  mode: ColorMode;
  /** The concrete mode currently applied (system collapsed to light/dark). */
  resolvedMode: ResolvedMode;
  setMode: (mode: ColorMode) => void;
}

export const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error('useColorMode must be used inside ColorModeProvider');
  return ctx;
}
