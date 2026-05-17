import { formatCurrency } from '../../lib/dateUtils';

interface HeroStatsRowProps {
  totalSpent: number;
  totalIncome: number;
  netBalance: number;
  txCount: number;
  currencySymbol: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
  highlight?: boolean;
}

function StatCard({ label, value, accent, highlight }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-widest text-white/60">
        {label}
      </span>
      <span
        className={[
          'text-3xl font-bold leading-none',
          highlight ? 'gradient-text' : accent ? 'income-gradient-text' : 'text-white',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}

export default function HeroStatsRow({
  totalSpent,
  totalIncome,
  netBalance,
  txCount,
  currencySymbol,
}: HeroStatsRowProps) {
  return (
    <div
      className="hero-gradient w-full px-8 py-8"
      style={{ borderRadius: '0 0 24px 24px' }}
    >
      <div className="flex items-center gap-12 flex-wrap">
        <StatCard
          label="Net Balance"
          value={formatCurrency(netBalance, currencySymbol)}
          highlight
        />
        <div className="w-px h-12 bg-white/20" aria-hidden="true" />
        <StatCard
          label="Income"
          value={formatCurrency(totalIncome, currencySymbol)}
          accent
        />
        <div className="w-px h-12 bg-white/20" aria-hidden="true" />
        <StatCard
          label="Total Spent"
          value={formatCurrency(totalSpent, currencySymbol)}
        />
        <div className="w-px h-12 bg-white/20" aria-hidden="true" />
        <StatCard label="Transactions" value={txCount} />
      </div>
    </div>
  );
}
