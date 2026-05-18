import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usePreferences } from '../hooks/usePreferences';
import { PreferenceContext } from './PreferenceContext';

export function PreferenceProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : null;
  const { data, loading, error, refetch } = usePreferences(uid);

  return (
    <PreferenceContext.Provider value={{ preference: data, loading, error, refetch }}>
      {children}
    </PreferenceContext.Provider>
  );
}
