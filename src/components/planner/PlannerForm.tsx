import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePreferenceContext } from '../../context/PreferenceContext';
import { useLayout } from '../../context/LayoutContext';
import { useAddPlanner, useUpdatePlanner } from '../../hooks/useMutatePlanner';
import { computeEffectiveDates } from '../../lib/plannerUtils';
import type { BudgetPlanner, PlannerPeriod } from '../../firestore/types';

interface FormState {
  name: string;
  description: string;
  currency: string;
  period: PlannerPeriod;
  customStart: string;
  customEnd: string;
  repeatable: boolean;
  filterAccounts: string[];
  filterVendors: string[];
  filterPayments: string[];
  categoryBudgets: Record<string, string>;
}

interface FormErrors {
  name?: string;
  currency?: string;
  customStart?: string;
  customEnd?: string;
}

function makeEmpty(defaultCurrency: string): FormState {
  return {
    name: '',
    description: '',
    currency: defaultCurrency,
    period: 'monthly',
    customStart: '',
    customEnd: '',
    repeatable: true,
    filterAccounts: [],
    filterVendors: [],
    filterPayments: [],
    categoryBudgets: {},
  };
}

function plannerToForm(planner: BudgetPlanner): FormState {
  const budgets: Record<string, string> = {};
  for (const { category, amount } of planner.categoryBudgets) {
    budgets[category] = amount === 0 ? '0' : String(amount);
  }
  return {
    name: planner.name,
    description: planner.description,
    currency: planner.currency,
    period: planner.period,
    customStart: planner.customStart
      ? planner.customStart.toISOString().slice(0, 10)
      : '',
    customEnd: planner.customEnd
      ? planner.customEnd.toISOString().slice(0, 10)
      : '',
    repeatable: planner.repeatable,
    filterAccounts: planner.filterAccounts,
    filterVendors: planner.filterVendors,
    filterPayments: planner.filterPayments,
    categoryBudgets: budgets,
  };
}

function validate(state: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!state.name.trim()) errors.name = 'Name is required';
  if (!state.currency) errors.currency = 'Currency is required';
  if (state.period === 'custom') {
    if (!state.customStart) errors.customStart = 'Start date is required';
    if (!state.customEnd) errors.customEnd = 'End date is required';
    if (state.customStart && state.customEnd && state.customStart >= state.customEnd)
      errors.customEnd = 'End date must be after start date';
  }
  return errors;
}

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

interface Props {
  uid: string;
  mode: 'create' | 'edit';
  initial?: BudgetPlanner;
  onClose: () => void;
}

