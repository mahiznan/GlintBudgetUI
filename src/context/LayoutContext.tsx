import { createContext, useContext } from 'react';

export interface LayoutContextValue {
  layoutWidth: 'fixed' | 'full';
  setLayoutWidth: (w: 'fixed' | 'full') => void;
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used inside LayoutProvider');
  return ctx;
}
