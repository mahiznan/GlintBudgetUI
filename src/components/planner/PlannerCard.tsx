import { useState } from 'react';
import { usePlannerAggregation } from '../../hooks/usePlannerAggregation';
import { useUpdatePlanner } from '../../hooks/useMutatePlanner';
import { formatCurrency } from '../../lib/plannerUtils';
import { PlannerCategoryBar } from './PlannerCategoryBar';
import { PlannerCategoryRadial } from './PlannerCategoryRadial';
import type { BudgetPlanner, Transaction } from '../../firestore/types';

const MAX_VISIBLE = 8;

interface Props {
  planner: BudgetPlanner;
  transactions: Transaction[];
  /** Called when the card body is tapped. Receives the current periodOffset. */
  onCardClick: (periodOffset: number) => void;
}

function BarIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="3" width="12" height="2.2" rx="1" fill={active ? 'var(--color-brand)' : '#94a3b8'} />
      <rect x="1" y="6.4" width="8" height="2.2" rx="1" fill={active ? 'var(--color-brand)' : '#94a3b8'} />
      <rect x="1" y="9.8" width="10" height="2.2" rx="1" fill={active ? 'var(--color-brand)' : '#94a3b8'} />
    </svg>
  );
}

function RadialIcon({ active }: { active: boolean }) {
  const c = active ? 'var(--color-brand)' : '#94a3b8';
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="#e2e8f0" strokeWidth="2" />
      <circle
        cx="7" cy="7" r="5.5"
        stroke={c}
        strokeWidth="2"
        strokeDasharray="21.5 13"
        strokeLinecap="round"
        transform="rotate(-90 7 7)"
      />
    </svg>
  );
}

export function PlannerCard({ planner, transactions, onCardClick }: Props) {
  const [periodOffset, setPeriodOffset] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const { mutate: updatePlanner } = useUpdatePlanner();

  const agg = usePlannerAggregation(planner, transactions, periodOffset);

  const allCategories = [...agg.categoryResults, ...agg.unplannedResults];
  const visibleCategories = expanded ? allCategories : allCategories.slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, allCategories.length - MAX_VISIBLE);
  const firstUnplannedIndex = allCategories.findIndex((r) => r.status === 'unplanned');

  const canNavigate = planner.repeatable;

  function handleToggle(view: BudgetPlanner['chartView']) {
    updatePlanner(planner.id, { chartView: view });
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* ── Card header: tappable area + chart toggle side by side ── */}
      <div className="flex items-start gap-2 p-4 pb-3 hover:bg-surface-alt/50 transition-colors">
        {/* Tappable body (name + period + summary) */}
        <button
          type="button"
          aria-label="Open planner detail"
          className="text-left flex-1 min-w-0"
          onClick={() => onCardClick(periodOffset)}
        >
          <div className="mb-3">
            <h3 className="font-semibold text-sm text-text truncate">{planner.name}</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {agg.periodLabel} · {planner.currency}
              {!agg.isCurrentPeriod && (
                <span className="ml-1 text-[10px] bg-surface-alt border border-border rounded px-1">
                  past
                </span>
              )}
            </p>
          </div>

          {/* Summary row */}
          <div className="flex gap-4">
            {(
              [
                { label: 'Planned', value: agg.summary.totalPlanned },
                { label: 'Spent', value: agg.summary.totalSpent },
                { label: 'Remaining', value: agg.summary.totalRemaining },
              ] as const
            ).map(({ label, value }) => (
              <div key={label} className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {label}
                </span>
                <span
                  className={`text-sm font-bold leading-tight ${
                    label === 'Remaining' && value < 0 ? 'text-red-500' : 'text-text'
                  }`}
                >
                  {value < 0 ? '-' : ''}
                  {formatCurrency(Math.abs(value), planner.currency)}
                </span>
              </div>
            ))}
          </div>
        </button>

        {/* Bar / Radial toggle — outside the main button to avoid nesting */}
        <div className="flex gap-0.5 bg-surface-alt border border-border rounded-md p-0.5 shrink-0">
          <button
            type="button"
            aria-label="Bar view"
            onClick={() => handleToggle('bar')}
            className={`rounded p-1 transition-all ${
              planner.chartView === 'bar' ? 'bg-surface shadow-sm' : ''
            }`}
          >
            <BarIcon active={planner.chartView === 'bar'} />
          </button>
          <button
            type="button"
            aria-label="Radial view"
            onClick={() => handleToggle('radial')}
            className={`rounded p-1 transition-all ${
              planner.chartView === 'radial' ? 'bg-surface shadow-sm' : ''
            }`}
          >
            <RadialIcon active={planner.chartView === 'radial'} />
          </button>
        </div>
      </div>

      {/* ── Category list ── */}
      <div className="px-4 pb-1" onClick={(e) => e.stopPropagation()}>
        {planner.chartView === 'bar' ? (
          <>
            {visibleCategories.map((r, idx) => (
              <PlannerCategoryBar
                key={r.category}
                result={r}
                currency={planner.currency}
                isFirstUnplanned={idx === firstUnplannedIndex}
              />
            ))}
          </>
        ) : (
          <div className="grid grid-cols-4 gap-1 py-1">
            {visibleCategories.map((r) => (
              <PlannerCategoryRadial key={r.category} result={r} currency={planner.currency} />
            ))}
          </div>
        )}

        {/* Expand / collapse */}
        {!expanded && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full text-center text-xs text-text-muted py-2 hover:text-text transition-colors"
          >
            + {hiddenCount} more
          </button>
        )}
        {expanded && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="w-full text-center text-xs text-text-muted py-1.5 hover:text-text transition-colors"
          >
            ↑ Show less
          </button>
        )}
      </div>

      {/* ── Period navigation footer (repeatable planners only) ── */}
      {canNavigate && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-surface-alt text-xs text-text-muted mt-auto">
          <button
            type="button"
            aria-label="Previous period"
            onClick={() => {
              setPeriodOffset((o) => o - 1);
              setExpanded(false);
            }}
            className="hover:text-text transition-colors px-1"
          >
            ‹ Prev
          </button>
          <span className="text-center leading-tight">
            {agg.isCurrentPeriod ? 'current' : agg.periodLabel}
          </span>
          <button
            type="button"
            aria-label="Next period"
            onClick={() => {
              setPeriodOffset((o) => Math.min(0, o + 1));
              setExpanded(false);
            }}
            disabled={periodOffset >= 0}
            className="hover:text-text transition-colors px-1 disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
