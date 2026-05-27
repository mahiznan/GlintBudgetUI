import { formatCurrency } from '../../lib/plannerUtils';
import type { CategoryResult } from '../../firestore/types';

const BAR_COLOR: Record<CategoryResult['status'], string> = {
  exceeded: '#ef4444',
  near: '#f97316',
  ok: 'var(--color-brand)',
  'no-budget': '#cbd5e1',
  unplanned: '#cbd5e1',
};

const REMAIN_COLOR: Record<CategoryResult['status'], string> = {
  exceeded: 'text-red-500',
  near: 'text-orange-500',
  ok: 'text-green-600',
  'no-budget': '',
  unplanned: '',
};

interface Props {
  result: CategoryResult;
  currency: string;
  /** True when this is the first unplanned entry — renders the dashed divider above it */
  isFirstUnplanned: boolean;
}

export function PlannerCategoryBar({ result, currency, isFirstUnplanned }: Props) {
  const isUnplanned = result.status === 'unplanned';
  const isNoBudget = result.status === 'no-budget';

  function remainLabel(): string {
    if (isUnplanned || isNoBudget) return '';
    if (result.remaining < 0)
      return `${formatCurrency(Math.abs(result.remaining), currency)} exceeded 🔴`;
    if (result.status === 'near')
      return `${formatCurrency(result.remaining, currency)} left ⚠️`;
    return `${formatCurrency(result.remaining, currency)} remaining`;
  }

  const label = remainLabel();

  return (
    <div
      className={[
        'mb-2',
        isFirstUnplanned ? 'mt-2 pt-2 border-t border-dashed border-border' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span
          className={`text-xs font-medium truncate max-w-[55%] ${isUnplanned || isNoBudget ? 'text-text-muted' : 'text-text'}`}
        >
          {result.category}
          {isUnplanned && (
            <span className="ml-1.5 text-[10px] bg-yellow-100 text-yellow-800 rounded px-1 py-0.5">
              unplanned
            </span>
          )}
          {isNoBudget && (
            <span className="ml-1.5 text-[10px] text-slate-400">no budget set</span>
          )}
        </span>
        <span className="text-xs text-text-muted shrink-0">
          {formatCurrency(result.spent, currency)}
          {result.planned > 0 && (
            <span className="text-slate-300">
              {' '}/ {formatCurrency(result.planned, currency)}
            </span>
          )}
        </span>
      </div>

      <div className="h-2 rounded-full overflow-hidden bg-border">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${result.pct}%`, background: BAR_COLOR[result.status] }}
        />
      </div>

      {label && (
        <div className={`text-[11px] text-right mt-0.5 ${REMAIN_COLOR[result.status]}`}>
          {label}
        </div>
      )}
    </div>
  );
}
