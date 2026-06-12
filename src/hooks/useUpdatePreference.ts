import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/db';
import { useSyncStatus } from '../context/SyncStatusContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import type { BudgetData, Currency } from '../firestore/types';
import type { Period } from '../lib/dateUtils';

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
  colorMode?: 'system' | 'light' | 'dark';
  spendingChartType?: 'bar' | 'line';
  defaultPeriod?: Period;
  layoutWidth?: 'fixed' | 'full';
}

export function useUpdatePreference(uid: string) {
  const { notifyWrite, notifySynced } = useSyncStatus();
  const { applyPreferenceUpdate } = usePreferenceContext();

  function mutate(partial: FirestorePreferencePartial): void {
    applyPreferenceUpdate(partial);
    notifyWrite();
    void setDoc(doc(db, 'preference', uid), partial, { merge: true }).then(
      () => notifySynced(),
    );
  }

  return { mutate };
}
