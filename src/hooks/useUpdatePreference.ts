import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/db';
import { useSyncStatus } from '../context/SyncStatusContext';
import type { BudgetData, Currency } from '../firestore/types';

export interface FirestorePreferencePartial {
  accounts?: BudgetData[];
  categories?: BudgetData[];
  subCategories?: BudgetData[];
  vendors?: BudgetData[];
  payments?: BudgetData[];
  archivedAccounts?: BudgetData[];
  default_currency?: Currency;
  frequent_currencies?: string[];
  default_entries?: Record<string, string>;
  theme?: string;
  spendingChartType?: 'bar' | 'line';
  layoutWidth?: 'fixed' | 'full';
}

function encodeDefaultEntries(entries: Record<string, string>): string[] {
  return Object.entries(entries).flatMap(([k, v]) => [k, v]);
}

export function useUpdatePreference(uid: string) {
  const { notifyWrite } = useSyncStatus();

  function mutate(partial: FirestorePreferencePartial): void {
    const firestoreData: Record<string, unknown> = { ...partial };
    if (partial.default_entries !== undefined) {
      firestoreData['default_entries'] = encodeDefaultEntries(partial.default_entries);
    }
    notifyWrite();
    void setDoc(doc(db, 'preference', uid), firestoreData, { merge: true });
  }

  return { mutate };
}
