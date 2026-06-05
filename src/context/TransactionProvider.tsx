import { useEffect, useMemo, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { useSyncStatus } from './SyncStatusContext';
import { TransactionContext } from './TransactionContext';
import { usePreferenceContext } from './PreferenceContext';

export function TransactionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { notifySnapshot } = useSyncStatus();
  const { preference } = usePreferenceContext() ?? { preference: null };
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';

  // Premium users: load all transactions (no date limit)
  // Non-premium users: load only transactions from this year
  const start = useMemo(() => {
    if (preference?.premium) {
      return undefined; // No date limit for premium users
    }
    // For non-premium users, show transactions from January 1st of current year
    return new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
  }, [preference?.premium]);

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
