import { collection, doc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/db';
import { useSyncStatus } from '../context/SyncStatusContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import type { Transaction } from '../firestore/types';

type TxInput = Omit<Transaction, 'id'>;
type TxPatch = Partial<Omit<Transaction, 'id'>>;

export function toTitleCase(str: string): string {
  const trimmed = str.trim();
  if (!trimmed) return '';

  return trimmed
    .split(' ')
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function vendorExists(name: string, vendors: Array<{ name: string; [key: string]: unknown }>): boolean {
  const lowerName = name.toLowerCase();
  return vendors.some((vendor) => vendor.name.toLowerCase() === lowerName);
}

function encodeTransaction(id: string, tx: TxInput): Record<string, unknown> {
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

function encodePatch(patch: TxPatch): Record<string, unknown> {
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

export function useAddTransaction(
  // @ts-expect-error - uid will be used in Task 4
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  uid: string,
) {
  const { notifyWrite } = useSyncStatus();
  // @ts-expect-error - preference will be used in Task 4
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { preference } = usePreferenceContext();

  function mutate(tx: TxInput): string {
    const id = crypto.randomUUID();
    notifyWrite();
    void setDoc(doc(collection(db, 'transactions'), id), encodeTransaction(id, tx));
    return id;
  }

  return { mutate };
}

export function useUpdateTransaction(
  // @ts-expect-error - uid will be used in Task 4
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  uid: string,
) {
  const { notifyWrite } = useSyncStatus();
  // @ts-expect-error - preference will be used in Task 4
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { preference } = usePreferenceContext();

  function mutate(id: string, patch: TxPatch): void {
    notifyWrite();
    void updateDoc(doc(db, 'transactions', id), encodePatch(patch));
  }

  return { mutate };
}

export function useDeleteTransaction() {
  const { notifyWrite } = useSyncStatus();

  function mutate(id: string): void {
    notifyWrite();
    void deleteDoc(doc(db, 'transactions', id));
  }

  return { mutate };
}
