import { useState, useMemo, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useTransactionContext } from '../context/TransactionContext';
import { useDeleteTransaction } from '../hooks/useMutateTransaction';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import { filterByPeriod, getPeriodRange, shiftPeriodDate } from '../lib/dateUtils';
import type { AppShellOutletContext } from './AppShell';
import HeroStatsRow from '../components/dashboard/HeroStatsRow';
import SpendingChart from '../components/dashboard/SpendingChart';
import CategoryBreakdown, { type Mode as CategoryMode, type GroupBy } from '../components/dashboard/CategoryBreakdown';
import IncomeExpenseDonut from '../components/dashboard/IncomeExpenseDonut';
import DailyTransactions from '../components/dashboard/DailyTransactions';
import QuickStats from '../components/dashboard/QuickStats';
import DeleteConfirmDialog from '../components/transactions/DeleteConfirmDialog';

interface DrillState {
  groupBy: GroupBy;
  path: string[];
}

function getGroupField(t: { account: string; currency: string; vendor: string; payment: string; category: string }, groupBy: GroupBy): string {
  if (groupBy === 'account') return t.account;
  if (groupBy === 'currency') return t.currency;
  if (groupBy === 'vendor') return t.vendor;
  if (groupBy === 'payment') return t.payment;
  return t.category;
}

