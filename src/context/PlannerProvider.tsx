import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usePlanners } from '../hooks/usePlanners';
import { useSyncStatus } from './SyncStatusContext';
import { PlannerContext } from './PlannerContext';

export function PlannerProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { notifySnapshot } = useSyncStatus();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { planners, loading, error, hasPendingWrites } = usePlanners(uid);

  useEffect(() => {
    notifySnapshot(hasPendingWrites);
  }, [hasPendingWrites, notifySnapshot]);

  return (
    <PlannerContext.Provider value={{ planners, loading, error, hasPendingWrites }}>
      {children}
    </PlannerContext.Provider>
  );
}
