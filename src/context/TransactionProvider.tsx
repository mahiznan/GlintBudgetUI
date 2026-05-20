import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { TransactionContext } from './TransactionContext';

export function TransactionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { data: transactions, loading, error, refetch } = useTransactions({ uid });

  return (
    <TransactionContext.Provider value={{ transactions, loading, error, refetch }}>
      {children}
    </TransactionContext.Provider>
  );
}