export default function Dashboard() {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { period, setPeriod } = useOutletContext<AppShellOutletContext>();
  const { preference } = usePreferenceContext();
  const { transactions: allTxns, loading, error, refetch } = useTransactionContext();
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
  const [drillState, setDrillState] = useState<DrillState>({ groupBy: 'category', path: [] });
  const [periodOffset, setPeriodOffset] = useState<number>(0);

  useEffect(() => {
    setDrillState((prev) => ({ ...prev, path: [] }));
    setPeriodOffset(0);
  }, [period]);

  const currencySymbol = preference?.defaultCurrency.symbol ?? '₹';
  const defaultCurrencyCode = preference?.defaultCurrency.code ?? '';
  const defaultAccount = preference?.defaultEntries?.['account'] ?? '';

  const referenceDate = useMemo(
    () => shiftPeriodDate(period, periodOffset),
    [period, periodOffset],
  );

  const periodTxns = useMemo(
    () => filterByPeriod(allTxns, period, referenceDate),
    [allTxns, period, referenceDate],
  );

  const periodDays = useMemo(() => {
    const { start, end } = getPeriodRange(period, referenceDate);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }, [period, referenceDate]);

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

  function handleGroupByChange(g: GroupBy) {
    setDrillState({ groupBy: g, path: [] });
  }

  function handleModeChange(mode: CategoryMode) {
    setCategoryMode(mode);
    setDrillState((prev) => ({ ...prev, path: [] }));
  }

  async function handleChartTypeChange(type: 'bar' | 'line') {
    setChartType(type);
    await updatePreference({ spendingChartType: type });
  }

  const categoryItems = useMemo(() => {
    const { groupBy, path } = drillState;
    const filtered =
      categoryMode === 'expense'
        ? heroTxns.filter((t) => t.amount < 0)
        : heroTxns.filter((t) => t.amount > 0);

    const toItems = (
      txns: typeof filtered,
      keyFn: (t: (typeof filtered)[number]) => string,
    ) => {
      const totals = txns.reduce<Record<string, { total: number; icon: string }>>((acc, t) => {
        const k = keyFn(t);
        if (!acc[k]) acc[k] = { total: 0, icon: t.icon };
        acc[k]!.total += Math.abs(t.amount);
        return acc;
      }, {});
      const sum = Object.values(totals).reduce((s, { total }) => s + total, 0);
      return Object.entries(totals)
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([name, { total, icon }]) => ({
          name,
          icon,
          total,
          pct: sum > 0 ? Math.round((total / sum) * 100) : 0,
        }));
    };

    if (groupBy === 'category') {
      if (path.length === 0) return toItems(filtered, (t) => t.category);
      if (path.length === 1)
        return toItems(
          filtered.filter((t) => t.category === path[0]),
          (t) => t.subCategory,
        );
      const subcatTxns = filtered.filter(
        (t) => t.category === path[0] && t.subCategory === path[1],
      );
      const total = subcatTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
      return [{ name: path[1]!, icon: subcatTxns[0]?.icon ?? '📦', total, pct: 100 }];
    }

    // non-category groupings (account | currency | vendor | payment)
    if (path.length === 0) return toItems(filtered, (t) => getGroupField(t, groupBy));
    if (path.length === 1)
      return toItems(
        filtered.filter((t) => getGroupField(t, groupBy) === path[0]),
        (t) => t.category,
      );
    if (path.length === 2)
      return toItems(
        filtered.filter((t) => getGroupField(t, groupBy) === path[0] && t.category === path[1]),
        (t) => t.subCategory,
      );
    const subcatTxns = filtered.filter(
      (t) =>
        getGroupField(t, groupBy) === path[0] &&
        t.category === path[1] &&
        t.subCategory === path[2],
    );
    const total = subcatTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
    return [{ name: path[2]!, icon: subcatTxns[0]?.icon ?? '📦', total, pct: 100 }];
  }, [heroTxns, categoryMode, drillState]);

  const drillTransactions = useMemo((): typeof heroTxns | undefined => {
    const { groupBy, path } = drillState;
    const maxDepth = groupBy === 'category' ? 2 : 3;
    if (path.length !== maxDepth) return undefined;

    const filtered =
      categoryMode === 'expense'
        ? heroTxns.filter((t) => t.amount < 0)
        : heroTxns.filter((t) => t.amount > 0);

    if (groupBy === 'category') {
      return filtered
        .filter((t) => t.category === path[0] && t.subCategory === path[1])
        .sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    return filtered
      .filter(
        (t) =>
          getGroupField(t, groupBy) === path[0] &&
          t.category === path[1] &&
          t.subCategory === path[2],
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
    <div className="flex flex-col gap-4 p-3 sm:p-6">
      <HeroStatsRow
        totalExpenses={totalExpenses}
        totalIncome={totalIncome}
        currencySymbol={currencySymbol}
      />

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Left column — 2/3 width on desktop, full width on mobile */}
        <div className="flex flex-col gap-4 md:flex-[2]">
          <SpendingChart
            transactions={chartTxns}
            period={period}
            onPeriodChange={setPeriod}
            currencySymbol={currencySymbol}
            chartType={chartType}
            onChartTypeChange={handleChartTypeChange}
            offset={periodOffset}
            onOffsetChange={(delta) => setPeriodOffset((o) => Math.min(0, o + delta))}
          />
          <DailyTransactions
            transactions={allTxns}
            currencySymbol={currencySymbol}
            onDelete={(id) => setDeletingId(id)}
            onTransactionAdded={refetch}
          />
        </div>

        {/* Right column — 1/3 width on desktop, full width on mobile */}
        <div className="flex flex-col gap-4 md:flex-[1]">
          <CategoryBreakdown
            categories={categoryItems}
            mode={categoryMode}
            onModeChange={handleModeChange}
            currencySymbol={currencySymbol}
            groupBy={drillState.groupBy}
            onGroupByChange={handleGroupByChange}
            drillLevel={drillState.path.length}
            drillLabel={drillState.path.at(-1)}
            backLabel={
              drillState.path.length === 1
                ? '← Back'
                : drillState.path.length > 1
                  ? `← ${drillState.path.at(-2)}`
                  : undefined
            }
            onBack={
              drillState.path.length > 0
                ? () => setDrillState((prev) => ({ ...prev, path: prev.path.slice(0, -1) }))
                : undefined
            }
            onItemClick={
              drillTransactions === undefined
                ? (name) =>
                    setDrillState((prev) => ({ ...prev, path: [...prev.path, name] }))
                : undefined
            }
            transactions={drillTransactions}
          />
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
