import { useEffect, useReducer } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type QueryConstraint,
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
  hasPendingWrites: boolean;
}

type State = {
  data: Transaction[];
  loading: boolean;
  error: Error | null;
  hasPendingWrites: boolean;
};

type Action =
  | { type: 'fetch' }
  | { type: 'success'; data: Transaction[]; hasPendingWrites: boolean }
  | { type: 'error'; error: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'fetch':
      return { ...state, loading: true, error: null };
    case 'success':
      return {
        ...state,
        loading: false,
        data: action.data,
        hasPendingWrites: action.hasPendingWrites,
      };
    case 'error':
      return { ...state, loading: false, error: action.error };
  }
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
  const [state, dispatch] = useReducer(reducer, {
    data: [],
    loading: !!filter.uid,
    error: null,
    hasPendingWrites: false,
  });

  useEffect(() => {
    if (!filter.uid) return;
    dispatch({ type: 'fetch' });

    const col = collection(db, 'transactions');
    const constraints: QueryConstraint[] = [
      where('user_id', '==', filter.uid),
      orderBy('date', 'desc'),
    ];

    if (filter.start) constraints.push(where('date', '>=', filter.start));
    if (filter.end) constraints.push(where('date', '<=', filter.end));
    if (filter.limit) constraints.push(limit(filter.limit));

    const q = query(col, ...constraints);

    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        dispatch({
          type: 'success',
          data: snap.docs.map((d) => docToTransaction(d.id, d.data())),
          hasPendingWrites: snap.metadata.hasPendingWrites,
        });
      },
      (err) => dispatch({ type: 'error', error: err }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.uid, filter.start?.getTime(), filter.end?.getTime(), filter.limit]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    hasPendingWrites: state.hasPendingWrites,
  };
}
