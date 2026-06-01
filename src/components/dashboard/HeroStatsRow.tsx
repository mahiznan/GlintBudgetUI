import { formatCurrency } from '../../lib/dateUtils';
import MiniBudgetWidget from './MiniBudgetWidget';
import type { BudgetPlanner, Transaction } from '../../firestore/types';

interface HeroStatsRowProps {
  totalExpenses: number;
  totalIncome: number;
  currencySymbol: string;
  activePlanner?: BudgetPlanner | null;
  transactions?: Transaction[];
  onPlannerClick?: () => void;
}

interface StatCardProps {
  label: string;
  value: string | number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-widest text-white/60">{label}</span>
      <span className="text-xl sm:text-2xl md:text-3xl font-bold leading-none text-white">{value}</span>
    </div>
  );
}

export default function HeroStatsRow({
  totalExpenses,
  totalIncome,
  currencySymbol,
  activePlanner,
  transactions = [],
  onPlannerClick = () => {},
}: HeroStatsRowProps) {
  return (
    <div className="hero-gradient w-full rounded-2xl p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 md:gap-12">
        {activePlanner && (
          <MiniBudgetWidget
            planner={activePlanner}
            transactions={transactions}
            onWidgetClick={onPlannerClick}
          />
        )}
        <div className="flex items-center gap-4 sm:gap-6 md:gap-12 flex-1 min-w-0">
          <StatCard label="Income" value={formatCurrency(totalIncome, currencySymbol)} />
          <div className="w-px h-8 sm:h-12 bg-white/20" aria-hidden="true" />
          <div className="pr-0 sm:pr-6">
            <StatCard label="Expenses" value={formatCurrency(totalExpenses, currencySymbol)} />
          </div>
        </div>
      </div>
    </div>
  );
}
