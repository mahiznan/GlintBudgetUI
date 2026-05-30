// src/components/transactions/AddTransactionDrawer.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../auth/AuthContext';
import { usePreferenceContext } from '../../context/PreferenceContext';
import { useAddTransaction, useUpdateTransaction } from '../../hooks/useMutateTransaction';
import { getDoc, doc, type Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/db';
import TypeToggle from '../form/TypeToggle';
import AmountInput from '../form/AmountInput';
import FieldPicker from '../form/FieldPicker';
import MiniCalendar from '../form/MiniCalendar';
import SearchPicker from '../form/SearchPicker';
import type { Transaction, BudgetData } from '../../firestore/types';

type ActiveField =
  | 'currency'
  | 'vendor'
  | 'category'
  | 'subCategory'
  | 'date'
  | 'account'
  | 'payment'
  | 'notes'
  | null;

interface FormState {
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  category: string;
  subCategory: string;
  vendor: string;
  account: string;
  payment: string;
  date: string; // 'YYYY-MM-DD'
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

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatPickerDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function makeEmpty(selectedDate?: Date): FormState {
  return {
    type: 'expense',
    amount: '',
    currency: '',
    category: '',
    subCategory: '',
    vendor: '',
    account: '',
    payment: '',
    date: toLocalDateStr(selectedDate ?? new Date()),
    notes: '',
  };
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.amount || parseFloat(form.amount) <= 0)
    errors.amount = 'Amount is required and must be positive';
  if (!form.category) errors.category = 'Category is required';
  if (!form.vendor) errors.vendor = 'Vendor is required';
  if (!form.account) errors.account = 'Account is required';
  if (!form.payment) errors.payment = 'Payment method is required';
  if (!form.currency) errors.currency = 'Currency is required';
  if (!form.date) errors.date = 'Date is required';
  return errors;
}

export interface AddTransactionDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  selectedDate?: Date;
  transactions?: Transaction[];
  editId?: string;
}

