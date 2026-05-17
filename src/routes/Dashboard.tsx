import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useTransactions } from '../hooks/useTransactions';
import { useDeleteTransaction } from '../hooks/useMutateTransaction';
import { filterByPeriod, filterToday } from '../lib/dateUtils';
import type { AppShellOutletContext } from './AppShell';
import HeroStatsRow from '../components/dashboard/HeroStatsRow';
import SpendingChart from '../components/dashboard/SpendingChart';
import CategoryBreakdown from '../components/dashboard/CategoryBreakdown';
import IncomeExpenseDonut from '../components/dashboard/IncomeExpenseDonut';
import TodayTransactions from '../components/dashboard/TodayTransactions';
import QuickStats from '../components/dashboard/QuickStats';
import DeleteConfirmDialog from '../components/transactions/DeleteConfirmDialog';

export default function Dashboard() {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { period } = useOutletContext<AppShellOutletContext>();
  const { preference } = usePreferenceContext();
  const { data: allTxns, loading, error, refetch } = useTransactions({ uid, limit: 200 });
  const { mutate: deleteTx } = useDeleteTransaction();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currencySymbol = preference?.defaultCurrency.symbol ?? '₹';

  const periodTxns = useMemo(() => filterByPeriod(allTxns, period), [allTxns, period]);
  const todayTxns = useMemo(() => filterToday(allTxns), [allTxns]);

  const totalSpent = useMemo(
    () => periodTxns.reduce((s, t) => s + t.amount, 0),
    [periodTxns],
  );
  const totalIncome = 0;

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
    <div className="flex flex-col gap-0">
      <HeroStatsRow
        totalSpent={totalSpent}
        totalIncome={totalIncome}
        netBalance={totalIncome - totalSpent}
        txCount={periodTxns.length}
        currencySymbol={currencySymbol}
      />

      <div className="p-6 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <SpendingChart transactions={periodTxns} period={period} currencySymbol={currencySymbol} />
        </div>
        <CategoryBreakdown transactions={periodTxns} currencySymbol={currencySymbol} />

        <div className="col-span-2 flex flex-col gap-4">
          <TodayTransactions
            transactions={todayTxns}
            currencySymbol={currencySymbol}
            onDelete={(id) => setDeletingId(id)}
          />
        </div>
        <div className="flex flex-col gap-4">
          <IncomeExpenseDonut income={totalIncome} expenses={totalSpent} currencySymbol={currencySymbol} />
          <QuickStats transactions={periodTxns} currencySymbol={currencySymbol} />
        </div>
      </div>

      {deletingId && (
        <DeleteConfirmDialog
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
