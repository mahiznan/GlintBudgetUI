import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
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
  hasPendingWrites: boolean;
  /** @deprecated No-op: onSnapshot keeps data live automatically. */
  refetch: () => void;
}

// Swift Codable encodes [BudgetDataType:String] as a flat alternating array.
// Reverse: ["account", "Monthly Budget"] → { account: "Monthly Budget" }
function decodeDefaultEntries(raw: unknown): Record<string, string> {
  if (!Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (let i = 0; i + 1 < raw.length; i += 2) {
    result[raw[i] as string] = raw[i + 1] as string;
  }
  return result;
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
    defaultEntries:
      raw['default_entries'] !== undefined
        ? decodeDefaultEntries(raw['default_entries'])
        : DEFAULT_ENTRIES,
    theme: raw['theme'] as string | undefined,
    spendingChartType: raw['spendingChartType'] as 'bar' | 'line' | undefined,
    layoutWidth: raw['layoutWidth'] as 'fixed' | 'full' | undefined,
  };
}

export function usePreferences(uid: string | null): UsePreferencesResult {
  const [data, setData] = useState<Preference | null>(null);
  const [loading, setLoading] = useState(uid !== null);
  const [error, setError] = useState<Error | null>(null);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const ref = doc(db, 'preference', uid);

    return onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        setHasPendingWrites(snap.metadata.hasPendingWrites);
        if (snap.exists()) {
          setData(docToPreference(snap.id, snap.data() as Record<string, unknown>));
        } else {
          setData(docToPreference(uid, {}));
        }
        setLoading(false);
      },
      (err: Error) => {
        setError(err);
        setLoading(false);
      },
    );
  }, [uid]);

  return { data, loading, error, hasPendingWrites, refetch: () => {} };
}
