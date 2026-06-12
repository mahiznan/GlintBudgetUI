import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { fetchPreferences, mergeWithDefaults } from '../hooks/usePreferences';
import { PreferenceContext, type PreferenceContextValue } from './PreferenceContext';
import type { Preference } from '../firestore/types';
import type { FirestorePreferencePartial } from '../hooks/useUpdatePreference';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  DEFAULT_PAYMENTS,
  DEFAULT_SUBCATEGORIES,
} from '../lib/defaultPreferences';

export function PreferenceProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : null;

  const [preference, setPreference] = useState<Preference | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setPreference(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchPreferences(uid)
      .then((p) => setPreference(p))
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false));
  }, [uid]);

  const applyPreferenceUpdate = useCallback(
    (partial: FirestorePreferencePartial) => {
      setPreference((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        if (partial.accounts !== undefined)
          next.accounts = mergeWithDefaults(DEFAULT_ACCOUNTS, partial.accounts);
        if (partial.categories !== undefined)
          next.categories = mergeWithDefaults(DEFAULT_CATEGORIES, partial.categories);
        if (partial.subCategories !== undefined)
          next.subCategories = mergeWithDefaults(
            DEFAULT_SUBCATEGORIES,
            partial.subCategories,
          );
        if (partial.vendors !== undefined) next.vendors = partial.vendors;
        if (partial.payments !== undefined)
          next.payments = mergeWithDefaults(DEFAULT_PAYMENTS, partial.payments);
        if (partial.archivedAccounts !== undefined)
          next.archivedAccounts = partial.archivedAccounts;
        if (partial.default_currency !== undefined)
          next.defaultCurrency = partial.default_currency;
        if (partial.frequent_currencies !== undefined)
          next.bookmarkedCurrencies = partial.frequent_currencies;
        if (partial.default_entries !== undefined)
          next.defaultEntries = partial.default_entries;
        if (partial.theme !== undefined) next.theme = partial.theme;
        if (partial.colorMode !== undefined) next.colorMode = partial.colorMode;
        if (partial.spendingChartType !== undefined)
          next.spendingChartType = partial.spendingChartType;
        if (partial.defaultPeriod !== undefined) next.defaultPeriod = partial.defaultPeriod;
        if (partial.layoutWidth !== undefined) next.layoutWidth = partial.layoutWidth;
        return next;
      });
    },
    [],
  );

  const value: PreferenceContextValue = { preference, loading, error, applyPreferenceUpdate };

  return (
    <PreferenceContext.Provider value={value}>
      {children}
    </PreferenceContext.Provider>
  );
}
