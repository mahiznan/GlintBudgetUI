import { formatCurrency } from '../../lib/plannerUtils';
import type { CategoryResult } from '../../firestore/types';

const RING_COLOR: Record<CategoryResult['status'], string> = {
  exceeded: '#ef4444',
  near: '#f97316',
  ok: 'var(--color-brand)',
  'no-budget': '#cbd5e1',
  unplanned: '#cbd5e1',
};

interface Props {
  result: CategoryResult;
  currency: string;
}

export function PlannerCategoryRadial({ result, currency }: Props) {
  const R = 21;
  const circumference = 2 * Math.PI * R;
  const dashOffset = circumference - (circumference * result.pct) / 100;
  const isUnplanned = result.status === 'unplanned';
  const isExceeded = result.status === 'exceeded';
  const color = RING_COLOR[result.status];

  function innerLabel(): string {
    if (isExceeded) return 'Over';
    if (isUnplanned) return formatCurrency(result.spent, currency);
    return `${result.pct}%`;
  }

  function subLabel(): string {
    if (isExceeded) return `-${formatCurrency(Math.abs(result.remaining), currency)}`;
    if (result.status === 'near' || result.status === 'ok')
      return `${formatCurrency(result.remaining, currency)} left`;
    return '';
  }

  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
        {/* Track */}
        <circle
          cx="26"
          cy="26"
          r={R}
          fill="none"
          stroke={isUnplanned ? '#f1f5f9' : '#e2e8f0'}
          strokeWidth="4.5"
          {...(isUnplanned ? { strokeDasharray: '4 3' } : {})}
        />
        {/* Progress */}
        {!isUnplanned && (
          <circle
            cx="26"
            cy="26"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="4.5"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 26 26)"
          />
        )}
        {/* Inner label */}
        <text
          x="26"
          y="30"
          textAnchor="middle"
          fontSize={isExceeded ? 7.5 : 9}
          fontWeight="600"
          fill={isExceeded ? '#ef4444' : '#0f172a'}
        >
          {innerLabel()}
        </text>
      </svg>

      <span className="text-[10px] font-medium text-center leading-tight truncate w-full px-0.5 text-text">
        {result.category}
      </span>

      {subLabel() && (
        <span
          className={`text-[9px] text-center ${isExceeded ? 'text-red-500' : 'text-green-600'}`}
        >
          {subLabel()}
        </span>
      )}
    </div>
  );
}
