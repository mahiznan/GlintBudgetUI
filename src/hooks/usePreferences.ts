import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/db';
import type { BudgetData, Preference } from '../firestore/types';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  DEFAULT_CURRENCY,
  DEFAULT_ENTRIES,
  DEFAULT_PAYMENTS,
  DEFAULT_SUBCATEGORIES,
} from '../lib/defaultPreferences';

interface UsePreferencesResult {
  data: Preference | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Mirrors iOS PreferenceService.loadUserPreferences(): start with defaults,
// then append any user-added entries from Firestore that aren't already present.
function mergeWithDefaults(defaults: BudgetData[], fromFirestore: BudgetData[]): BudgetData[] {
  const seen = new Set(defaults.map((d) => `${d.name}::${d.parent ?? ''}`));
  const additions = fromFirestore.filter((d) => !seen.has(`${d.name}::${d.parent ?? ''}`));
  return [...defaults, ...additions];
}

function docToPreference(id: string, raw: Record<string, unknown>): Preference {
  return {
    id,
    accounts: mergeWithDefaults(DEFAULT_ACCOUNTS, (raw['accounts'] as BudgetData[]) ?? []),
    categories: mergeWithDefaults(DEFAULT_CATEGORIES, (raw['categories'] as BudgetData[]) ?? []),
    subCategories: mergeWithDefaults(
      DEFAULT_SUBCATEGORIES,
      (raw['subCategories'] as BudgetData[]) ?? [],
    ),
    vendors: (raw['vendors'] as BudgetData[]) ?? [],
    payments: mergeWithDefaults(DEFAULT_PAYMENTS, (raw['payments'] as BudgetData[]) ?? []),
    defaultCurrency: (raw['default_currency'] as Preference['defaultCurrency']) ?? DEFAULT_CURRENCY,
    bookmarkedCurrencies: (raw['frequent_currencies'] as string[]) ?? [],
    defaultEntries: (raw['default_entries'] as Record<string, string>) ?? DEFAULT_ENTRIES,
  };
}

export function usePreferences(uid: string | null): UsePreferencesResult {
  const [data, setData] = useState<Preference | null>(null);
  const [loading, setLoading] = useState(uid !== null);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!uid) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const ref = doc(db, 'preference', uid);
    getDoc(ref)
      .then((snap) => {
        if (snap.exists()) {
          setData(docToPreference(snap.id, snap.data() as Record<string, unknown>));
        } else {
          setData(docToPreference(uid, {}));
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false));
  }, [uid, tick]);

  return { data, loading, error, refetch };
}
