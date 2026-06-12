import { useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/db';
import { useAuth } from '../auth/AuthContext';
import { useSyncStatus } from './SyncStatusContext';
import { fetchTransactions } from '../hooks/useTransactions';
import { TransactionContext, type TransactionContextValue } from './TransactionContext';
import type { Transaction } from '../firestore/types';

function encodeTransaction(id: string, tx: Omit<Transaction, 'id'>): Record<string, unknown> {
  return {
    id,
    user_id: tx.user_id,
    category: tx.category,
    sub_category: tx.subCategory,
    date: Timestamp.fromDate(tx.date),
    account: tx.account,
    vendor: tx.vendor,
    payment: tx.payment,
    currency: tx.currency,
    notes: tx.notes,
    amount: tx.amount,
    icon: tx.icon,
  };
}

function encodePatch(
  patch: Partial<Omit<Transaction, 'id'>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.user_id !== undefined) out['user_id'] = patch.user_id;
  if (patch.category !== undefined) out['category'] = patch.category;
  if (patch.subCategory !== undefined) out['sub_category'] = patch.subCategory;
  if (patch.date !== undefined) out['date'] = Timestamp.fromDate(patch.date);
  if (patch.account !== undefined) out['account'] = patch.account;
  if (patch.vendor !== undefined) out['vendor'] = patch.vendor;
  if (patch.payment !== undefined) out['payment'] = patch.payment;
  if (patch.currency !== undefined) out['currency'] = patch.currency;
  if (patch.notes !== undefined) out['notes'] = patch.notes;
  if (patch.amount !== undefined) out['amount'] = patch.amount;
  if (patch.icon !== undefined) out['icon'] = patch.icon;
  return out;
}

export function TransactionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { notifyWrite, notifySynced } = useSyncStatus();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const isPremium =
    auth.status === 'authenticated' ? (auth.user.user_isPremium ?? false) : false;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadYear = useCallback(
    async (year: number) => {
      if (!uid) return;
      setLoading(true);
      setError(null);
      try {
        const start = new Date(year, 0, 1);
        const end = isPremium
          ? undefined
          : new Date(year, 11, 31, 23, 59, 59, 999);
        const loaded = await fetchTransactions({ uid, start, end });
        setTransactions(loaded);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    },
    [uid, isPremium],
  );

  useEffect(() => {
    if (!uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTransactions([]);
      return;
    }
    void loadYear(new Date().getFullYear());
  }, [uid, loadYear]);

  const addTransaction = useCallback(
    (tx: Omit<Transaction, 'id'>): string => {
      const id = crypto.randomUUID();
      const newTx: Transaction = { ...tx, id };
      setTransactions((prev) =>
        [newTx, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()),
      );
      notifyWrite();
      void setDoc(doc(collection(db, 'transactions'), id), encodeTransaction(id, tx))
        .then(() => notifySynced())
        .catch(() => setTransactions((prev) => prev.filter((t) => t.id !== id)));
      return id;
    },
    [notifyWrite, notifySynced],
  );

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Omit<Transaction, 'id'>>): void => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
      notifyWrite();
      void updateDoc(doc(db, 'transactions', id), encodePatch(patch)).then(
        () => notifySynced(),
      );
    },
    [notifyWrite, notifySynced],
  );

  const deleteTransaction = useCallback(
    (id: string): void => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      notifyWrite();
      void deleteDoc(doc(db, 'transactions', id)).then(() => notifySynced());
    },
    [notifyWrite, notifySynced],
  );

  const value: TransactionContextValue = {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    loadYear,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}
