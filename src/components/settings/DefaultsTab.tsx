import type { BudgetData } from '../../firestore/types';

interface DefaultsTabProps {
  accounts: BudgetData[];
  categories: BudgetData[];
  payments: BudgetData[];
  subCategories: BudgetData[];
  defaultEntries: Record<string, string> | null;
  onSave: (partial: Record<string, string>) => Promise<void>;
  saving: boolean;
}

export default function DefaultsTab({
  accounts,
  categories,
  payments,
  subCategories,
  defaultEntries,
  onSave,
  saving,
}: DefaultsTabProps) {
  const entries = defaultEntries ?? {};
  const selectedCategory = entries['category'] ?? '';
  const filteredSubCats = subCategories.filter((s) => s.parent === selectedCategory);

  async function handleChange(key: string, value: string) {
    await onSave({ [key]: value });
  }

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-5">
      <p className="text-sm text-text-muted">
        These values pre-fill the Add Transaction form automatically.
      </p>

      <div className="flex flex-col gap-4">
        {/* Default Account */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="default-account" className="text-sm font-medium text-text">
            Default Account
          </label>
          <select
            id="default-account"
            value={entries['account'] ?? ''}
            onChange={(e) => handleChange('account', e.target.value)}
            disabled={saving}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-surface"
            aria-label="Default Account"
          >
            <option value="">None</option>
            {accounts.map((a) => (
              <option key={a.name} value={a.name}>
                {a.emoji} {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Default Category */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="default-category" className="text-sm font-medium text-text">
            Default Category
          </label>
          <select
            id="default-category"
            value={entries['category'] ?? ''}
            onChange={(e) => handleChange('category', e.target.value)}
            disabled={saving}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-surface"
            aria-label="Default Category"
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Default Sub-Category */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="default-sub-category" className="text-sm font-medium text-text">
            Default Sub-Category
          </label>
          <select
            id="default-sub-category"
            value={entries['sub_category'] ?? ''}
            onChange={(e) => handleChange('sub_category', e.target.value)}
            disabled={saving || !selectedCategory}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-surface disabled:opacity-50"
            aria-label="Default Sub-Category"
          >
            <option value="">None</option>
            {filteredSubCats.map((s) => (
              <option key={s.name} value={s.name}>
                {s.emoji} {s.name}
              </option>
            ))}
          </select>
          {!selectedCategory && (
            <p className="text-xs text-text-muted">Select a Default Category first</p>
          )}
        </div>

        {/* Default Payment */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="default-payment" className="text-sm font-medium text-text">
            Default Payment
          </label>
          <select
            id="default-payment"
            value={entries['payment'] ?? ''}
            onChange={(e) => handleChange('payment', e.target.value)}
            disabled={saving}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-surface"
            aria-label="Default Payment"
          >
            <option value="">None</option>
            {payments.map((p) => (
              <option key={p.name} value={p.name}>
                {p.emoji} {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
