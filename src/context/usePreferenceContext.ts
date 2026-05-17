import { useContext } from 'react';
import { PreferenceContext, type PreferenceContextValue } from './PreferenceContext';

export function usePreferenceContext(): PreferenceContextValue {
  const ctx = useContext(PreferenceContext);
  if (!ctx) {
    throw new Error('usePreferenceContext must be used within PreferenceProvider');
  }
  return ctx;
}
