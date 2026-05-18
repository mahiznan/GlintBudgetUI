import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  DEFAULT_PAYMENTS,
  DEFAULT_SUBCATEGORIES,
} from '../lib/defaultPreferences';
import type { BudgetData, Currency } from '../firestore/types';
import BudgetDataTab from '../components/settings/BudgetDataTab';
import SubcategoriesTab from '../components/settings/SubcategoriesTab';
import CurrencyTab from '../components/settings/CurrencyTab';
import DefaultsTab from '../components/settings/DefaultsTab';

const TABS = [
  { key: 'accounts',      label: 'Accounts'      },
  { key: 'categories',    label: 'Categories'    },
  { key: 'subcategories', label: 'Subcategories' },
  { key: 'vendors',       label: 'Vendors'       },
  { key: 'payments',      label: 'Payments'      },
  { key: 'currency',      label: 'Currency'      },
  { key: 'defaults',      label: 'Defaults'      },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function Settings() {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'accounts') as TabKey;
  const { preference, loading, error, refetch } = usePreferenceContext();
  const { mutate, loading: saving } = useUpdatePreference(uid);

  function setTab(key: TabKey) {
    setSearchParams({ tab: key });
  }

  async function saveList(
    field: 'accounts' | 'categories' | 'vendors' | 'payments',
    items: BudgetData[],
  ) {
    await mutate({ [field]: items });
    refetch();
  }

  async function saveSubCategories(items: BudgetData[]) {
    await mutate({ subCategories: items });
    refetch();
  }

  async function saveCurrency(currency: Currency) {
    await mutate({ default_currency: currency });
    refetch();
  }

  async function saveBookmarks(codes: string[]) {
    await mutate({ frequent_currencies: codes });
    refetch();
  }

  async function saveDefaults(partial: Record<string, string>) {
    const current = preference?.defaultEntries ?? {};
    await mutate({ default_entries: { ...current, ...partial } });
    refetch();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted" role="status">
        Loading…
      </div>
    );
  }

  if (error || !preference) {
    return (
      <div className="m-6 rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700" role="alert">
        Couldn't load preferences.{' '}
        <button className="underline ml-1" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Tab bar */}
      <div className="px-6 py-4 border-b border-border bg-surface">
        <div className="flex items-center rounded-lg border border-border bg-surface-alt p-0.5 gap-0.5 flex-wrap">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                activeTab === key
                  ? 'text-white shadow-sm'
                  : 'text-text-muted hover:text-text',
              ].join(' ')}
              style={
                activeTab === key
                  ? { background: 'var(--brand-gradient)' }
                  : undefined
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'accounts' && (
          <BudgetDataTab
            itemType="account"
            allItems={preference.accounts}
            defaultItems={DEFAULT_ACCOUNTS}
            onSave={(items) => saveList('accounts', items)}
            saving={saving}
          />
        )}
        {activeTab === 'categories' && (
          <BudgetDataTab
            itemType="category"
            allItems={preference.categories}
            defaultItems={DEFAULT_CATEGORIES}
            onSave={(items) => saveList('categories', items)}
            saving={saving}
          />
        )}
        {activeTab === 'subcategories' && (
          <SubcategoriesTab
            allItems={preference.subCategories}
            defaultItems={DEFAULT_SUBCATEGORIES}
            categories={preference.categories}
            onSave={saveSubCategories}
            saving={saving}
          />
        )}
        {activeTab === 'vendors' && (
          <BudgetDataTab
            itemType="vendor"
            allItems={preference.vendors}
            defaultItems={[]}
            onSave={(items) => saveList('vendors', items)}
            saving={saving}
          />
        )}
        {activeTab === 'payments' && (
          <BudgetDataTab
            itemType="payment"
            allItems={preference.payments}
            defaultItems={DEFAULT_PAYMENTS}
            onSave={(items) => saveList('payments', items)}
            saving={saving}
          />
        )}
        {activeTab === 'currency' && (
          <CurrencyTab
            defaultCurrency={preference.defaultCurrency}
            bookmarkedCurrencies={preference.bookmarkedCurrencies}
            onSaveCurrency={saveCurrency}
            onSaveBookmarks={saveBookmarks}
            saving={saving}
          />
        )}
        {activeTab === 'defaults' && (
          <DefaultsTab
            accounts={preference.accounts}
            categories={preference.categories}
            payments={preference.payments}
            subCategories={preference.subCategories}
            defaultEntries={preference.defaultEntries}
            onSave={saveDefaults}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
