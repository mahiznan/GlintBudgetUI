import { formatCurrency, formatDateShort } from '../../lib/dateUtils';
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';
import type { Transaction } from '../../firestore/types';

export interface CategoryItem {
  name: string;
  icon: string;
  total: number;
  pct: number;
  symbol?: string;
  key?: string;
}

export type Mode = 'expense' | 'income';
export type GroupBy = 'category' | 'account' | 'currency' | 'vendor' | 'payment';

const GROUP_LABELS: Record<GroupBy, string> = {
  category: 'Category',
  account: 'Account',
  currency: 'Currency',
  vendor: 'Vendor',
  payment: 'Payment',
};

interface CategoryBreakdownProps {
  categories: CategoryItem[];
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  currencySymbol: string;
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  drillLevel?: number;
  drillLabel?: string;
  backLabel?: string;
  onItemClick?: (name: string) => void;
  onBack?: () => void;
  transactions?: Transaction[];
  onEdit?: (id: string) => void;
}

export default function CategoryBreakdown({
  categories,
  mode,
  onModeChange,
  currencySymbol,
  groupBy,
  onGroupByChange,
  drillLevel = 0,
  drillLabel,
  backLabel,
  onItemClick,
  onBack,
  transactions,
  onEdit,
}: CategoryBreakdownProps) {
  const { themeId } = useTheme();
  const theme = getTheme(themeId);

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {drillLevel > 0 ? (
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-text-muted hover:text-text transition-colors flex-shrink-0"
            >
              {backLabel}
            </button>
            <span className="text-sm font-semibold text-text truncate">{drillLabel}</span>
          </div>
        ) : (
          <select
            aria-label="Group by"
            value={groupBy}
            onChange={(e) => onGroupByChange(e.target.value as GroupBy)}
            className="text-xs font-semibold text-text-muted bg-surface-alt border border-border rounded-lg px-2 py-1 cursor-pointer"
          >
            {(Object.keys(GROUP_LABELS) as GroupBy[]).map((g) => (
              <option key={g} value={g}>
                {GROUP_LABELS[g]}
              </option>
            ))}
          </select>
        )}
        {drillLevel === 0 && (
          <div className="inline-flex rounded-lg border border-border bg-surface-alt p-0.5 gap-0.5 flex-shrink-0">
            {(['expense', 'income'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className={[
                  'rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all',
                  mode === m ? 'text-white shadow-sm' : 'text-text-muted hover:text-text',
                ].join(' ')}
                style={
                  mode === m
                    ? { background: m === 'expense' ? 'var(--expense-gradient)' : 'var(--brand-gradient)' }
                    : undefined
                }
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {transactions !== undefined ? (
        transactions.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No transactions</p>
        ) : (
          <div className="flex flex-col gap-1">
            {transactions.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onEdit?.(t.id)}
                className="w-full flex items-center gap-3 px-1 py-2 rounded-xl hover:bg-surface-alt transition-colors text-left"
              >
                <span className="text-lg w-6 text-center">{t.icon || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-text truncate block">{t.vendor}</span>
                  <span className="text-xs text-text-muted">{formatDateShort(t.date)}</span>
                </div>
                <span
                  className={`text-xs font-bold flex-shrink-0 ${
                    t.amount < 0 ? 'text-red-600' : 'text-brand'
                  }`}
                >
                  {t.amount < 0 ? '-' : '+'}
                  {formatCurrency(Math.abs(t.amount), currencySymbol)}
                </span>
              </button>
            ))}
          </div>
        )
      ) : categories.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">
          No {mode === 'expense' ? 'expenses' : 'income'} for this period
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map(({ name, icon, total, pct, symbol, key }, i) => {
            const barContent = (
              <>
                <span className="text-lg w-6 text-center">{icon || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-text truncate">{name}</span>
                    <span className="text-xs text-text-muted ml-2 flex-shrink-0">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: theme.categoryColors[i % theme.categoryColors.length]!,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-text flex-shrink-0">
                  {formatCurrency(total, symbol ?? currencySymbol)}
                </span>
              </>
            );

            return onItemClick ? (
              <button
                key={name}
                type="button"
                onClick={() => onItemClick(key ?? name)}
                className="w-full flex items-center gap-3 cursor-pointer rounded-xl px-1 py-0.5 hover:bg-surface-alt transition-colors text-left"
              >
                {barContent}
                <span className="text-text-muted text-xs flex-shrink-0">›</span>
              </button>
            ) : (
              <div key={name} className="flex items-center gap-3">
                {barContent}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
