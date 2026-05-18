import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useTransactions } from '../hooks/useTransactions';
import { useDeleteTransaction } from '../hooks/useMutateTransaction';
import { filterByPeriod } from '../lib/dateUtils';
import type { AppShellOutletContext } from './AppShell';
import HeroStatsRow from '../components/dashboard/HeroStatsRow';
import SpendingChart from '../components/dashboard/SpendingChart';
import CategoryBreakdown from '../components/dashboard/CategoryBreakdown';
import IncomeExpenseDonut from '../components/dashboard/IncomeExpenseDonut';
import DailyTransactions from '../components/dashboard/DailyTransactions';
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
  const defaultCurrencyCode = preference?.defaultCurrency.code ?? '';
  const defaultAccount = preference?.defaultEntries?.['account'] ?? '';

  const periodTxns = useMemo(() => filterByPeriod(allTxns, period), [allTxns, period]);

  const heroTxns = useMemo(
    () =>
      periodTxns.filter(
        (t) =>
          t.currency === defaultCurrencyCode &&
          (defaultAccount === '' || t.account === defaultAccount),
      ),
    [periodTxns, defaultCurrencyCode, defaultAccount],
  );

  const totalIncome = useMemo(
    () => heroTxns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [heroTxns],
  );
  const totalExpenses = useMemo(
    () => Math.abs(heroTxns.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
    [heroTxns],
  );

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
        totalExpenses={totalExpenses}
        totalIncome={totalIncome}
        currencySymbol={currencySymbol}
      />

      <div className="p-6 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <SpendingChart transactions={periodTxns} period={period} currencySymbol={currencySymbol} />
        </div>
        <CategoryBreakdown transactions={heroTxns} currencySymbol={currencySymbol} />

        <div className="col-span-2 flex flex-col gap-4">
          <DailyTransactions
            transactions={allTxns}
            currencySymbol={currencySymbol}
            onDelete={(id) => setDeletingId(id)}
          />
        </div>
        <div className="flex flex-col gap-4">
          <IncomeExpenseDonut income={totalIncome} expenses={totalExpenses} currencySymbol={currencySymbol} />
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
