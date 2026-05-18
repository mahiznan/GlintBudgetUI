import { useState } from 'react';
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
} from '../../lib/dateUtils';

interface DailyTransactionsProps {
  transactions: Transaction[];
  currencySymbol: string;
  onDelete: (id: string) => void;
}

export default function DailyTransactions({
  transactions,
  currencySymbol,
  onDelete,
}: DailyTransactionsProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const weekDays = getWeekDays(weekStart);
  const onCurrentWeek = isCurrentWeek(weekStart);

  function goToPrevWeek() {
    const newMonday = new Date(weekStart);
    newMonday.setDate(weekStart.getDate() - 7);
    setWeekStart(newMonday);
    const newSelected = new Date(newMonday);
    newSelected.setDate(newMonday.getDate() + dayOfWeekOffset(selectedDate));
    setSelectedDate(newSelected);
  }

  function goToNextWeek() {
    const newMonday = new Date(weekStart);
    newMonday.setDate(weekStart.getDate() + 7);
    setWeekStart(newMonday);
    if (isCurrentWeek(newMonday)) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      setSelectedDate(d);
    } else {
      const newSelected = new Date(newMonday);
      newSelected.setDate(newMonday.getDate() + dayOfWeekOffset(selectedDate));
      setSelectedDate(newSelected);
    }
  }

  const dayTxns = transactions
    .filter((t) => isSameDay(t.date, selectedDate))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
          Transactions
        </h2>
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
                onClick={() => setSelectedDate(day)}
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

      {/* Selected date heading */}
      <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
        {formatDayHeading(selectedDate)}
      </p>

      {/* Transaction list */}
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
                  <Link
                    to={`/app/transactions/${tx.id}/edit`}
                    className="text-text-muted hover:text-brand p-1"
                    aria-label={`Edit ${tx.vendor}`}
                  >
                    ✏️
                  </Link>
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
