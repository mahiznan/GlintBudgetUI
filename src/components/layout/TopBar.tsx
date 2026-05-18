import { Link } from 'react-router-dom';
import type { Period } from '../../lib/dateUtils';

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Year', value: 'year' },
];

interface TopBarProps {
  title: string;
  period: Period;
  onPeriodChange: (p: Period) => void;
  showPeriodSwitch?: boolean;
}

export default function TopBar({ title, period, onPeriodChange, showPeriodSwitch = false }: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/50 bg-white/75 backdrop-blur-md px-6 py-3">
      <h1 className="text-lg font-semibold text-text">{title}</h1>

      {showPeriodSwitch && (
        <div className="flex items-center rounded-lg border border-border bg-surface-alt p-0.5 gap-0.5">
          {PERIODS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => onPeriodChange(value)}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
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
      )}

      <Link
        to="/app/transactions/new"
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        style={{ background: 'var(--brand-gradient)' }}
        aria-label="Add transaction"
      >
        <span aria-hidden="true">+</span> Add Transaction
      </Link>
    </header>
  );
}
