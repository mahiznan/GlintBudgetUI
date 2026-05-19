import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/db';
import type { BudgetData, Currency } from '../firestore/types';

// Firestore field names for the preference document.
// camelCase: accounts, subCategories; snake_case: default_currency, frequent_currencies, default_entries.
// This matches the schema used by the mobile app.
export interface FirestorePreferencePartial {
  accounts?: BudgetData[];
  categories?: BudgetData[];
  subCategories?: BudgetData[];
  vendors?: BudgetData[];
  payments?: BudgetData[];
  default_currency?: Currency;
  frequent_currencies?: string[];
  default_entries?: Record<string, string>;
  theme?: string;
  spendingChartType?: 'bar' | 'line';
}

// Swift Codable encodes [BudgetDataType:String] (non-String enum key) as a flat alternating array:
// { account: "Monthly Budget" } → ["account", "Monthly Budget"]
function encodeDefaultEntries(entries: Record<string, string>): string[] {
  return Object.entries(entries).flatMap(([k, v]) => [k, v]);
}

interface UseUpdatePreferenceResult {
  mutate: (partial: FirestorePreferencePartial) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

export function useUpdatePreference(uid: string): UseUpdatePreferenceResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function mutate(partial: FirestorePreferencePartial): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const firestoreData: Record<string, unknown> = { ...partial };
      if (partial.default_entries !== undefined) {
        firestoreData['default_entries'] = encodeDefaultEntries(partial.default_entries);
      }
      await setDoc(doc(db, 'preference', uid), firestoreData, { merge: true });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { mutate, loading, error };
}