export default function AddTransactionDrawer({
  open,
  onClose,
  onSaved,
  selectedDate,
  transactions,
  editId,
}: AddTransactionDrawerProps) {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { preference } = usePreferenceContext();
  const { mutate: addTx } = useAddTransaction();
  const { mutate: updateTx } = useUpdateTransaction();

  const [form, setForm] = useState<FormState>(() => makeEmpty(selectedDate));
  const [errors, setErrors] = useState<FormErrors>({});
  const [visible, setVisible] = useState(false);
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const saveRef = useRef<HTMLButtonElement>(null);

  // Animate in + reset form each open
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(false);
      return;
    }
    setForm(makeEmpty(selectedDate));
    setErrors({});
    setActiveField(null);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setVisible(true);
        (document.getElementById('amount-input') as HTMLInputElement | null)?.focus();
      }),
    );
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill form from Firestore when editing an existing transaction
  useEffect(() => {
    if (!open || !editId) return;
    getDoc(doc(db, 'transactions', editId)).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      setForm({
        type: (d['amount'] as number) < 0 ? 'expense' : 'income',
        amount: String(Math.abs(d['amount'] as number)),
        currency: d['currency'] as string,
        category: d['category'] as string,
        subCategory: d['sub_category'] as string,
        vendor: d['vendor'] as string,
        account: d['account'] as string,
        payment: d['payment'] as string,
        date: toLocalDateStr((d['date'] as Timestamp).toDate()),
        notes: (d['notes'] as string) ?? '',
      });
    });
  }, [open, editId]);

  // Seed preference defaults on open
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

  // Escape key: close picker first, then close drawer.
  // Enter key: when the date calendar is open, confirm the current date and advance to account.
  // preventDefault on Enter suppresses the browser's default "click focused button" behaviour,
  // which would otherwise re-fire the date row button's onClick and close the calendar instead.
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (activeField !== null) {
          setActiveField(null);
        } else {
          startClose();
        }
      } else if (e.key === 'Enter' && activeField === 'date') {
        e.preventDefault();
        setActiveField('account');
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeField]);

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

  function open_(field: ActiveField) {
    setActiveField(field);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const categoryObj = preference?.categories.find((c) => c.name === form.category);
    const txData: Omit<Transaction, 'id'> = {
      user_id: uid,
      category: form.category,
      subCategory: form.subCategory,
      date: new Date(form.date + 'T00:00:00'),
      account: form.account,
      vendor: form.vendor,
      payment: form.payment,
      currency: form.currency,
      notes: form.notes,
      amount:
        form.type === 'expense'
          ? -Math.abs(parseFloat(form.amount))
          : Math.abs(parseFloat(form.amount)),
      icon: categoryObj?.emoji ?? '',
    };
    if (editId) {
      updateTx(editId, txData);
    } else {
      addTx(txData);
    }
    onSaved?.();
    startClose();
  }

  // Mirror iOS SuggestionToolbarView: show vendors from past transactions in addition to
  // the stored preference vendors, so the picker reflects real usage history.
  const vendorOptions = useMemo((): BudgetData[] => {
    const fromPref = preference?.vendors ?? [];
    const seen = new Set(fromPref.map((v) => v.name));
    const fromTxns = (transactions ?? [])
      .map((t) => t.vendor)
      .filter((name, idx, arr) => Boolean(name) && arr.indexOf(name) === idx && !seen.has(name))
      .map((name): BudgetData => ({ name, emoji: null, type: 'vendor', parent: null }));
    return [...fromPref, ...fromTxns];
  }, [preference, transactions]);

  const filteredSubCats: BudgetData[] =
    preference?.subCategories.filter((s) => s.parent === form.category) ?? [];

  const currencyOptions: BudgetData[] = (preference?.bookmarkedCurrencies ?? []).map((code) => ({
    name: code,
    emoji: null,
    type: 'currency',
    parent: null,
  }));

  const saveGradient =
    form.type === 'expense' ? 'var(--expense-gradient)' : 'var(--income-gradient)';
  const saveShadow =
    form.type === 'expense' ? '0 4px 14px rgba(220,38,38,0.30)' : '0 4px 14px rgba(34,197,94,0.30)';

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
        aria-label={editId ? 'Edit Transaction' : 'New Transaction'}
        className={[
          'fixed inset-y-0 right-0 z-50 flex w-[480px] max-w-full flex-col bg-surface shadow-2xl',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 flex-shrink-0">
          <h2 className="text-base font-semibold text-text">
            {editId ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <button
            type="button"
            onClick={startClose}
            aria-label="Close drawer"
            className="text-text-muted hover:text-text text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Type toggle — full width, no padding */}
        <TypeToggle value={form.type} onChange={(v) => set('type')(v)} />

        {/* Amount row */}
        <AmountInput
          value={form.amount}
          onChange={set('amount')}
          currencyCode={form.currency || (preference?.defaultCurrency.code ?? 'INR')}
          currencySymbol={preference?.defaultCurrency.symbol ?? '₹'}
          onCurrencyClick={() => open_(activeField === 'currency' ? null : 'currency')}
          onNext={() => open_('vendor')}
          error={errors.amount}
        />

        {/* Currency picker (inline, between amount and fields) */}
        {activeField === 'currency' && (
          <SearchPicker
            label="Currency"
            value={form.currency}
            options={currencyOptions}
            onSelect={(v) => {
              set('currency')(v);
              setActiveField('vendor');
            }}
            onClose={() => setActiveField(null)}
          />
        )}

        {errors.currency && <p className="text-xs text-red-600 px-[18px]">{errors.currency}</p>}

        {/* Scrollable field list */}
        <div className="flex-1 overflow-y-auto">
          <form
            id="add-tx-form"
            onSubmit={handleSubmit}
            className="flex flex-col px-[18px] py-[8px]"
          >
            {/* Vendor */}
            <FieldPicker
              label="Vendor"
              value={form.vendor}
              onChange={set('vendor')}
              options={vendorOptions}
              iconBg="#eff6ff"
              icon="🏪"
              isOpen={activeField === 'vendor'}
              onOpen={() => open_(activeField === 'vendor' ? null : 'vendor')}
              onClose={() => setActiveField(null)}
              onNext={() => setActiveField('category')}
              required
              allowFreeText
              error={errors.vendor}
            />

            {/* Category */}
            <FieldPicker
              label="Category"
              value={form.category}
              onChange={set('category')}
              options={preference?.categories ?? []}
              iconBg="#fdf4ff"
              icon="📂"
              isOpen={activeField === 'category'}
              onOpen={() => open_(activeField === 'category' ? null : 'category')}
              onClose={() => setActiveField(null)}
              onNext={(name) => {
                const hasSubCats = (preference?.subCategories ?? []).some((s) => s.parent === name);
                setActiveField(hasSubCats ? 'subCategory' : 'date');
              }}
              required
              error={errors.category}
            />

            {/* Sub-category — always shown; empty when selected category has no children */}
            <FieldPicker
              label="Sub-category"
              value={form.subCategory}
              onChange={set('subCategory')}
              options={filteredSubCats}
              iconBg="#fdf4ff"
              icon="🏷️"
              isOpen={activeField === 'subCategory'}
              onOpen={() => open_(activeField === 'subCategory' ? null : 'subCategory')}
              onClose={() => setActiveField(null)}
              onNext={() => setActiveField('date')}
            />

            {/* Date row */}
            <button
              type="button"
              onClick={() => open_(activeField === 'date' ? null : 'date')}
              className="w-full flex items-center gap-[10px] py-[14px] border-b border-[#f1f5f9] text-left"
            >
              <div className="w-[36px] h-[36px] rounded-[10px] bg-[#ecfdf5] flex items-center justify-center text-[16px] flex-shrink-0">
                📅
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-text-muted uppercase tracking-[0.07em]">
                  Date <span className="text-red-500">*</span>
                </div>
                <div className="text-[16px] font-medium mt-[1px] text-text">
                  {formatPickerDate(form.date)}
                </div>
              </div>
              <span className="text-[14px] text-[#cbd5e1]">›</span>
            </button>
            {activeField === 'date' && (
              <MiniCalendar
                value={form.date}
                onChange={(v) => {
                  set('date')(v);
                  setActiveField('account');
                }}
                activeType={form.type}
              />
            )}
            {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}

            {/* Account */}
            <button
              type="button"
              onClick={() => open_(activeField === 'account' ? null : 'account')}
              className="w-full flex items-center gap-[10px] py-[14px] border-b border-[#f1f5f9] text-left"
            >
              <div className="w-[36px] h-[36px] rounded-[10px] bg-[#fff7ed] flex items-center justify-center text-[16px] flex-shrink-0">
                🏦
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-text-muted uppercase tracking-[0.07em]">
                  Account <span className="text-red-500">*</span>
                </div>
                <div
                  className="text-[16px] font-medium mt-[1px] truncate"
                  style={{ color: form.account ? '#0f172a' : '#cbd5e1' }}
                >
                  {form.account || 'Select…'}
                </div>
              </div>
              <span className="text-[14px] text-[#cbd5e1]">›</span>
            </button>
            {activeField === 'account' && (
              <SearchPicker
                label="Account"
                value={form.account}
                options={preference?.accounts ?? []}
                onSelect={(v) => {
                  set('account')(v);
                  setActiveField('payment');
                }}
                onClose={() => setActiveField(null)}
              />
            )}
            {errors.account && <p className="text-xs text-red-600">{errors.account}</p>}

            {/* Payment */}
            <button
              type="button"
              onClick={() => open_(activeField === 'payment' ? null : 'payment')}
              className="w-full flex items-center gap-[10px] py-[14px] border-b border-[#f1f5f9] text-left"
            >
              <div className="w-[36px] h-[36px] rounded-[10px] bg-[#fff1f2] flex items-center justify-center text-[16px] flex-shrink-0">
                💳
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-text-muted uppercase tracking-[0.07em]">
                  Payment <span className="text-red-500">*</span>
                </div>
                <div
                  className="text-[16px] font-medium mt-[1px] truncate"
                  style={{ color: form.payment ? '#0f172a' : '#cbd5e1' }}
                >
                  {form.payment || 'Select…'}
                </div>
              </div>
              <span className="text-[14px] text-[#cbd5e1]">›</span>
            </button>
            {activeField === 'payment' && (
              <SearchPicker
                label="Payment"
                value={form.payment}
                options={preference?.payments ?? []}
                onSelect={(v) => {
                  set('payment')(v);
                  setActiveField('notes');
                }}
                onClose={() => setActiveField(null)}
              />
            )}
            {errors.payment && <p className="text-xs text-red-600">{errors.payment}</p>}

            {/* Notes */}
            <button
              type="button"
              onClick={() => open_(activeField === 'notes' ? null : 'notes')}
              className="w-full flex items-center gap-[10px] py-[14px] text-left"
            >
              <div className="w-[36px] h-[36px] rounded-[10px] bg-[#f8fafc] flex items-center justify-center text-[16px] flex-shrink-0">
                📝
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-text-muted uppercase tracking-[0.07em]">
                  Notes
                </div>
                <div
                  className="text-[16px] font-medium mt-[1px] truncate"
                  style={{ color: form.notes ? '#0f172a' : '#cbd5e1' }}
                >
                  {form.notes || 'Optional notes…'}
                </div>
              </div>
            </button>
            {activeField === 'notes' && (
              <div className="-mx-[18px] bg-[#f8fafc] border-y-[1.5px] border-[#e2e8f0] px-[18px] py-[10px]">
                <textarea
                  autoFocus
                  value={form.notes}
                  onChange={(e) => set('notes')(e.target.value)}
                  rows={3}
                  placeholder="Add a note…"
                  className="w-full text-[13px] text-text bg-surface border border-border rounded-[10px] px-3 py-2 outline-none focus:border-brand resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      setActiveField(null);
                      saveRef.current?.focus();
                    }
                    if (e.key === 'Escape') setActiveField(null);
                  }}
                />
              </div>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={startClose}
            className="flex-1 rounded-xl border border-border py-[14px] text-base font-semibold text-text hover:bg-surface-alt transition-colors"
          >
            Cancel
          </button>
          <button
            ref={saveRef}
            type="submit"
            form="add-tx-form"
            className="flex-1 rounded-xl py-[14px] text-base font-semibold text-white transition-opacity"
            style={{ background: saveGradient, boxShadow: saveShadow }}
          >
            {editId ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
