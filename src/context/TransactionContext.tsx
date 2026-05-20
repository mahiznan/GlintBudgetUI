/* eslint-disable react-refresh/only-export-components */
import { createContext } from 'react';
import type { Transaction } from '../firestore/types';

export interface TransactionContextValue {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const TransactionContext = createContext<TransactionContextValue | null>(null);

export { TransactionProvider } from './TransactionProvider';
export { useTransactionContext } from './useTransactionContext';
