import { useState, useRef, useEffect, type TransitionEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Transaction } from '../../firestore/types';
import {
  getMondayOf,
  getWeekDays,
  isSameDay,
  isCurrentWeek,
  formatCurrency,
  formatTime,
  formatDayHeading,
  dayOfWeekOffset,
  localDateStr,
  dayOffset,
} from '../../lib/dateUtils';
import AddTransactionDrawer from '../transactions/AddTransactionDrawer';
import MiniCalendar from '../form/MiniCalendar';

interface DailyTransactionsProps {
  transactions: Transaction[];
  currencySymbol: string;
  onDelete: (id: string) => void;
  onTransactionAdded?: () => void;
}

interface DayPanelProps {
  date: Date;
  transactions: Transaction[];
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

function DayPanel({ date, transactions, currencySymbol, onDelete, onEdit }: DayPanelProps) {
  const dayTxns = transactions
    .filter((t) => isSameDay(t.date, date))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const dayExpenses = dayTxns
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
          {formatDayHeading(date)}
        </p>
        <span className="text-sm font-bold font-mono text-red-600">
          −{formatCurrency(dayExpenses, currencySymbol)}
        </span>
      </div>
      {dayTxns.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">No transactions for this day</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {dayTxns.map((tx) => {
            const isExpense = tx.amount < 0;
            return (
              <div key={tx.id} className="flex items-center gap-3 py-2.5">
                <span className="text-xl w-8 text-center flex-shrink-0">{tx.icon || '💸'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{tx.vendor}</p>
                  <p className="text-xs text-text-muted">
                    {tx.category} · {formatTime(tx.date)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-sm font-mono font-semibold ${
                      isExpense ? 'text-red-600' : 'text-brand'
                    }`}
                  >
                    {isExpense ? '−' : '+'}
                    {formatCurrency(Math.abs(tx.amount), currencySymbol)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEdit(tx.id)}
                    className="text-text-muted hover:text-brand p-1"
                    aria-label={`Edit ${tx.vendor}`}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(tx.id)}
                    className="text-text-muted hover:text-red-600 p-1"
                    aria-label={`Delete ${tx.vendor}`}
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DailyTransactions({
  transactions,
  currencySymbol,
  onDelete,
  onTransactionAdded,
}: DailyTransactionsProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [panels, setPanels] = useState<{ left: Date; center: Date; right: Date }>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      left: dayOffset(today, -1),
      center: today,
      right: dayOffset(today, +1),
    };
  });
  const [sliding, setSliding] = useState<'left' | 'right' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const weekDays = getWeekDays(weekStart);
  const onCurrentWeek = isCurrentWeek(weekStart);
  const isToday = isSameDay(selectedDate, new Date());

  function navigateTo(targetDate: Date) {
    if (sliding !== null) return;
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    if (isSameDay(target, panels.center)) return;
    const dir: 'left' | 'right' = target > panels.center ? 'left' : 'right';
    setPanels(prev => ({
      ...prev,
      [dir === 'left' ? 'right' : 'left']: target,
    }));
    setWeekStart(getMondayOf(target));
    setSelectedDate(target);
    setSliding(dir);
  }

  function goToToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    navigateTo(today);
  }

  function goToPrevWeek() {
    const newMonday = new Date(weekStart);
    newMonday.setDate(weekStart.getDate() - 7);
    const sunday = getWeekDays(newMonday)[6]!;
    navigateTo(sunday);
  }

  function goToNextWeek() {
    const newMonday = new Date(weekStart);
    newMonday.setDate(weekStart.getDate() + 7);
    let target: Date;
    if (isCurrentWeek(newMonday)) {
      target = new Date();
      target.setHours(0, 0, 0, 0);
    } else {
      target = new Date(newMonday);
      target.setDate(newMonday.getDate() + dayOfWeekOffset(selectedDate));
    }
    navigateTo(target);
  }

  function onTransitionEnd(e: TransitionEvent<HTMLDivElement>) {
    if (e.target !== trackRef.current) return;
    if (sliding === null) return;
    const committed = sliding === 'left' ? panels.right : panels.left;
    const track = trackRef.current;
    track.style.transition = 'none';
    setPanels({
      left: dayOffset(committed, -1),
      center: committed,
      right: dayOffset(committed, +1),
    });
    setSliding(null);
    requestAnimationFrame(() => {
      if (track) track.style.transition = '';
    });
  }

  function handleCalendarPick(dateStr: string) {
    navigateTo(new Date(dateStr + 'T00:00:00'));
    setCalendarOpen(false);
  }

  useEffect(() => {
    if (!calendarOpen) return;
    function handleClick(e: MouseEvent) {
      if (!calendarRef.current?.contains(e.target as Node)) setCalendarOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCalendarOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [calendarOpen]);

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
            Transactions
          </h2>
          <button
            type="button"
            aria-pressed={isToday}
            onClick={isToday ? undefined : goToToday}
            className={[
              'rounded-md px-2 py-0.5 text-xs font-semibold transition-all',
              isToday
                ? 'text-white'
                : 'border border-border bg-surface text-text-muted hover:text-text',
            ].join(' ')}
            style={isToday ? { background: 'var(--brand-gradient)' } : undefined}
          >
            Today
          </button>
          <div ref={calendarRef} className="relative">
            <button
              type="button"
              aria-label="Pick a date"
              aria-haspopup="true"
              aria-expanded={calendarOpen}
              onClick={() => setCalendarOpen((o) => !o)}
              className="p-0.5 rounded text-base leading-none opacity-70 hover:opacity-100 transition-opacity"
            >
              📅
            </button>
            {calendarOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-surface rounded-xl border border-border shadow-lg p-3 w-64 overflow-hidden">
                <MiniCalendar
                  value={localDateStr(selectedDate)}
                  onChange={handleCalendarPick}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/app/transactions"
            className="text-xs font-medium"
            style={{
              background: 'var(--brand-gradient-text)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            See all →
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-gradient)' }}
            aria-label="Add transaction"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goToPrevWeek}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface-alt text-text-muted hover:bg-border text-sm font-bold flex-shrink-0"
          aria-label="Previous week"
        >
          ‹
        </button>

        <div className="flex gap-1.5 flex-1">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const hasTxns = transactions.some((t) => isSameDay(t.date, day));
            const dayName = day.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
            const dayNum = day.getDate();

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => navigateTo(day)}
                aria-label={`${dayName} ${dayNum}`}
                aria-pressed={isSelected}
                className={`flex flex-col items-center py-2 rounded-lg flex-1 min-w-0 ${
                  !isSelected ? 'bg-surface-alt border border-border' : ''
                }`}
                style={
                  isSelected
                    ? {
                        background: 'var(--brand-gradient)',
                        boxShadow: '0 3px 12px var(--brand-glow)',
                      }
                    : undefined
                }
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide ${
                    isSelected ? 'text-white opacity-80' : 'text-text-muted'
                  }`}
                >
                  {dayName}
                </span>
                <span
                  className={`text-lg font-bold leading-tight mt-0.5 ${
                    isSelected ? 'text-white' : 'text-text'
                  }`}
                >
                  {dayNum}
                </span>
                <span
                  className="w-1 h-1 rounded-full mt-1"
                  style={{
                    background: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--color-accent)',
                    visibility: hasTxns ? 'visible' : 'hidden',
                  }}
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={goToNextWeek}
          disabled={onCurrentWeek}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface-alt text-text-muted hover:bg-border text-sm font-bold flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next week"
        >
          ›
        </button>
      </div>

      <div className="overflow-hidden w-full">
        <div
          data-testid="carousel-track"
          ref={trackRef}
          className="flex w-[300%] will-change-transform"
          style={{
            transform:
              sliding === 'left'
                ? 'translateX(-66.66%)'
                : sliding === 'right'
                ? 'translateX(0%)'
                : 'translateX(-33.33%)',
            transition: sliding ? 'transform 280ms ease' : 'none',
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {(['left', 'center', 'right'] as const).map((slot) => (
            <div key={slot} className="w-1/3 min-w-0 flex-shrink-0 overflow-hidden">
              <DayPanel
                date={panels[slot]}
                transactions={transactions}
                currencySymbol={currencySymbol}
                onDelete={onDelete}
                onEdit={(id) => { setEditingId(id); setDrawerOpen(true); }}
              />
            </div>
          ))}
        </div>
      </div>
      <AddTransactionDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingId(null); }}
        onSaved={() => { onTransactionAdded?.(); }}
        selectedDate={editingId ? undefined : selectedDate}
        transactions={transactions}
        editId={editingId ?? undefined}
      />
    </div>
  );
}
