import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../lib/dateUtils';
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';
import type { CategoryItem } from './CategoryBreakdown';

interface IncomeExpenseDonutProps {
  categories: CategoryItem[];
  mode: 'expense' | 'income';
  currencySymbol: string;
}

export default function IncomeExpenseDonut({
  categories,
  mode,
  currencySymbol,
}: IncomeExpenseDonutProps) {
  const { themeId } = useTheme();
  const theme = getTheme(themeId);
  const total = categories.reduce((s, c) => s + c.total, 0);
  const title = mode === 'expense' ? 'Expense by Category' : 'Income by Category';

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">{title}</h2>
      {categories.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">
          No {mode === 'expense' ? 'expenses' : 'income'} for this period
        </p>
      ) : (
        <>
          <div className="relative" style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="total"
                  nameKey="name"
                  strokeWidth={0}
                >
                  {categories.map((_, i) => (
                    <Cell key={i} fill={theme.categoryColors[i % theme.categoryColors.length]!} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => formatCurrency(v as number, currencySymbol)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xl font-bold text-text">
                  {formatCurrency(total, currencySymbol)}
                </p>
                <p className="text-xs text-text-muted">
                  {mode === 'expense' ? 'expenses' : 'income'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
            {categories.map(({ name }, i) => (
              <span key={name} className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: theme.categoryColors[i % theme.categoryColors.length] }}
                />
                <span className="font-semibold text-text">{name}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
