import { formatCurrency } from '../../lib/dateUtils';

interface HeroStatsRowProps {
  totalExpenses: number;
  totalIncome: number;
  currencySymbol: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-widest text-white/60">
        {label}
      </span>
      <span className="text-3xl font-bold leading-none text-white">
        {value}
      </span>
    </div>
  );
}

export default function HeroStatsRow({
  totalExpenses,
  totalIncome,
  currencySymbol,
}: HeroStatsRowProps) {
  return (
    <div className="hero-gradient w-full px-8 py-8 rounded-2xl">
      <div className="flex items-center gap-12 flex-wrap">
        <StatCard
          label="Income"
          value={formatCurrency(totalIncome, currencySymbol)}
        />
        <div className="w-px h-12 bg-white/20" aria-hidden="true" />
        <StatCard
          label="Expenses"
          value={formatCurrency(totalExpenses, currencySymbol)}
        />
      </div>
    </div>
  );
}
