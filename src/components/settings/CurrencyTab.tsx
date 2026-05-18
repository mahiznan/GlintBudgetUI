import { useState } from 'react';
import type { Currency } from '../../firestore/types';
import { CURRENCIES } from '../../lib/currencies';

interface CurrencyTabProps {
  defaultCurrency: Currency;
  bookmarkedCurrencies: string[];
  onSaveCurrency: (currency: Currency) => Promise<void>;
  onSaveBookmarks: (codes: string[]) => Promise<void>;
  saving: boolean;
}

export default function CurrencyTab({
  defaultCurrency,
  bookmarkedCurrencies,
  onSaveCurrency,
  onSaveBookmarks,
  saving,
}: CurrencyTabProps) {
  const [selectedAdd, setSelectedAdd] = useState('');
  const [bookmarkError, setBookmarkError] = useState('');

  async function handleCurrencyChange(code: string) {
    const currency = CURRENCIES.find((c) => c.code === code);
    if (!currency) return;
    await onSaveCurrency(currency);
  }

  async function handleRemoveBookmark(code: string) {
    await onSaveBookmarks(bookmarkedCurrencies.filter((c) => c !== code));
  }

  async function handleAddBookmark() {
    if (!selectedAdd) return;
    if (bookmarkedCurrencies.includes(selectedAdd)) {
      setBookmarkError(`${selectedAdd} is already bookmarked.`);
      return;
    }
    await onSaveBookmarks([...bookmarkedCurrencies, selectedAdd]);
    setSelectedAdd('');
    setBookmarkError('');
  }

  const available = CURRENCIES.filter((c) => !bookmarkedCurrencies.includes(c.code));

  return (
    <div className="flex flex-col gap-4">
      {/* Default Currency */}
      <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-widest">
          Default Currency
        </h3>
        <div className="flex items-center gap-3">
          <label htmlFor="default-currency" className="text-sm text-text-muted w-32 flex-shrink-0">
            Currency
          </label>
          <select
            id="default-currency"
            value={defaultCurrency.code}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            disabled={saving}
            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-surface"
            aria-label="Default currency"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name} ({c.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bookmarked Currencies */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-widest">
            Bookmarked Currencies
          </h3>
        </div>

        {bookmarkedCurrencies.length > 0 && (
          <div className="divide-y divide-border">
            {bookmarkedCurrencies.map((code) => {
              const currency = CURRENCIES.find((c) => c.code === code);
              return (
                <div key={code} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-sm font-mono font-semibold text-text w-12">{code}</span>
                  <span className="flex-1 text-sm text-text-muted">{currency?.name ?? ''}</span>
                  <span className="text-sm text-text-muted w-8">{currency?.symbol ?? ''}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBookmark(code)}
                    disabled={saving}
                    className="text-text-muted hover:text-red-600 p-1"
                    aria-label={`Remove ${code}`}
                  >
                    🗑
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add bookmark */}
        <div className="px-5 py-4 border-t border-border flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <select
              value={selectedAdd}
              onChange={(e) => { setSelectedAdd(e.target.value); setBookmarkError(''); }}
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-surface"
              aria-label="Add currency"
            >
              <option value="">Select currency…</option>
              {available.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddBookmark}
              disabled={saving || !selectedAdd}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
              style={{ background: 'var(--brand-gradient)' }}
            >
              Add
            </button>
          </div>
          {bookmarkError && <p className="text-xs text-red-600">{bookmarkError}</p>}
        </div>
      </div>
    </div>
  );
}
