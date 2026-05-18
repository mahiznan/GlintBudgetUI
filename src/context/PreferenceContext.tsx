/* eslint-disable react-refresh/only-export-components */
import { createContext } from 'react';
import type { Preference } from '../firestore/types';

export interface PreferenceContextValue {
  preference: Preference | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const PreferenceContext = createContext<PreferenceContextValue | null>(null);

export { PreferenceProvider } from './PreferenceProvider';
export { usePreferenceContext } from './usePreferenceContext';