export function PlannerForm({ uid, mode, initial, onClose }: Props) {
  const { preference } = usePreferenceContext();
  const { layoutWidth } = useLayout();
  const { mutate: addPlanner } = useAddPlanner();
  const { mutate: updatePlanner } = useUpdatePlanner();

  const defaultCurrency = preference?.defaultCurrency.code ?? '';
  const [form, setForm] = useState<FormState>(() =>
    mode === 'edit' && initial ? plannerToForm(initial) : makeEmpty(defaultCurrency),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') startClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startClose() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSubmit() {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    // Build categoryBudgets: only rows with a non-empty value entered
    const categoryBudgets = (preference?.categories ?? [])
      .filter(
        (cat) =>
          form.categoryBudgets[cat.name] !== undefined &&
          form.categoryBudgets[cat.name] !== '',
      )
      .map((cat) => ({
        category: cat.name,
        amount: Math.max(0, parseFloat(form.categoryBudgets[cat.name] ?? '0') || 0),
      }));

    // Compute concrete dates for non-repeatable non-custom planners
    let customStart: Date | undefined;
    let customEnd: Date | undefined;
    if (form.period === 'custom') {
      customStart = new Date(form.customStart);
      customEnd = new Date(form.customEnd);
    } else if (!form.repeatable) {
      const eff = computeEffectiveDates(form.period);
      customStart = eff.customStart;
      customEnd = eff.customEnd;
    }

    if (mode === 'edit' && initial) {
      updatePlanner(initial.id, {
        user_id: uid,
        name: form.name.trim(),
        description: form.description.trim(),
        currency: form.currency,
        // Preserve active/archived — managed separately by toggle and archive action
        active: initial.active,
        archived: initial.archived,
        period: form.period,
        customStart,
        customEnd,
        repeatable: form.repeatable,
        filterAccounts: form.filterAccounts,
        filterVendors: form.filterVendors,
        filterPayments: form.filterPayments,
        categoryBudgets,
        chartView: initial.chartView,
      });
    } else {
      addPlanner({
        user_id: uid,
        name: form.name.trim(),
        description: form.description.trim(),
        currency: form.currency,
        active: true,
        archived: false,
        period: form.period,
        customStart,
        customEnd,
        repeatable: form.repeatable,
        filterAccounts: form.filterAccounts,
        filterVendors: form.filterVendors,
        filterPayments: form.filterPayments,
        categoryBudgets,
        chartView: 'bar',
      });
    }
    startClose();
  }

  const PERIODS: { key: PlannerPeriod; label: string }[] = [
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
    { key: 'custom', label: 'Custom' },
  ];

  const bookmarked = preference?.bookmarkedCurrencies ?? [];
  const categories = preference?.categories ?? [];
  const accounts = preference?.accounts ?? [];
  const payments = preference?.payments ?? [];
  const vendors = preference?.vendors ?? [];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
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
        aria-label={mode === 'create' ? 'New Budget Planner' : 'Edit Budget Planner'}
        className={[
          'fixed bottom-0 z-50 bg-surface rounded-t-2xl shadow-xl w-full',
          'flex flex-col transition-transform duration-200 ease-out max-h-[95dvh]',
          layoutWidth === 'fixed'
            ? 'left-1/2 -translate-x-1/2 max-w-5xl'
            : 'left-0 right-0',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Handle */}
        <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-border shrink-0">
          <h2 className="font-semibold text-base text-text">
            {mode === 'create' ? 'New Budget Planner' : 'Edit Planner'}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={startClose}
            className="text-text-muted hover:text-text transition-colors p-1 -mr-1"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="overflow-y-auto px-5 py-4 flex-1 flex flex-col gap-5">
          {/* ── Name & Description ── */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              Basic Info
            </label>
            <input
              type="text"
              placeholder="Planner name *"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={[
                'w-full border rounded-lg px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40',
                errors.name ? 'border-red-400' : 'border-border',
              ].join(' ')}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            <input
              type="text"
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>

          {/* ── Currency ── */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              Currency
            </label>
            <select
              value={form.currency}
              onChange={(e) => set('currency', e.target.value)}
              className={[
                'w-full border rounded-lg px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40',
                errors.currency ? 'border-red-400' : 'border-border',
              ].join(' ')}
            >
              {bookmarked.length === 0 && <option value="">Select currency</option>}
              {bookmarked.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            {errors.currency && <p className="text-xs text-red-500">{errors.currency}</p>}
          </div>

          {/* ── Period ── */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              Period
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PERIODS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  onClick={() => set('period', key)}
                  className={[
                    'rounded-lg py-2 text-xs font-medium border transition-all',
                    form.period === key
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border text-text-muted hover:border-brand/50',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom date range */}
            {form.period === 'custom' && (
              <div className="flex gap-2 mt-1">
                <div className="flex-1">
                  <label
                    htmlFor="custom-start"
                    className="text-xs text-text-muted mb-0.5 block"
                  >
                    Start date
                  </label>
                  <input
                    id="custom-start"
                    type="date"
                    value={form.customStart}
                    onChange={(e) => set('customStart', e.target.value)}
                    className={[
                      'w-full border rounded-lg px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40',
                      errors.customStart ? 'border-red-400' : 'border-border',
                    ].join(' ')}
                  />
                  {errors.customStart && (
                    <p className="text-xs text-red-500 mt-0.5">{errors.customStart}</p>
                  )}
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="custom-end"
                    className="text-xs text-text-muted mb-0.5 block"
                  >
                    End date
                  </label>
                  <input
                    id="custom-end"
                    type="date"
                    value={form.customEnd}
                    onChange={(e) => set('customEnd', e.target.value)}
                    className={[
                      'w-full border rounded-lg px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40',
                      errors.customEnd ? 'border-red-400' : 'border-border',
                    ].join(' ')}
                  />
                  {errors.customEnd && (
                    <p className="text-xs text-red-500 mt-0.5">{errors.customEnd}</p>
                  )}
                </div>
              </div>
            )}

            {/* Repeatable toggle */}
            <div className="flex items-center justify-between bg-surface-alt border border-border rounded-lg px-3 py-2 mt-1">
              <span className="text-sm text-text">Repeatable?</span>
              <button
                type="button"
                role="switch"
                aria-checked={form.repeatable}
                onClick={() => set('repeatable', !form.repeatable)}
                className={[
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                  form.repeatable ? 'bg-brand' : 'bg-border',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                    form.repeatable ? 'translate-x-4' : 'translate-x-0.5',
                  ].join(' ')}
                />
              </button>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              Filters{' '}
              <span className="font-normal normal-case text-text-muted">
                (empty = include all)
              </span>
            </label>

            {(
              [
                { label: 'Accounts', items: accounts, field: 'filterAccounts' as const },
                { label: 'Payments', items: payments, field: 'filterPayments' as const },
                { label: 'Vendors', items: vendors, field: 'filterVendors' as const },
              ] as const
            ).map(({ label, items, field }) => (
              <div key={field}>
                <p className="text-xs text-text-muted mb-1.5">{label}</p>
                {items.length === 0 ? (
                  <p className="text-xs text-slate-300 italic">None configured</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => {
                      const selected = (form[field] as string[]).includes(item.name);
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() =>
                            set(field, toggleInArray(form[field] as string[], item.name))
                          }
                          className={[
                            'rounded-full px-3 py-1 text-xs border transition-all',
                            selected
                              ? 'bg-brand/10 border-brand text-brand'
                              : 'border-border text-text-muted hover:border-brand/50',
                          ].join(' ')}
                        >
                          {item.emoji ? `${item.emoji} ` : ''}
                          {item.name}
                          {selected && ' ✕'}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Category Budgets ── */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              Category Budgets ({form.currency})
            </label>
            <p className="text-xs text-text-muted -mt-1">
              Leave blank to skip. Enter 0 to track without a limit.
            </p>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_auto] bg-surface-alt px-3 py-1.5 border-b border-border">
                <span className="text-xs font-semibold text-text-muted">Category</span>
                <span className="text-xs font-semibold text-text-muted">Budget</span>
              </div>
              {categories.map((cat, idx) => (
                <div
                  key={cat.name}
                  className={[
                    'grid grid-cols-[1fr_auto] items-center px-3 py-2 gap-3',
                    idx < categories.length - 1 ? 'border-b border-border' : '',
                  ].join(' ')}
                >
                  <span className="text-sm text-text truncate">
                    {cat.emoji ? `${cat.emoji} ` : ''}
                    {cat.name}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="—"
                    value={form.categoryBudgets[cat.name] ?? ''}
                    onChange={(e) =>
                      set('categoryBudgets', {
                        ...form.categoryBudgets,
                        [cat.name]: e.target.value,
                      })
                    }
                    className="w-20 text-right border border-border rounded-md px-2 py-1 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </div>
              ))}
              {categories.length === 0 && (
                <p className="px-3 py-3 text-xs text-text-muted italic">
                  No categories configured. Add them in Settings → Categories first.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <button
            type="button"
            aria-label="Save planner"
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-gradient, var(--color-brand))' }}
          >
            Save Planner
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
