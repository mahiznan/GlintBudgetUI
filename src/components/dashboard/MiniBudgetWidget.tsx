import { usePlannerAggregation } from '../../hooks/usePlannerAggregation';
import { formatCurrency } from '../../lib/plannerUtils';
import type { BudgetPlanner, Transaction } from '../../firestore/types';

interface MiniBudgetWidgetProps {
  planner: BudgetPlanner;
  transactions: Transaction[];
  onWidgetClick: () => void;
}

function getProgressBarColor(percentage: number): string {
  if (percentage < 75) {
    return 'from-green-500 to-green-700';
  }
  if (percentage <= 100) {
    return 'from-amber-500 to-amber-600';
  }
  return 'from-red-500 to-red-700';
}

export default function MiniBudgetWidget({
  planner,
  transactions,
  onWidgetClick,
}: MiniBudgetWidgetProps) {
  const agg = usePlannerAggregation(planner, transactions, 0);

  const { totalPlanned, totalSpent, totalRemaining } = agg.summary;

  // Calculate percentage, capping at 100% for display purposes but allowing values > 100 for color logic
  const percentageValue = totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0;
  const displayPercentage = Math.min(percentageValue, 100);

  const barColor = getProgressBarColor(percentageValue);

  return (
    <button
      onClick={onWidgetClick}
      className="ml-0 sm:ml-4 my-3 bg-white/10 border border-white/20 rounded-xl p-3 sm:p-4 text-white cursor-pointer hover:bg-white/15 transition-colors w-full sm:w-auto"
    >
      <div className="flex flex-col gap-2 sm:gap-3">
        {/* Header: Planner Name • Period Label - Top Left */}
        <div className="text-xs sm:text-sm font-semibold text-white/80 text-left truncate">
          {planner.name} • {agg.periodLabel}
        </div>

        {/* Amounts Row: Budget | Spent | Remaining */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/60 truncate">
              Budget
            </span>
            <span className="text-lg sm:text-2xl font-bold text-white truncate">
              {formatCurrency(totalPlanned, planner.currency)}
            </span>
          </div>

          <div className="w-px h-8 sm:h-12 bg-white/20 shrink-0" aria-hidden="true" />

          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/60 truncate">
              Spent
            </span>
            <span className="text-lg sm:text-2xl font-bold text-white truncate">
              {formatCurrency(totalSpent, planner.currency)}
            </span>
          </div>

          <div className="w-px h-8 sm:h-12 bg-white/20 shrink-0" aria-hidden="true" />

          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/60 truncate">
              Remaining
            </span>
            <span className="text-lg sm:text-2xl font-bold text-white truncate">
              {formatCurrency(Math.max(0, totalRemaining), planner.currency)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col gap-2">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              data-testid="progress-bar"
              className={`h-full bg-gradient-to-r ${barColor} transition-all`}
              style={{ width: `${displayPercentage}%` }}
            />
          </div>

          {/* Percentage Text */}
          <div className="text-right text-xs text-white/60">
            {percentageValue}% of budget
          </div>
        </div>
      </div>
    </button>
  );
}
