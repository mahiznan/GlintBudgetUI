import { useState, useMemo, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useTransactions } from '../hooks/useTransactions';
import { useDeleteTransaction } from '../hooks/useMutateTransaction';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import { filterByPeriod, getPeriodRange } from '../lib/dateUtils';
import type { AppShellOutletContext } from './AppShell';
import HeroStatsRow from '../components/dashboard/HeroStatsRow';
import SpendingChart from '../components/dashboard/SpendingChart';
import CategoryBreakdown, { type Mode as CategoryMode } from '../components/dashboard/CategoryBreakdown';
import IncomeExpenseDonut from '../components/dashboard/IncomeExpenseDonut';
import DailyTransactions from '../components/dashboard/DailyTransactions';
import QuickStats from '../components/dashboard/QuickStats';
import DeleteConfirmDialog from '../components/transactions/DeleteConfirmDialog';

type DrillState =
  | { level: 0 }
  | { level: 1; category: string }
  | { level: 2; category: string; subCategory: string };

export default function Dashboard() {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { period } = useOutletContext<AppShellOutletContext>();
  const { preference } = usePreferenceContext();
  const { data: allTxns, loading, error, refetch } = useTransactions({ uid, limit: 200 });
  const { mutate: deleteTx } = useDeleteTransaction();
  const { mutate: updatePreference } = useUpdatePreference(uid);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const chartTypeSynced = useRef(false);

  useEffect(() => {
    if (!chartTypeSynced.current && preference) {
      setChartType(preference.spendingChartType ?? 'bar');
      chartTypeSynced.current = true;
    }
  }, [preference]);
  const [categoryMode, setCategoryMode] = useState<CategoryMode>('expense');
  const [drillState, setDrillState] = useState<DrillState>({ level: 0 });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrillState({ level: 0 });
  }, [period]);

  const currencySymbol = preference?.defaultCurrency.symbol ?? '₹';
  const defaultCurrencyCode = preference?.defaultCurrency.code ?? '';
  const defaultAccount = preference?.defaultEntries?.['account'] ?? '';

  const periodTxns = useMemo(() => filterByPeriod(allTxns, period), [allTxns, period]);

  const periodDays = useMemo(() => {
    const { start, end } = getPeriodRange(period);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }, [period]);

  const heroTxns = useMemo(
    () =>
      periodTxns.filter(
        (t) =>
          t.currency === defaultCurrencyCode &&
          (defaultAccount === '' || t.account === defaultAccount),
      ),
    [periodTxns, defaultCurrencyCode, defaultAccount],
  );

  const chartTxns = useMemo(
    () =>
      allTxns.filter(
        (t) =>
          t.currency === defaultCurrencyCode &&
          (defaultAccount === '' || t.account === defaultAccount),
      ),
    [allTxns, defaultCurrencyCode, defaultAccount],
  );

  const totalIncome = useMemo(
    () => heroTxns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [heroTxns],
  );
  const totalExpenses = useMemo(
    () => Math.abs(heroTxns.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
    [heroTxns],
  );

  function handleModeChange(mode: CategoryMode) {
    setCategoryMode(mode);
    setDrillState({ level: 0 });
  }

  async function handleChartTypeChange(type: 'bar' | 'line') {
    setChartType(type);
    await updatePreference({ spendingChartType: type });
  }

  const categoryItems = useMemo(() => {
    const filtered =
      categoryMode === 'expense'
        ? heroTxns.filter((t) => t.amount < 0)
        : heroTxns.filter((t) => t.amount > 0);

    if (drillState.level === 0) {
      const totals = filtered.reduce<Record<string, { total: number; icon: string }>>(
        (acc, t) => {
          if (!acc[t.category]) acc[t.category] = { total: 0, icon: t.icon };
          acc[t.category]!.total += Math.abs(t.amount);
          return acc;
        },
        {},
      );
      const sum = Object.values(totals).reduce((s, { total }) => s + total, 0);
      return Object.entries(totals)
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([name, { total, icon }]) => ({
          name,
          icon,
          total,
          pct: sum > 0 ? Math.round((total / sum) * 100) : 0,
        }));
    }

    if (drillState.level === 1) {
      const catTxns = filtered.filter((t) => t.category === drillState.category);
      const totals = catTxns.reduce<Record<string, { total: number; icon: string }>>(
        (acc, t) => {
          if (!acc[t.subCategory]) acc[t.subCategory] = { total: 0, icon: t.icon };
          acc[t.subCategory]!.total += Math.abs(t.amount);
          return acc;
        },
        {},
      );
      const sum = Object.values(totals).reduce((s, { total }) => s + total, 0);
      return Object.entries(totals)
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([name, { total, icon }]) => ({
          name,
          icon,
          total,
          pct: sum > 0 ? Math.round((total / sum) * 100) : 0,
        }));
    }

    // level 2: single item at 100% for the donut
    const subcatTxns = filtered.filter(
      (t) => t.category === drillState.category && t.subCategory === drillState.subCategory,
    );
    const total = subcatTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
    const icon = subcatTxns[0]?.icon ?? '📦';
    return [{ name: drillState.subCategory, icon, total, pct: 100 }];
  }, [heroTxns, categoryMode, drillState]);

  const drillTransactions = useMemo(() => {
    if (drillState.level !== 2) return [];
    const filtered =
      categoryMode === 'expense'
        ? heroTxns.filter((t) => t.amount < 0)
        : heroTxns.filter((t) => t.amount > 0);
    return filtered
      .filter(
        (t) => t.category === drillState.category && t.subCategory === drillState.subCategory,
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [heroTxns, categoryMode, drillState]);

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
          <SpendingChart
            transactions={chartTxns}
            period={period}
            currencySymbol={currencySymbol}
            chartType={chartType}
            onChartTypeChange={handleChartTypeChange}
          />
        </div>
        <CategoryBreakdown
          categories={categoryItems}
          mode={categoryMode}
          onModeChange={handleModeChange}
          currencySymbol={currencySymbol}
          drillLevel={drillState.level}
          drillLabel={
            drillState.level === 1
              ? drillState.category
              : drillState.level === 2
                ? drillState.subCategory
                : undefined
          }
          backLabel={
            drillState.level === 1
              ? '← Back'
              : drillState.level === 2
                ? `← ${drillState.category}`
                : undefined
          }
          onBack={
            drillState.level === 1
              ? () => setDrillState({ level: 0 })
              : drillState.level === 2
                ? () => setDrillState({ level: 1, category: drillState.category })
                : undefined
          }
          onItemClick={(name) => {
            if (drillState.level === 0) {
              setDrillState({ level: 1, category: name });
            } else if (drillState.level === 1) {
              setDrillState({ level: 2, category: drillState.category, subCategory: name });
            }
          }}
          transactions={drillState.level === 2 ? drillTransactions : undefined}
        />

        <div className="col-span-2 flex flex-col gap-4">
          <DailyTransactions
            transactions={allTxns}
            currencySymbol={currencySymbol}
            onDelete={(id) => setDeletingId(id)}
          />
        </div>
        <div className="flex flex-col gap-4">
          <IncomeExpenseDonut categories={categoryItems} mode={categoryMode} currencySymbol={currencySymbol} />
          <QuickStats transactions={heroTxns} currencySymbol={currencySymbol} periodDays={periodDays} />
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
