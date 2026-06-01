import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePlannerAggregation } from '../../hooks/usePlannerAggregation';
import { filterTransactionsForPlanner, formatCurrency } from '../../lib/plannerUtils';
import { useLayout } from '../../context/LayoutContext';
import { PlannerCategoryBar } from './PlannerCategoryBar';
import { PlannerCategoryRadial } from './PlannerCategoryRadial';
import { useUpdatePlanner } from '../../hooks/useMutatePlanner';
import type { BudgetPlanner, CategoryResult, Transaction } from '../../firestore/types';

interface Props {
  planner: BudgetPlanner;
  transactions: Transaction[];
  initialOffset: number;
  onClose: () => void;
}

interface SubCatRow {
  subCategory: string;
  total: number;
  pct: number;
  transactions: Transaction[];
}

function buildSubcategoryBreakdown(txns: Transaction[]): SubCatRow[] {
  const map = new Map<string, { total: number; txns: Transaction[] }>();
  for (const t of txns) {
    const entry = map.get(t.subCategory) ?? { total: 0, txns: [] };
    entry.total += t.amount;
    entry.txns.push(t);
    map.set(t.subCategory, entry);
  }
  const totalSpend = txns.reduce((s, t) => s + t.amount, 0);
  return [...map.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([subCategory, data]) => ({
      subCategory,
      total: data.total,
      pct: totalSpend > 0 ? Math.round((data.total / totalSpend) * 100) : 0,
      transactions: data.txns.sort((a, b) => b.date.getTime() - a.date.getTime()),
    }));
}

