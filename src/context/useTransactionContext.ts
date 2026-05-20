import { useContext } from 'react';
import { TransactionContext } from './TransactionContext';
import type { TransactionContextValue } from './TransactionContext';

export function useTransactionContext(): TransactionContextValue {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransactionContext must be used within TransactionProvider');
  return ctx;
}
