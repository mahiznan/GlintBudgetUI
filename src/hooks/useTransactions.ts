import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase/db';
import type { Transaction } from '../firestore/types';

export interface TransactionFilter {
  uid: string;
  start?: Date;
  end?: Date;
  limit?: number;
}

interface UseTransactionsResult {
  data: Transaction[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function docToTransaction(id: string, raw: DocumentData): Transaction {
  return {
    id,
    user_id: raw['user_id'] as string,
    category: raw['category'] as string,
    subCategory: raw['sub_category'] as string,
    date: (raw['date'] as { toDate(): Date }).toDate(),
    account: raw['account'] as string,
    vendor: raw['vendor'] as string,
    payment: raw['payment'] as string,
    currency: raw['currency'] as string,
    notes: (raw['notes'] as string) ?? '',
    amount: raw['amount'] as number,
    icon: (raw['icon'] as string) ?? '',
  };
}

export function useTransactions(filter: TransactionFilter): UseTransactionsResult {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    const col = collection(db, 'transactions');
    const constraints = [
      where('user_id', '==', filter.uid),
      orderBy('date', 'desc'),
    ];

    if (filter.start) constraints.push(where('date', '>=', filter.start));
    if (filter.end) constraints.push(where('date', '<=', filter.end));
    if (filter.limit) constraints.push(limit(filter.limit));

    const q = query(col, ...constraints);

    getDocs(q)
      .then((snap) => {
        setData(snap.docs.map((d) => docToTransaction(d.id, d.data())));
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err : new Error(String(err))),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.uid, filter.start?.getTime(), filter.end?.getTime(), filter.limit, tick]);

  return { data, loading, error, refetch: () => setTick((n) => n + 1) };
}
