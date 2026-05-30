import type { Transaction } from '../../firestore/types';
import { formatCurrency, formatDateWithYear } from '../../lib/dateUtils';

interface TransactionRowProps {
  transaction: Transaction;
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export default function TransactionRow({
  transaction: tx,
  currencySymbol,
  onDelete,
  onEdit,
}: TransactionRowProps) {
  return (
    <tr className="border-b border-border even:bg-surface-alt hover:bg-slate-100 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{tx.icon || '💸'}</span>
          <div>
            <p className="text-sm font-medium text-text">{tx.subCategory}</p>
            <p className="text-xs text-text-muted">{tx.vendor}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-50 text-brand border border-green-200">
          {tx.category}
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-text-muted">
        {formatDateWithYear(tx.date)}
      </td>
      <td className="py-3 px-4 text-xs text-text-muted">{tx.payment}</td>
      <td className="py-3 px-4 text-right">
        <span className={`text-sm font-semibold ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
          {tx.amount < 0 ? '−' : '+'}
          {formatCurrency(Math.abs(tx.amount), currencySymbol)}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onEdit(tx.id)}
            className="p-1.5 rounded-lg text-text-muted hover:text-brand hover:bg-green-50 transition-colors"
            aria-label={`Edit ${tx.vendor}`}
          >
            ✏️
          </button>
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
