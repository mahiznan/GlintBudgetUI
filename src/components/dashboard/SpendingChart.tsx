import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useMemo } from 'react';
import type { Transaction } from '../../firestore/types';
import type { Period } from '../../lib/dateUtils';
import {
  getChartDateRange,
  groupByDay,
  groupByMonth,
  localDateStr,
  formatCurrency,
  shiftPeriodDate,
  getPeriodLabel,
} from '../../lib/dateUtils';
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Year', value: 'year' },
];

interface SpendingChartProps {
  transactions: Transaction[];
  period: Period;
  onPeriodChange: (p: Period) => void;
  currencySymbol: string;
  chartType: 'bar' | 'line';
  onChartTypeChange: (type: 'bar' | 'line') => void;
  offset: number;
  onOffsetChange: (delta: -1 | 1) => void;
}

function buildChartData(
  txns: Transaction[],
  period: Period,
  now = new Date(),
): { label: string; amount: number }[] {
  const { start, end } = getChartDateRange(period, now);

  const expenses = txns
    .filter((t) => t.date >= start && t.date <= end && t.amount < 0)
    .map((t) => ({ ...t, amount: Math.abs(t.amount) }));

  if (period === 'day' || period === 'week' || period === 'month') {
    const dayCount =
      period === 'day'
        ? 1
        : period === 'week'
          ? 7
          : Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const buckets = Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const label =
        period === 'week'
          ? d.toLocaleDateString('en-US', { weekday: 'short' })
          : period === 'month'
            ? String(d.getDate())
            : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { label, amount: 0 };
    });

    const grouped = groupByDay(expenses);
    buckets.forEach((b, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      b.amount = grouped[localDateStr(d)] ?? 0;
    });
    return buckets;
  }

  if (period === 'quarter') {
    const qMonth = start.getMonth();
    const year = start.getFullYear();
    const buckets = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(year, qMonth + i, 1);
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        amount: 0,
      };
    });
    const grouped = groupByMonth(expenses);
    buckets.forEach((b, i) => {
      const key = `${year}-${String(qMonth + i + 1).padStart(2, '0')}`;
      b.amount = grouped[key] ?? 0;
    });
    return buckets;
  }

  // year → 12 monthly buckets
  const year = start.getFullYear();
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, i, 1);
    return { label: d.toLocaleDateString('en-US', { month: 'short' }), amount: 0 };
  });
  const grouped = groupByMonth(expenses);
  buckets.forEach((b, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    b.amount = grouped[key] ?? 0;
  });
  return buckets;
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

export default function SpendingChart({
  transactions,
  period,
  onPeriodChange,
  currencySymbol,
  chartType,
  onChartTypeChange,
  offset,
  onOffsetChange,
}: SpendingChartProps) {
  const { themeId } = useTheme();
  const theme = getTheme(themeId);
  const { referenceDate, periodLabel } = useMemo(() => {
    const ref = shiftPeriodDate(period, offset);
    return { referenceDate: ref, periodLabel: getPeriodLabel(period, ref) };
  }, [period, offset]);
  const data = useMemo(
    () => buildChartData(transactions, period, referenceDate),
    [transactions, period, referenceDate],
  );

  const tickInterval = period === 'month' ? 4 : 0;

  const axisProps = {
    dataKey: 'label',
    tick: { fontSize: 10, fill: '#475569' },
    axisLine: false,
    tickLine: false,
    interval: tickInterval,
  } as const;

  const yAxisProps = {
    tick: { fontSize: 10, fill: '#475569' },
    axisLine: false,
    tickLine: false,
  } as const;

  const gradientId = 'spendBarGradient';
  const areaGradientId = 'spendAreaGradient';

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted flex-shrink-0">
          Spending
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period switcher */}
          <div className="flex items-center rounded-lg border border-border bg-surface-alt p-0.5 gap-0.5">
            {PERIODS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => onPeriodChange(value)}
                className={[
                  'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all',
                  period === value
                    ? 'text-white shadow-sm'
                    : 'text-text-muted hover:text-text',
                ].join(' ')}
                style={period === value ? { background: 'var(--brand-gradient)' } : undefined}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Period navigator */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOffsetChange(-1)}
              aria-label="Previous period"
              className="w-6 h-6 flex items-center justify-center rounded text-sm text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
            >
              ‹
            </button>
            <span className="min-w-[72px] text-center text-[11px] font-mono font-semibold text-text">
              {periodLabel}
            </span>
            <button
              type="button"
              onClick={() => onOffsetChange(1)}
              disabled={offset === 0}
              aria-label="Next period"
              className={`w-6 h-6 flex items-center justify-center rounded text-sm transition-colors ${
                offset === 0
                  ? 'text-border cursor-not-allowed'
                  : 'text-text-muted hover:text-text hover:bg-surface-alt'
              }`}
            >
              ›
            </button>
          </div>

          {/* Chart type switcher */}
          <div className="flex gap-1">
            <button
              onClick={() => onChartTypeChange('bar')}
              aria-label="Bar chart"
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                chartType === 'bar'
                  ? 'bg-brand text-white'
                  : 'bg-surface-alt text-text-muted hover:text-text'
              }`}
            >
              ▬
            </button>
            <button
              onClick={() => onChartTypeChange('line')}
              aria-label="Line chart"
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                chartType === 'line'
                  ? 'bg-brand text-white'
                  : 'bg-surface-alt text-text-muted hover:text-text'
              }`}
            >
              ∿
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.chartColor} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={theme.chartColor} stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis {...axisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip content={<CustomTooltip symbol={currencySymbol} />} />
              <Bar
                dataKey="amount"
                radius={[4, 4, 0, 0] as [number, number, number, number]}
                fill={`url(#${gradientId})`}
              />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.chartColor} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={theme.chartColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis {...axisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip content={<CustomTooltip symbol={currencySymbol} />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={theme.chartColor}
                strokeWidth={2}
                fill={`url(#${areaGradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: theme.chartColor }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
