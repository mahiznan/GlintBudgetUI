import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../auth/AuthContext';
import { usePreferenceContext } from '../../context/PreferenceContext';
import { useAddTransaction } from '../../hooks/useMutateTransaction';
import AmountInput from '../form/AmountInput';
import TypeToggle from '../form/TypeToggle';
import FieldPicker from '../form/FieldPicker';
import type { Transaction, BudgetData } from '../../firestore/types';

interface FormState {
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  category: string;
  subCategory: string;
  vendor: string;
  account: string;
  payment: string;
  date: string;
  notes: string;
}

interface FormErrors {
  amount?: string;
  category?: string;
  vendor?: string;
  account?: string;
  payment?: string;
  currency?: string;
  date?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.amount || parseFloat(form.amount) <= 0) errors.amount = 'Amount is required and must be positive';
  if (!form.category) errors.category = 'Category is required';
  if (!form.vendor) errors.vendor = 'Vendor is required';
  if (!form.account) errors.account = 'Account is required';
  if (!form.payment) errors.payment = 'Payment method is required';
  if (!form.currency) errors.currency = 'Currency is required';
  if (!form.date) errors.date = 'Date is required';
  return errors;
}

const EMPTY: FormState = {
  type: 'expense',
  amount: '',
  currency: '',
  category: '',
  subCategory: '',
  vendor: '',
  account: '',
  payment: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
};

interface AddTransactionDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddTransactionDrawer({ open, onClose, onSaved }: AddTransactionDrawerProps) {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { preference } = usePreferenceContext();
  const { mutate: addTx, loading, error: mutateError } = useAddTransaction();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [visible, setVisible] = useState(false);
  const [openField, setOpenField] = useState<string | null>(null);

