import type { Transaction } from '../../firestore/types';
import TransactionRow from './TransactionRow';

interface TransactionTableProps {
  transactions: Transaction[];
  currencySymbol: string;
  onDelete: (id: string) => void;
}

const HEADERS = ['Transaction', 'Category', 'Date & Time', 'Payment', 'Amount', ''];

export default function TransactionTable({ transactions, currencySymbol, onDelete }: TransactionTableProps) {
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
            {HEADERS.map((h) => (
              <th
                key={h}
                className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-widest text-text-muted"
              >
                {h}
              </th>
            ))}
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