function CategoryDrillDown({
  category,
  periodFiltered,
  currency,
}: {
  category: string;
  periodFiltered: Transaction[];
  currency: string;
}) {
  const catTxns = useMemo(
    () => periodFiltered.filter((t) => t.category === category),
    [category, periodFiltered],
  );
  const rows = useMemo(() => buildSubcategoryBreakdown(catTxns), [catTxns]);

  if (catTxns.length === 0) {
    return <p className="text-xs text-text-muted py-2 px-1">No transactions this period.</p>;
  }

  return (
    <div className="mt-2 flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.subCategory} className="bg-surface-alt rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-text">{row.subCategory}</span>
            <span className="text-xs text-text-muted">
              {formatCurrency(row.total, currency)}{' '}
              <span className="text-slate-300">· {row.pct}%</span>
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {row.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs">
                <span className="text-text-muted flex items-center gap-1">
                  <span>{t.date.toLocaleDateString('en', { day: 'numeric', month: 'short' })}</span>
                  <span>·</span>
                  <span>{t.vendor || '—'}</span>
                </span>
                <span className="text-text font-medium">{formatCurrency(t.amount, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryRow({
  result,
  currency,
  isFirstUnplanned,
  expanded,
  onToggle,
  periodFiltered,
}: {
  result: CategoryResult;
  currency: string;
  isFirstUnplanned: boolean;
  expanded: boolean;
  onToggle: () => void;
  periodFiltered: Transaction[];
}) {
  return (
    <div>
      <button
        type="button"
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${result.category}`}
        className="w-full text-left"
        onClick={onToggle}
      >
        <PlannerCategoryBar
          result={result}
          currency={currency}
          isFirstUnplanned={isFirstUnplanned}
        />
        <div className="text-[10px] text-text-muted text-right -mt-1 mb-1">
          {expanded ? '▲ hide transactions' : '▼ show transactions'}
        </div>
      </button>
      {expanded && (
        <CategoryDrillDown
          category={result.category}
          periodFiltered={periodFiltered}
          currency={currency}
        />
      )}
    </div>
  );
}

export function PlannerDetailDrawer({ planner, transactions, initialOffset, onClose }: Props) {
  const [periodOffset, setPeriodOffset] = useState(initialOffset);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [chartView, setChartView] = useState<BudgetPlanner['chartView']>(planner.chartView);
  const { layoutWidth } = useLayout();

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChartView(planner.chartView);
  }, [planner.chartView]);

  function startClose() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') startClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const agg = usePlannerAggregation(planner, transactions, periodOffset);

  const periodFiltered = useMemo(
    () => filterTransactionsForPlanner(planner, transactions, agg.dateRange),
    [planner, transactions, agg.dateRange],
  );

  const allCategories = [...agg.categoryResults, ...agg.unplannedResults];
  const firstUnplannedIndex = allCategories.findIndex((r) => r.status === 'unplanned');
  const canNavigate = planner.repeatable;

  function toggleCategory(category: string) {
    setExpandedCategory((prev) => (prev === category ? null : category));
  }

  const { mutate: updatePlanner } = useUpdatePlanner();

  function handleChartViewToggle(view: BudgetPlanner['chartView']) {
    setChartView(view);
    updatePlanner(planner.id, { chartView: view });
  }

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

      {/* Panel — slides up from bottom */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={planner.name}
        className={[
          'fixed bottom-0 z-50 bg-surface rounded-t-2xl shadow-xl',
          'flex flex-col transition-transform duration-200 ease-out',
          'max-h-[90dvh]',
          layoutWidth === 'fixed'
            ? 'max-w-5xl mx-auto w-full'
            : 'left-0 right-0',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Handle */}
        <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-2 pb-3 border-b border-border shrink-0 gap-3">
          <div className="flex-1">
            <h2 className="font-semibold text-base text-text">{planner.name}</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {agg.periodLabel} · {planner.currency}
            </p>
          </div>
          {/* Bar / Radial toggle */}
          <div className="flex gap-0.5 bg-surface-alt border border-border rounded-md p-0.5 shrink-0">
            <button
              type="button"
              aria-label="Bar view"
              onClick={() => handleChartViewToggle('bar')}
              className={`rounded p-1 transition-all ${
                chartView === 'bar' ? 'bg-surface shadow-sm' : ''
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <rect x="1" y="3" width="12" height="2.2" rx="1" fill={chartView === 'bar' ? 'var(--color-brand)' : '#94a3b8'} />
                <rect x="1" y="6.4" width="8" height="2.2" rx="1" fill={chartView === 'bar' ? 'var(--color-brand)' : '#94a3b8'} />
                <rect x="1" y="9.8" width="10" height="2.2" rx="1" fill={chartView === 'bar' ? 'var(--color-brand)' : '#94a3b8'} />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Radial view"
              onClick={() => handleChartViewToggle('radial')}
              className={`rounded p-1 transition-all ${
                chartView === 'radial' ? 'bg-surface shadow-sm' : ''
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5.5" stroke="#e2e8f0" strokeWidth="2" />
                <circle
                  cx="7" cy="7" r="5.5"
                  stroke={chartView === 'radial' ? 'var(--color-brand)' : '#94a3b8'}
                  strokeWidth="2"
                  strokeDasharray="21.5 13"
                  strokeLinecap="round"
                  transform="rotate(-90 7 7)"
                />
              </svg>
            </button>
          </div>
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

        {/* Summary */}
        <div className="flex gap-4 px-5 py-3 border-b border-border shrink-0">
          {(
            [
              { label: 'Planned', value: agg.summary.totalPlanned },
              { label: 'Spent', value: agg.summary.totalSpent },
              { label: 'Remaining', value: agg.summary.totalRemaining },
            ] as const
          ).map(({ label, value }) => (
            <div key={label}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {label}
              </div>
              <div
                className={`text-sm font-bold ${label === 'Remaining' && value < 0 ? 'text-red-500' : 'text-text'}`}
              >
                {value < 0 ? '-' : ''}
                {formatCurrency(Math.abs(value), planner.currency)}
              </div>
            </div>
          ))}
        </div>

        {/* Period nav */}
        {canNavigate && (
          <div className="flex items-center justify-between px-5 py-2 border-b border-border text-xs text-text-muted shrink-0">
            <button
              type="button"
              aria-label="Previous period"
              onClick={() => {
                setPeriodOffset((o) => o - 1);
                setExpandedCategory(null);
              }}
              className="hover:text-text transition-colors"
            >
              ‹ Prev
            </button>
            <span aria-hidden="true">
              {agg.isCurrentPeriod ? '●' : agg.periodLabel}
            </span>
            <button
              type="button"
              aria-label="Next period"
              disabled={periodOffset >= 0}
              onClick={() => {
                setPeriodOffset((o) => Math.min(0, o + 1));
                setExpandedCategory(null);
              }}
              className="hover:text-text transition-colors disabled:opacity-40"
            >
              Next ›
            </button>
          </div>
        )}

        {/* Scrollable category list */}
        <div className="overflow-y-auto px-5 py-3 flex-1">
          {allCategories.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">
              No transactions match this planner for the selected period.
            </p>
          )}
          {chartView === 'bar' ? (
            <>
              {allCategories.map((result, idx) => (
                <CategoryRow
                  key={result.category}
                  result={result}
                  currency={planner.currency}
                  isFirstUnplanned={idx === firstUnplannedIndex}
                  expanded={expandedCategory === result.category}
                  onToggle={() => toggleCategory(result.category)}
                  periodFiltered={periodFiltered}
                />
              ))}
            </>
          ) : (
            <div className="grid grid-cols-4 gap-1 py-1">
              {allCategories.map((result) => (
                <PlannerCategoryRadial
                  key={result.category}
                  result={result}
                  currency={planner.currency}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
