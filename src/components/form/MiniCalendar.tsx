import { useState } from 'react';

interface MiniCalendarProps {
  value: string;        // 'YYYY-MM-DD'
  onChange: (v: string) => void;
  activeType: 'expense' | 'income';
}

function getCalendarDays(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  // Monday-first: (getDay() + 6) % 7 → 0=Mon … 6=Sun
  const startPad = (firstOfMonth.getDay() + 6) % 7;
  const days: Date[] = [];
  for (let i = startPad; i > 0; i--) days.push(new Date(year, month, 1 - i));
  for (let d = 1; d <= lastOfMonth.getDate(); d++) days.push(new Date(year, month, d));
  let next = 1;
  while (days.length % 7 !== 0) days.push(new Date(year, month + 1, next++));
  return days;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MiniCalendar({ value, onChange, activeType }: MiniCalendarProps) {
  const selected = value ? new Date(value + 'T00:00:00') : null;
  const [viewDate, setViewDate] = useState<Date>(() => (selected ? new Date(selected) : new Date()));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = getCalendarDays(year, month);
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const todayStr = toDateStr(new Date());
  const selectedStr = value;

  const selGradient =
    activeType === 'expense' ? 'var(--expense-gradient)' : 'var(--brand-gradient)';
  const selShadow =
    activeType === 'expense'
      ? '0 2px 6px rgba(220,38,38,0.28)'
      : '0 2px 6px rgba(34,197,94,0.28)';

  return (
    <div className="-mx-[18px] bg-[#f8fafc] border-y-[1.5px] border-[#e2e8f0] px-[18px] py-[12px] pb-[14px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-[10px]">
        <span className="text-[13px] font-bold text-text">{monthLabel}</span>
        <div className="flex gap-[4px]">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="w-[24px] h-[24px] rounded-[6px] border border-border bg-surface text-[12px] text-text-muted flex items-center justify-center"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="w-[24px] h-[24px] rounded-[6px] border border-border bg-surface text-[12px] text-text-muted flex items-center justify-center"
          >
            ›
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-[2px]">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div
            key={i}
            className="text-[9px] font-bold text-text-muted text-center pb-[4px] uppercase"
          >
            {d}
          </div>
        ))}

        {/* Day cells */}
        {days.map((d, i) => {
          const ds = toDateStr(d);
          const isCurrentMonth = d.getMonth() === month;
          const isToday = ds === todayStr;
          const isSelected = ds === selectedStr;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(ds)}
              className="aspect-square flex items-center justify-center text-[11px] font-medium rounded-[6px]"
              style={
                isSelected
                  ? { background: selGradient, color: '#fff', fontWeight: 700, boxShadow: selShadow }
                  : isToday
                  ? { background: '#f1f5f9', fontWeight: 700, color: '#475569' }
                  : { color: isCurrentMonth ? '#0f172a' : '#cbd5e1' }
              }
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
