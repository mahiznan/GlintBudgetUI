import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { useSyncStatus } from './SyncStatusContext';
import { TransactionContext } from './TransactionContext';

export function TransactionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { notifySnapshot } = useSyncStatus();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { data: transactions, loading, error, hasPendingWrites } = useTransactions({ uid });

  useEffect(() => {
    notifySnapshot(hasPendingWrites);
  }, [hasPendingWrites, notifySnapshot]);

  return (
    <TransactionContext.Provider value={{ transactions, loading, error, hasPendingWrites }}>
      {children}
    </TransactionContext.Provider>
  );
}
