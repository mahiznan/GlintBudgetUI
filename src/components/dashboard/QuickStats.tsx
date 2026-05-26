import type { Transaction } from '../../firestore/types';
import { formatCurrency } from '../../lib/dateUtils';

interface QuickStatsProps {
  transactions: Transaction[];
  currencySymbol: string;
  periodDays: number;
}

export default function QuickStats({ transactions, currencySymbol, periodDays }: QuickStatsProps) {
  const expenses = transactions
    .filter((t) => t.amount < 0)
    .map((t) => ({ ...t, amount: Math.abs(t.amount) }));

  const highest = expenses.reduce<Transaction | null>(
    (max, t) => (max === null || t.amount > max.amount ? t : max),
    null,
  );

  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const avgPerDay = periodDays > 0 ? totalExpense / periodDays : 0;

  const topPayment = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.payment] = (acc[t.payment] ?? 0) + 1;
    return acc;
  }, {});
  const mostUsedPayment = Object.entries(topPayment).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—';

  const topCatMap = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount;
    return acc;
  }, {});
  const topCategory = Object.entries(topCatMap).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—';

  const items = [
    {
      label: 'Highest spend',
      value: highest ? formatCurrency(highest.amount, currencySymbol) : '—',
    },
    { label: 'Avg / day', value: formatCurrency(avgPerDay, currencySymbol) },
    { label: 'Top payment', value: mostUsedPayment },
    { label: 'Top category', value: topCategory },
  ];

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
        Quick Stats
      </h2>
      <div className="flex flex-col gap-2">
        {items.map(({ label, value }) => (
          <div
            key={label}
            className="flex justify-between items-center py-1 border-b border-border last:border-0"
          >
            <span className="text-xs text-text-muted">{label}</span>
            <span className="text-sm font-semibold text-text">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
