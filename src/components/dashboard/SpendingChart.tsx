import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useMemo } from 'react';
import type { Transaction } from '../../firestore/types';
import type { Period } from '../../lib/dateUtils';
import { groupByDay, groupByMonth, formatCurrency } from '../../lib/dateUtils';
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';

interface SpendingChartProps {
  transactions: Transaction[];
  period: Period;
  currencySymbol: string;
}

function buildChartData(
  txns: Transaction[],
  period: Period,
): { label: string; amount: number }[] {
  const expenses = txns
    .filter((t) => t.amount < 0)
    .map((t) => ({ ...t, amount: Math.abs(t.amount) }));

  if (period === 'day') {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, amount: 0 }));
    expenses.forEach((t) => {
      const h = t.date.getHours();
      buckets[h]!.amount += t.amount;
    });
    return buckets;
  }

  if (period === 'month' || period === 'week') {
    const grouped = groupByDay(expenses);
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount,
      }));
  }

  // quarter / year → monthly buckets
  const grouped = groupByMonth(expenses);
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, amount]) => {
      const [y, m] = ym.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      return { label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), amount };
    });
}

const CustomTooltip = ({
  active,
  payload,
  label,
  symbol,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  symbol: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-surface rounded-lg px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-text">{label}</p>
      <p className="text-brand font-mono">{formatCurrency(payload[0]!.value, symbol)}</p>
    </div>
  );
};

export default function SpendingChart({ transactions, period, currencySymbol }: SpendingChartProps) {
  const { themeId } = useTheme();
  const theme = getTheme(themeId);
  const data = useMemo(() => buildChartData(transactions, period), [transactions, period]);

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">Spending</h2>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#475569' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip symbol={currencySymbol} />} />
            <Bar
              dataKey="amount"
              radius={[4, 4, 0, 0] as [number, number, number, number]}
              fill={theme.chartColor}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
