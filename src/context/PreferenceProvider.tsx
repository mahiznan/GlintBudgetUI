import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usePreferences } from '../hooks/usePreferences';
import { useSyncStatus } from './SyncStatusContext';
import { PreferenceContext } from './PreferenceContext';

export function PreferenceProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { notifySnapshot } = useSyncStatus();
  const uid = auth.status === 'authenticated' ? auth.user.uid : null;
  const { data, loading, error, hasPendingWrites } = usePreferences(uid);

  useEffect(() => {
    notifySnapshot(hasPendingWrites);
  }, [hasPendingWrites, notifySnapshot]);

  return (
    <PreferenceContext.Provider value={{ preference: data, loading, error }}>
      {children}
    </PreferenceContext.Provider>
  );
}