  // Animate in and reset form each time the drawer opens.
  // We set visible=false first (handled by open returning null above), then
  // set visible=true after a microtask so CSS transition fires in real browsers.
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(false);
      return;
    }
    setForm(EMPTY);
    setErrors({});
    setOpenField(null);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true))
    );
  }, [open]);

  // Seed preference defaults when drawer opens
  useEffect(() => {
    if (!open || !preference) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((prev) => ({
      ...prev,
      currency: prev.currency || preference.defaultCurrency.code,
      account: prev.account || (preference.defaultEntries?.['account'] ?? ''),
      payment: prev.payment || (preference.defaultEntries?.['payment'] ?? ''),
      category: prev.category || (preference.defaultEntries?.['category'] ?? ''),
      subCategory: prev.subCategory || (preference.defaultEntries?.['sub_category'] ?? ''),
    }));
  }, [preference, open]);

  // Escape key closes the drawer
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') startClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  function startClose() {
    setVisible(false);
    setTimeout(onClose, 260);
  }

  function set(field: keyof FormState) {
    return (value: string) =>
      setForm((prev) => {
        const next = { ...prev, [field]: value };
        if (field === 'category') next.subCategory = '';
        return next;
      });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    const categoryObj = preference?.categories.find((c) => c.name === form.category);
    const txData: Omit<Transaction, 'id'> = {
      user_id: uid,
      category: form.category,
      subCategory: form.subCategory,
      date: new Date(form.date),
      account: form.account,
      vendor: form.vendor,
      payment: form.payment,
      currency: form.currency,
      notes: form.notes,
      amount: form.type === 'expense'
        ? -Math.abs(parseFloat(form.amount))
        : Math.abs(parseFloat(form.amount)),
      icon: categoryObj?.emoji ?? '',
    };
    try {
      await addTx(txData);
      onSaved();
      startClose();
    } catch {
      // mutateError state is set by the hook
    }
  }

  const filteredSubCats: BudgetData[] =
    preference?.subCategories.filter((s) => s.parent === form.category) ?? [];

  const currencyOptions: BudgetData[] = (preference?.bookmarkedCurrencies ?? []).map((code) => ({
    name: code,
    emoji: null,
    type: 'currency',
    parent: null,
  }));

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        data-testid="drawer-backdrop"
        aria-hidden="true"
        onClick={startClose}
        className={[
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New Transaction"
        className={[
          'fixed inset-y-0 right-0 z-50 flex w-[480px] max-w-full flex-col bg-surface shadow-2xl',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 flex-shrink-0">
          <h2 className="text-base font-semibold text-text">New Transaction</h2>
          <button
            type="button"
            onClick={startClose}
            aria-label="Close drawer"
            className="text-text-muted hover:text-text text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto">
          <form id="add-tx-form" onSubmit={handleSubmit} className="flex flex-col gap-5 p-5">
            <TypeToggle value={form.type} onChange={set('type')} />

            <AmountInput
              value={form.amount}
              onChange={set('amount')}
              currencyCode={form.currency || (preference?.defaultCurrency.code ?? 'INR')}
              currencySymbol={preference?.defaultCurrency.symbol ?? '₹'}
              onCurrencyClick={() => { /* wired in Task 6 */ }}
              error={errors.amount}
            />

            <FieldPicker
              label="Currency"
              value={form.currency}
              onChange={set('currency')}
              options={currencyOptions}
              iconBg="rgb(200, 210, 241)"
              icon="💱"
              isOpen={openField === 'currency'}
              onOpen={() => setOpenField('currency')}
              onClose={() => setOpenField(null)}
              required
              error={errors.currency}
            />

            <FieldPicker
              label="Category"
              value={form.category}
              onChange={set('category')}
              options={preference?.categories ?? []}
              iconBg="rgb(254, 243, 224)"
              icon="📂"
              isOpen={openField === 'category'}
              onOpen={() => setOpenField('category')}
              onClose={() => setOpenField(null)}
              required
              error={errors.category}
            />

            {filteredSubCats.length > 0 && (
              <FieldPicker
                label="Sub-category"
                value={form.subCategory}
                onChange={set('subCategory')}
                options={filteredSubCats}
                iconBg="rgb(240, 244, 248)"
                icon="📌"
                isOpen={openField === 'subCategory'}
                onOpen={() => setOpenField('subCategory')}
                onClose={() => setOpenField(null)}
              />
            )}

            <FieldPicker
              label="Vendor"
              value={form.vendor}
              onChange={set('vendor')}
              options={preference?.vendors ?? []}
              iconBg="rgb(254, 226, 226)"
              icon="🏪"
              isOpen={openField === 'vendor'}
              onOpen={() => setOpenField('vendor')}
              onClose={() => setOpenField(null)}
              required
              allowFreeText
              error={errors.vendor}
            />

            <FieldPicker
              label="Account"
              value={form.account}
              onChange={set('account')}
              options={preference?.accounts ?? []}
              iconBg="rgb(220, 252, 231)"
              icon="🏦"
              isOpen={openField === 'account'}
              onOpen={() => setOpenField('account')}
              onClose={() => setOpenField(null)}
              required
              error={errors.account}
            />

            <FieldPicker
              label="Payment"
              value={form.payment}
              onChange={set('payment')}
              options={preference?.payments ?? []}
              iconBg="rgb(207, 250, 254)"
              icon="💳"
              isOpen={openField === 'payment'}
              onOpen={() => setOpenField('payment')}
              onClose={() => setOpenField(null)}
              required
              error={errors.payment}
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="drawer-date" className="text-sm font-semibold text-text">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="drawer-date"
                type="date"
                value={form.date}
                onChange={(e) => set('date')(e.target.value)}
                className="rounded-xl border border-border px-4 py-3 text-sm bg-surface outline-none focus:ring-2 focus:ring-brand/30 text-text"
              />
              {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="drawer-notes" className="text-sm font-semibold text-text">Notes</label>
              <textarea
                id="drawer-notes"
                value={form.notes}
                onChange={(e) => set('notes')(e.target.value)}
                rows={3}
                placeholder="Optional notes…"
                className="rounded-xl border border-border px-4 py-3 text-sm bg-surface outline-none focus:ring-2 focus:ring-brand/30 text-text resize-none"
              />
            </div>

            {mutateError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                {mutateError.message}
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={startClose}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-text hover:bg-surface-alt transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-tx-form"
            disabled={loading}
            className="flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: 'var(--brand-gradient)' }}
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
