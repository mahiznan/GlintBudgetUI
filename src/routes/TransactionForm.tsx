import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, type Timestamp } from 'firebase/firestore';
import { db } from '../firebase/db';
import { useAuth } from '../auth/AuthContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useAddTransaction, useUpdateTransaction } from '../hooks/useMutateTransaction';
import AmountInput from '../components/form/AmountInput';
import TypeToggle from '../components/form/TypeToggle';
import FieldPicker from '../components/form/FieldPicker';
import type { Transaction, BudgetData } from '../firestore/types';

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

interface TransactionFormProps {
  mode: 'add' | 'edit';
}

export default function TransactionForm({ mode }: TransactionFormProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { preference } = usePreferenceContext();

  const { mutate: addTx, loading: adding, error: addError } = useAddTransaction();
  const { mutate: updateTx, loading: updating, error: updateError } = useUpdateTransaction();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loadingTx, setLoadingTx] = useState(mode === 'edit');
  const [openField, setOpenField] = useState<string | null>(null);

  // Seed defaults from preference once it loads (add mode only; never overwrite user-changed fields)
  useEffect(() => {
    if (mode !== 'add' || !preference) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((prev) => ({
      ...prev,
      currency: prev.currency || preference.defaultCurrency.code,
      account: prev.account || (preference.defaultEntries?.['account'] ?? ''),
      payment: prev.payment || (preference.defaultEntries?.['payment'] ?? ''),
      category: prev.category || (preference.defaultEntries?.['category'] ?? ''),
      subCategory: prev.subCategory || (preference.defaultEntries?.['sub_category'] ?? ''),
    }));
  }, [preference, mode]);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    getDoc(doc(db, 'transactions', id))
      .then((snap) => {
        if (!snap.exists()) { navigate('/app/transactions'); return; }
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
          date: (d['date'] as Timestamp).toDate().toISOString().slice(0, 10),
          notes: (d['notes'] as string) ?? '',
        });
      })
      .finally(() => setLoadingTx(false));
  }, [mode, id, navigate]);

  function set(field: keyof FormState) {
    return (value: string) =>
      setForm((prev) => {
        const next = { ...prev, [field]: value };
        if (field === 'category') {
          next.subCategory = '';
        }
        return next;
      });
  }

  async function handleSubmit(e: React.FormEvent) {
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
      if (mode === 'add') {
        await addTx(txData);
      } else {
        await updateTx(id!, txData);
      }
      navigate('/app/transactions');
    } catch {
      // mutateError state is already set by the hook
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

  const mutateError = addError ?? updateError;
  const loading = adding || updating || loadingTx;

  return (
    <div className="max-w-xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="card-surface rounded-2xl p-6 flex flex-col gap-5">
        <TypeToggle value={form.type} onChange={set('type')} />

        <AmountInput
          value={form.amount}
          onChange={set('amount')}
          currencyCode={form.currency || (preference?.defaultCurrency.code ?? 'INR')}
          currencySymbol={preference?.defaultCurrency.symbol ?? '₹'}
          onCurrencyClick={() => {
            // Focus on currency picker - it will be the next field
            document.getElementById('currency')?.focus();
          }}
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
          <label htmlFor="date-input" className="text-sm font-semibold text-text">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            id="date-input"
            type="date"
            value={form.date}
            onChange={(e) => set('date')(e.target.value)}
            className="rounded-xl border border-border px-4 py-3 text-sm bg-surface outline-none focus:ring-2 focus:ring-brand/30 text-text"
          />
          {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="notes-input" className="text-sm font-semibold text-text">Notes</label>
          <textarea
            id="notes-input"
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

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-text hover:bg-surface-alt transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: 'var(--brand-gradient)' }}
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
