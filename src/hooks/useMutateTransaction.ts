import { useTransactionContext } from '../context/useTransactionContext';
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

export function vendorExists(
  name: string,
  vendors: Array<{ name: string; [key: string]: unknown }>,
): boolean {
  const lowerName = name.toLowerCase();
  return vendors.some((vendor) => vendor.name.toLowerCase() === lowerName);
}

export function useAddTransaction(uid: string) {
  const { addTransaction } = useTransactionContext();
  const { preference } = usePreferenceContext();
  const { mutate: updatePreference } = useUpdatePreference(uid);

  function mutate(tx: TxInput): string {
    const trimmedVendor = tx.vendor.trim();
    if (
      preference &&
      !vendorExists(
        trimmedVendor,
        (preference.vendors ?? []) as unknown as Array<{ name: string; [key: string]: unknown }>,
      )
    ) {
      const newVendor: BudgetData = {
        name: trimmedVendor,
        emoji: '🏪',
        type: 'vendor',
        parent: null,
      };
      updatePreference({ vendors: [...(preference.vendors ?? []), newVendor] });
    }
    return addTransaction({ ...tx, vendor: trimmedVendor });
  }

  return { mutate };
}

export function useUpdateTransaction(uid: string) {
  const { updateTransaction } = useTransactionContext();
  const { preference } = usePreferenceContext();
  const { mutate: updatePreference } = useUpdatePreference(uid);

  function mutate(id: string, patch: TxPatch): void {
    if (patch.vendor !== undefined) {
      const trimmedVendor = patch.vendor.trim();
      if (
        preference &&
        !vendorExists(
          trimmedVendor,
          (preference.vendors ?? []) as unknown as Array<{ name: string; [key: string]: unknown }>,
        )
      ) {
        const newVendor: BudgetData = {
          name: trimmedVendor,
          emoji: '🏪',
          type: 'vendor',
          parent: null,
        };
        updatePreference({ vendors: [...(preference.vendors ?? []), newVendor] });
      }
      patch = { ...patch, vendor: trimmedVendor };
    }
    updateTransaction(id, patch);
  }

  return { mutate };
}

export function useDeleteTransaction() {
  const { deleteTransaction } = useTransactionContext();

  function mutate(id: string): void {
    deleteTransaction(id);
  }

  return { mutate };
}
