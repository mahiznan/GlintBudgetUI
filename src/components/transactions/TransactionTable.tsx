import type { Transaction } from '../../firestore/types';
import TransactionRow from './TransactionRow';

export type SortKey = 'subCategory' | 'category' | 'date' | 'payment' | 'amount';

interface TransactionTableProps {
  transactions: Transaction[];
  currencySymbol: string;
  onDelete: (id: string) => void;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onSort: (key: SortKey) => void;
}

const COLUMNS: { label: string; key: SortKey | null }[] = [
  { label: 'Subcategory & Vendor', key: 'subCategory' },
  { label: 'Category', key: 'category' },
  { label: 'Date & Time', key: 'date' },
  { label: 'Payment', key: 'payment' },
  { label: 'Amount', key: 'amount' },
  { label: '', key: null },
];

function SortIndicator({ colKey, sortKey, sortDir }: { colKey: SortKey; sortKey: SortKey; sortDir: 'asc' | 'desc' }) {
  if (colKey !== sortKey) return <span aria-hidden="true" className="text-text-muted opacity-40">⇅</span>;
  return <span aria-hidden="true" className="text-brand">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

export default function TransactionTable({
  transactions,
  currencySymbol,
  onDelete,
  sortKey,
  sortDir,
  onSort,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm font-medium">No transactions for this period</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] border-collapse bg-surface">
        <thead>
          <tr className="border-b border-border bg-surface-alt">
            {COLUMNS.map(({ label, key }) =>
              key ? (
                <th
                  key={key}
                  onClick={() => onSort(key)}
                  className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-widest text-text-muted cursor-pointer select-none hover:text-text transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <SortIndicator colKey={key} sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
              ) : (
                <th
                  key="actions"
                  className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-widest text-text-muted opacity-0 select-none"
                >
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              currencySymbol={currencySymbol}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
