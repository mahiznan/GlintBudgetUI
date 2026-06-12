/* eslint-disable react-refresh/only-export-components */
import { createContext } from 'react';
import type { Preference } from '../firestore/types';
import type { FirestorePreferencePartial } from '../hooks/useUpdatePreference';

export interface PreferenceContextValue {
  preference: Preference | null;
  loading: boolean;
  error: Error | null;
  applyPreferenceUpdate: (partial: FirestorePreferencePartial) => void;
}

export const PreferenceContext = createContext<PreferenceContextValue | null>(null);

export { PreferenceProvider } from './PreferenceProvider';
export { usePreferenceContext } from './usePreferenceContext';
