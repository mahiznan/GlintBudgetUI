import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/db';
import type { Preference } from '../firestore/types';

interface UsePreferencesResult {
  data: Preference | null;
  loading: boolean;
  error: Error | null;
}

function docToPreference(id: string, raw: Record<string, unknown>): Preference {
  return {
    id,
    accounts: (raw['accounts'] as Preference['accounts']) ?? [],
    categories: (raw['categories'] as Preference['categories']) ?? [],
    subCategories: (raw['subCategories'] as Preference['subCategories']) ?? [],
    vendors: (raw['vendors'] as Preference['vendors']) ?? [],
    payments: (raw['payments'] as Preference['payments']) ?? [],
    defaultCurrency: raw['default_currency'] as Preference['defaultCurrency'],
    bookmarkedCurrencies:
      (raw['frequent_currencies'] as string[]) ?? [],
    defaultEntries:
      (raw['default_entries'] as Record<string, string>) ?? null,
  };
}

export function usePreferences(uid: string | null): UsePreferencesResult {
  const [data, setData] = useState<Preference | null>(null);
  const [loading, setLoading] = useState(uid !== null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, 'preference', uid);
    getDoc(ref)
      .then((snap) => {
        if (snap.exists()) {
          setData(docToPreference(snap.id, snap.data() as Record<string, unknown>));
        } else {
          setData(null);
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false));
  }, [uid]);

  return { data, loading, error };
}
