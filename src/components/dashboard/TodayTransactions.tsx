import { Link } from 'react-router-dom';
import type { Transaction } from '../../firestore/types';
import { formatCurrency, formatTime } from '../../lib/dateUtils';

interface TodayTransactionsProps {
  transactions: Transaction[];
  currencySymbol: string;
  onDelete: (id: string) => void;
}

export default function TodayTransactions({
  transactions,
  currencySymbol,
  onDelete,
}: TodayTransactionsProps) {
  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
          Today
        </h2>
        <Link to="/app/transactions" className="text-xs text-brand hover:underline font-medium">
          See all →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-text-muted py-6 text-center">No transactions today</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 py-2.5">
              <span className="text-xl w-8 text-center flex-shrink-0">{tx.icon || '💸'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{tx.vendor}</p>
                <p className="text-xs text-text-muted">{tx.category} · {formatTime(tx.date)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-mono font-semibold text-red-600">
                  −{formatCurrency(tx.amount, currencySymbol)}
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
          ))}
        </div>
      )}
    </div>
  );
}
