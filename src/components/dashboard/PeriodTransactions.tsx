import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Transaction } from '../../firestore/types';
import type { Period } from '../../lib/dateUtils';
import { formatCurrency, formatTime, formatDateShort } from '../../lib/dateUtils';

interface PeriodTransactionsProps {
  transactions: Transaction[];
  period: Period;
  currencySymbol: string;
  onDelete: (id: string) => void;
}

const PAGE_SIZE = 10;

const PERIOD_HEADINGS: Record<Period, string> = {
  day: 'Today',
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year',
};

const PAGINATED_PERIODS: Period[] = ['month', 'quarter', 'year'];

export default function PeriodTransactions({
  transactions,
  period,
  currencySymbol,
  onDelete,
}: PeriodTransactionsProps) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [transactions, period]);

  const sorted = [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime());
  const paginated = PAGINATED_PERIODS.includes(period);
  const totalPages = paginated ? Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)) : 1;
  const visible = paginated ? sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : sorted;
  const heading = PERIOD_HEADINGS[period];

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
          {heading}
        </h2>
        <Link to="/app/transactions" className="text-xs text-brand hover:underline font-medium">
          See all →
        </Link>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-text-muted py-6 text-center">No transactions for this period</p>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-border">
            {visible.map((tx) => {
              const isExpense = tx.amount < 0;
              return (
                <div key={tx.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-xl w-8 text-center flex-shrink-0">{tx.icon || '💸'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{tx.vendor}</p>
                    <p className="text-xs text-text-muted">
                      {tx.category} · {paginated ? formatDateShort(tx.date) : formatTime(tx.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-sm font-mono font-semibold ${isExpense ? 'text-red-600' : 'text-brand'}`}
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
          {paginated && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs px-2 py-1 rounded border border-border disabled:opacity-40 hover:bg-surface-alt"
              >
                ← Prev
              </button>
              <span className="text-xs text-text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-xs px-2 py-1 rounded border border-border disabled:opacity-40 hover:bg-surface-alt"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
