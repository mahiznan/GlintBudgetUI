import { useEffect, useMemo, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { useSyncStatus } from './SyncStatusContext';
import { TransactionContext } from './TransactionContext';

export function TransactionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { notifySnapshot } = useSyncStatus();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';

  const start = useMemo(() => new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0), []);

  const { data: transactions, loading, error, hasPendingWrites } = useTransactions({ uid, start });

  useEffect(() => {
    notifySnapshot(hasPendingWrites);
  }, [hasPendingWrites, notifySnapshot]);

  return (
    <TransactionContext.Provider value={{ transactions, loading, error, hasPendingWrites }}>
      {children}
    </TransactionContext.Provider>
  );
}
