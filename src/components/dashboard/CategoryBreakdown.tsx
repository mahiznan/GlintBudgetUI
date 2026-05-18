import { useMemo, useState } from 'react';
import type { Transaction } from '../../firestore/types';
import { formatCurrency } from '../../lib/dateUtils';
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';

type Mode = 'expense' | 'income';

interface CategoryBreakdownProps {
  transactions: Transaction[];
  currencySymbol: string;
}

export default function CategoryBreakdown({ transactions, currencySymbol }: CategoryBreakdownProps) {
  const { themeId } = useTheme();
  const theme = getTheme(themeId);
  const [mode, setMode] = useState<Mode>('expense');

  const categories = useMemo(() => {
    const filtered =
      mode === 'expense'
        ? transactions.filter((t) => t.amount < 0)
        : transactions.filter((t) => t.amount > 0);
    const totals = filtered.reduce<Record<string, { total: number; icon: string }>>(
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
  }, [transactions, mode]);

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">By Category</h2>
        <div className="inline-flex rounded-lg border border-border bg-surface-alt p-0.5 gap-0.5">
          {(['expense', 'income'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={[
                'rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all',
                mode === m
                  ? m === 'expense'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-white shadow-sm'
                  : 'text-text-muted hover:text-text',
              ].join(' ')}
              style={mode === m && m === 'income' ? { background: 'var(--brand-gradient)' } : undefined}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      {categories.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">
          No {mode === 'expense' ? 'expenses' : 'income'} for this period
        </p>
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
                    style={{ width: `${pct}%`, background: theme.categoryColors[i % theme.categoryColors.length]! }}
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
