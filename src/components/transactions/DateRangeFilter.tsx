import type { Period } from '../../lib/dateUtils';

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Year', value: 'year' },
];

interface DateRangeFilterProps {
  period: Period;
  onPeriodChange: (p: Period) => void;
}

export default function DateRangeFilter({ period, onPeriodChange }: DateRangeFilterProps) {
  return (
    <div className="flex items-center rounded-xl border border-border bg-surface-alt p-1 gap-1 w-fit">
      {PERIODS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          onClick={() => onPeriodChange(value)}
          className={[
            'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
            period === value
              ? 'text-white shadow-sm'
              : 'text-text-muted hover:text-text',
          ].join(' ')}
          style={
            period === value
              ? { background: 'var(--brand-gradient)' }
              : undefined
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
