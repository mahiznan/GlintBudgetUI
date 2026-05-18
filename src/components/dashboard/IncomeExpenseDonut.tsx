import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../lib/dateUtils';
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';

interface IncomeExpenseDonutProps {
  income: number;
  expenses: number;
  currencySymbol: string;
}

export default function IncomeExpenseDonut({
  income,
  expenses,
  currencySymbol,
}: IncomeExpenseDonutProps) {
  const { themeId } = useTheme();
  const theme = getTheme(themeId);
  const CHART_COLORS = [theme.chartColor, '#dc2626'] as const;
  const data = [
    { name: 'Income', value: income },
    { name: 'Expenses', value: expenses },
  ];
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
        Income vs Expenses
      </h2>
      <div className="relative" style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: unknown) => formatCurrency(v as number, currencySymbol)}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-bold text-text">{savingsRate}%</p>
            <p className="text-xs text-text-muted">saved</p>
          </div>
        </div>
      </div>
      <div className="flex gap-4 justify-center text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand" />
          <span className="income-gradient-text font-semibold">Income</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600" />
          <span className="text-red-600 font-semibold">Expenses</span>
        </span>
      </div>
    </div>
  );
}
