import { useState, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useTransactions } from '../hooks/useTransactions';
import { useDeleteTransaction } from '../hooks/useMutateTransaction';
import { getPeriodRange, filterByPeriod } from '../lib/dateUtils';
import type { Period } from '../lib/dateUtils';
import TransactionTable from '../components/transactions/TransactionTable';
import DateRangeFilter from '../components/transactions/DateRangeFilter';
import DeleteConfirmDialog from '../components/transactions/DeleteConfirmDialog';

export default function TransactionList() {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { preference } = usePreferenceContext();
  const [period, setPeriod] = useState<Period>('month');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { start, end } = useMemo(() => getPeriodRange(period), [period]);
  const { data: txns, loading, error, refetch } = useTransactions({ uid, start, end });
  const { mutate: deleteTx } = useDeleteTransaction();

  const currencySymbol = preference?.defaultCurrency.symbol ?? '₹';
  const filtered = useMemo(() => filterByPeriod(txns, period), [txns, period]);

  async function handleDelete(id: string) {
    setDeletingId(null);
    await deleteTx(id);
    refetch();
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
      <div className="m-6 rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700" role="alert">
        Couldn't load transactions.{' '}
        <button className="underline ml-1" onClick={refetch}>Retry</button>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5">
      <DateRangeFilter period={period} onPeriodChange={setPeriod} />
      <TransactionTable transactions={filtered} currencySymbol={currencySymbol} onDelete={setDeletingId} />
      {deletingId && (
        <DeleteConfirmDialog
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
