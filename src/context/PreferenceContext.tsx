import { createContext } from 'react';
import type { Preference } from '../firestore/types';

export interface PreferenceContextValue {
  preference: Preference | null;
  loading: boolean;
  error: Error | null;
}

export const PreferenceContext = createContext<PreferenceContextValue | null>(null);
