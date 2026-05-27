import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useTransactionContext } from '../context/TransactionContext';
import { useDeleteTransaction } from '../hooks/useMutateTransaction';
import { filterByPeriod } from '../lib/dateUtils';
import type { AppShellOutletContext } from './AppShell';
import TransactionTable from '../components/transactions/TransactionTable';
import DeleteConfirmDialog from '../components/transactions/DeleteConfirmDialog';

export default function TransactionList() {
  const { preference } = usePreferenceContext();
  const { period } = useOutletContext<AppShellOutletContext>();
  const { transactions, loading, error } = useTransactionContext();
  const { mutate: deleteTx } = useDeleteTransaction();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currencySymbol = preference?.defaultCurrency.symbol ?? '₹';
  const filtered = useMemo(() => filterByPeriod(transactions, period), [transactions, period]);

  function handleDelete(id: string) {
    setDeletingId(null);
    deleteTx(id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted" role="status">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="m-6 rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700"
        role="alert"
      >
        Couldn't load transactions.{' '}
        <button className="underline ml-1" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 flex flex-col gap-5">
      <TransactionTable
        transactions={filtered}
        currencySymbol={currencySymbol}
        onDelete={setDeletingId}
      />
      {deletingId && (
        <DeleteConfirmDialog
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
