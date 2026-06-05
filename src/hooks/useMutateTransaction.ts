import { collection, doc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/db';
import { useSyncStatus } from '../context/SyncStatusContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useUpdatePreference } from './useUpdatePreference';
import type { Transaction, BudgetData } from '../firestore/types';

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

export function useAddTransaction(uid: string) {
  const { notifyWrite } = useSyncStatus();
  const { preference } = usePreferenceContext();
  const { mutate: updatePreference } = useUpdatePreference(uid);

  function mutate(tx: TxInput): string {
    const id = crypto.randomUUID();
    notifyWrite();

    // Trim vendor name (remove leading/trailing whitespace)
    const trimmedVendor = tx.vendor.trim();

    // Check if vendor exists in preferences (case-insensitive)
    if (
      preference &&
      !vendorExists(
        trimmedVendor,
        (preference.vendors ?? []) as unknown as Array<{ name: string; [key: string]: unknown }>,
      )
    ) {
      // Auto-add vendor to preferences with original casing
      const newVendor: BudgetData = {
        name: trimmedVendor,
        emoji: '🏪',
        type: 'vendor',
        parent: null,
      };
      const updatedVendors = [...(preference.vendors ?? []), newVendor];
      updatePreference({ vendors: updatedVendors });
    }

    // Save transaction with trimmed vendor (original casing)
    const txWithTrimmedVendor = { ...tx, vendor: trimmedVendor };
    void setDoc(
      doc(collection(db, 'transactions'), id),
      encodeTransaction(id, txWithTrimmedVendor),
    );
    return id;
  }

  return { mutate };
}

export function useUpdateTransaction(uid: string) {
  const { notifyWrite } = useSyncStatus();
  const { preference } = usePreferenceContext();
  const { mutate: updatePreference } = useUpdatePreference(uid);

  function mutate(id: string, patch: TxPatch): void {
    notifyWrite();

    // If patch includes vendor, trim it
    if (patch.vendor !== undefined) {
      const trimmedVendor = patch.vendor.trim();

      // Check if vendor exists in preferences (case-insensitive)
      if (
        preference &&
        !vendorExists(
          trimmedVendor,
          (preference.vendors ?? []) as unknown as Array<{ name: string; [key: string]: unknown }>,
        )
      ) {
        // Auto-add vendor to preferences with original casing
        const newVendor: BudgetData = {
          name: trimmedVendor,
          emoji: '🏪',
          type: 'vendor',
          parent: null,
        };
        const updatedVendors = [...(preference.vendors ?? []), newVendor];
        updatePreference({ vendors: updatedVendors });
      }

      // Update patch with trimmed vendor (original casing)
      patch = { ...patch, vendor: trimmedVendor };
    }

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
