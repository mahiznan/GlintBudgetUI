import { useMemo } from 'react';
import type { Transaction } from '../../firestore/types';
import { formatCurrency } from '../../lib/dateUtils';

interface CategoryBreakdownProps {
  transactions: Transaction[];
  currencySymbol: string;
}

const CATEGORY_COLORS = [
  '#007836', '#1fa32e', '#96bf0d', '#059669', '#0d9488',
];

export default function CategoryBreakdown({ transactions, currencySymbol }: CategoryBreakdownProps) {
  const categories = useMemo(() => {
    const expenseTxns = transactions.filter((t) => t.amount < 0);
    const totals = expenseTxns.reduce<Record<string, { total: number; icon: string }>>(
      (acc, t) => {
        if (!acc[t.category]) acc[t.category] = { total: 0, icon: t.icon };
        acc[t.category]!.total += Math.abs(t.amount);
        return acc;
      },
      {},
    );
    const sum = Object.values(totals).reduce((s, { total }) => s + total, 0);
    return Object.entries(totals)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5)
      .map(([name, { total, icon }]) => ({
        name,
        icon,
        total,
        pct: sum > 0 ? Math.round((total / sum) * 100) : 0,
      }));
  }, [transactions]);

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">By Category</h2>
      {categories.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">No data for this period</p>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map(({ name, icon, total, pct }, i) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-lg w-6 text-center">{icon || '📦'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-text truncate">{name}</span>
                  <span className="text-xs text-text-muted ml-2 flex-shrink-0">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                  />
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-text flex-shrink-0">
                {formatCurrency(total, currencySymbol)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
