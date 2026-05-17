import { Link } from 'react-router-dom';
import type { Transaction } from '../../firestore/types';
import { formatCurrency, formatDateShort, formatTime } from '../../lib/dateUtils';

interface TransactionRowProps {
  transaction: Transaction;
  currencySymbol: string;
  onDelete: (id: string) => void;
}

export default function TransactionRow({ transaction: tx, currencySymbol, onDelete }: TransactionRowProps) {
  return (
    <tr className="border-b border-border hover:bg-surface-alt transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{tx.icon || '💸'}</span>
          <div>
            <p className="text-sm font-medium text-text">{tx.vendor}</p>
            <p className="text-xs text-text-muted">{tx.account}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-50 text-brand border border-green-200">
          {tx.category}
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-text-muted">
        {formatDateShort(tx.date)} {formatTime(tx.date)}
      </td>
      <td className="py-3 px-4 text-xs text-text-muted">{tx.payment}</td>
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-mono font-semibold text-red-600">
          −{formatCurrency(tx.amount, currencySymbol)}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/app/transactions/${tx.id}/edit`}
            className="p-1.5 rounded-lg text-text-muted hover:text-brand hover:bg-green-50 transition-colors"
            aria-label={`Edit ${tx.vendor}`}
          >
            ✏️
          </Link>
          <button
            type="button"
            onClick={() => onDelete(tx.id)}
            className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label={`Delete ${tx.vendor}`}
          >
            🗑
          </button>
        </div>
      </td>
    </tr>
  );
}
