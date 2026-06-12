import { useEffect, useState } from 'react';
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

// Mirrors iOS PreferenceService.loadUserPreferences(): start with defaults,
// then append any user-added entries from Firestore that aren't already present.
// If a Firestore item matches a default by name (case-insensitive), the Firestore
// version is used (allows user to override default emoji/settings).
export function mergeWithDefaults(
  defaults: BudgetData[],
  fromFirestore: BudgetData[],
): BudgetData[] {
  const firestoreByKey = new Map(
    fromFirestore.map((d) => [`${d.name.toLowerCase()}::${d.parent ?? ''}`, d]),
  );
  const result: BudgetData[] = [];
  for (const def of defaults) {
    const key = `${def.name.toLowerCase()}::${def.parent ?? ''}`;
    // Use Firestore version if stored (allows user to override default emoji); else use constant.
    result.push(firestoreByKey.get(key) ?? def);
    firestoreByKey.delete(key);
  }
  firestoreByKey.forEach((item) => result.push(item));
  return result;
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
    archivedAccounts: (raw['archivedAccounts'] as BudgetData[]) ?? [],
    defaultCurrency:
      (raw['default_currency'] as Preference['defaultCurrency']) ?? DEFAULT_CURRENCY,
    bookmarkedCurrencies: (raw['frequent_currencies'] as string[]) ?? [],
    defaultEntries:
      (raw['default_entries'] as Record<string, string> | undefined) ?? DEFAULT_ENTRIES,
    theme: raw['theme'] as string | undefined,
    spendingChartType: raw['spendingChartType'] as 'bar' | 'line' | undefined,
    defaultPeriod: raw['defaultPeriod'] as Preference['defaultPeriod'],
    layoutWidth: raw['layoutWidth'] as 'fixed' | 'full' | undefined,
  };
}

export async function fetchPreferences(uid: string): Promise<Preference> {
  const snap = await getDoc(doc(db, 'preference', uid));
  if (snap.exists()) {
    return docToPreference(snap.id, snap.data() as Record<string, unknown>);
  }
  return docToPreference(uid, {});
}

// ---------------------------------------------------------------------------
// Compatibility shim — used by PreferenceProvider until Task 6 replaces it
// with a stateful context-based approach.
// ---------------------------------------------------------------------------
interface UsePreferencesResult {
  data: Preference | null;
  loading: boolean;
  error: Error | null;
  hasPendingWrites: boolean;
}

export function usePreferences(uid: string | null): UsePreferencesResult {
  const [data, setData] = useState<Preference | null>(null);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) return;
    fetchPreferences(uid)
      .then((pref) => {
        setData(pref);
        setLoadedUid(uid);
      })
      .catch((err: Error) => {
        setError(err);
        setLoadedUid(uid);
      });
  }, [uid]);

  const loading = uid !== null && loadedUid !== uid;

  return { data, loading, error, hasPendingWrites: false };
}
