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
      <span className="text-3xl font-bold leading-none text-white">{value}</span>
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
    <div className="hero-gradient w-full px-5 py-6 sm:px-8 sm:py-8 rounded-2xl">
      <div className="flex items-center gap-12">
        {activePlanner && (
          <>
            <MiniBudgetWidget
              planner={activePlanner}
              transactions={transactions}
              onWidgetClick={onPlannerClick}
            />
            <div className="w-px h-12 bg-white/20" aria-hidden="true" />
          </>
        )}
        <StatCard label="Income" value={formatCurrency(totalIncome, currencySymbol)} />
        <div className="w-px h-12 bg-white/20" aria-hidden="true" />
        <div className="pr-6">
          <StatCard label="Expenses" value={formatCurrency(totalExpenses, currencySymbol)} />
        </div>
      </div>
    </div>
  );
}
