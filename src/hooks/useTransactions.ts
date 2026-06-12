import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
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

export function docToTransaction(id: string, raw: DocumentData): Transaction {
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

export async function fetchTransactions(filter: TransactionFilter): Promise<Transaction[]> {
  if (!filter.uid) return [];
  const col = collection(db, 'transactions');
  const constraints: QueryConstraint[] = [
    where('user_id', '==', filter.uid),
    orderBy('date', 'desc'),
  ];
  if (filter.start) constraints.push(where('date', '>=', filter.start));
  if (filter.end) constraints.push(where('date', '<=', filter.end));
  if (filter.limit) constraints.push(limit(filter.limit));
  const snap = await getDocs(query(col, ...constraints));
  return snap.docs.map((d) => docToTransaction(d.id, d.data()));
}
