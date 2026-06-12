/* eslint-disable react-refresh/only-export-components */
import { createContext } from 'react';
import type { Transaction } from '../firestore/types';

export interface TransactionContextValue {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
  addTransaction: (tx: Omit<Transaction, 'id'>) => string;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void;
  deleteTransaction: (id: string) => void;
  loadYear: (year: number) => Promise<void>;
}

export const TransactionContext = createContext<TransactionContextValue | null>(null);

export { TransactionProvider } from './TransactionProvider';
export { useTransactionContext } from './useTransactionContext';
