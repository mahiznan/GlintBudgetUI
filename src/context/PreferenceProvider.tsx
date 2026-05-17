import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usePreferences } from '../hooks/usePreferences';
import { PreferenceContext } from './PreferenceContext';

export function PreferenceProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : null;
  const { data, loading, error } = usePreferences(uid);

  return (
    <PreferenceContext.Provider value={{ preference: data, loading, error }}>
      {children}
    </PreferenceContext.Provider>
  );
}
