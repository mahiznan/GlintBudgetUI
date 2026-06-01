import { useState, useMemo, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useTransactionContext } from '../context/TransactionContext';
import { usePlannerContext } from '../context/usePlannerContext';
import { useDeleteTransaction } from '../hooks/useMutateTransaction';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import { filterByPeriod, getPeriodRange, shiftPeriodDate, type Period } from '../lib/dateUtils';
import type { AppShellOutletContext } from './AppShell';
import HeroStatsRow from '../components/dashboard/HeroStatsRow';
import SpendingChart from '../components/dashboard/SpendingChart';
import CategoryBreakdown, {
  type Mode as CategoryMode,
  type GroupBy,
} from '../components/dashboard/CategoryBreakdown';
import IncomeExpenseDonut from '../components/dashboard/IncomeExpenseDonut';
import DailyTransactions from '../components/dashboard/DailyTransactions';
import QuickStats from '../components/dashboard/QuickStats';
import DeleteConfirmDialog from '../components/transactions/DeleteConfirmDialog';
import AddTransactionDrawer from '../components/transactions/AddTransactionDrawer';
import { PlannerDetailDrawer } from '../components/planner/PlannerDetailDrawer';

interface DrillState {
  groupBy: GroupBy;
  path: string[];
}

function getGroupField(
  t: { account: string; currency: string; vendor: string; payment: string; category: string },
  groupBy: GroupBy,
): string {
  if (groupBy === 'account') return t.account;
  if (groupBy === 'currency') return t.currency;
  if (groupBy === 'vendor') return t.vendor;
  if (groupBy === 'payment') return t.payment;
  return t.category;
}

function formatPathLabel(label: string): string {
  const parts = label.split('|');
  return parts.length === 2 ? `${parts[0]} · ${parts[1]}` : label;
}

function getCurrencySymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat('en', { style: 'currency', currency: code }).formatToParts(
      1,
    );
    return parts.find((p) => p.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
}

export default function Dashboard() {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { period, setPeriod, setFabDate } = useOutletContext<AppShellOutletContext>();
  const { preference } = usePreferenceContext();
  const { transactions: allTxns, loading, error } = useTransactionContext();
  const { planners } = usePlannerContext();
  const { mutate: deleteTx } = useDeleteTransaction();
  const { mutate: updatePreference } = useUpdatePreference(uid);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPlannerForDetail, setSelectedPlannerForDetail] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [plannerDetailOffset, setPlannerDetailOffset] = useState<number>(0);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrillState((prev) => ({ ...prev, path: [] }));
    setPeriodOffset(0);
  }, [period]);

  const currencySymbol = preference?.defaultCurrency.symbol ?? '₹';
  const defaultCurrencyCode = preference?.defaultCurrency.code ?? '';
  const defaultAccount = preference?.defaultEntries?.['account'] ?? '';

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrillState((prev) => {
      // When account filter changes, reset to category grouping since other groupings don't respect the account filter
      if (prev.groupBy !== 'category') {
        return { groupBy: 'category', path: [] };
      }
      // For category grouping, just clear the drill path
      return { ...prev, path: [] };
    });
  }, [defaultAccount]);

  // Get first active (non-archived) planner
  const activePlanner = useMemo(
    () => planners.find((p) => p.active && !p.archived) ?? null,
    [planners],
  );

  // Build code→symbol from preference so e.g. SGD → "$" instead of Intl's "SGD"
  const currencySymbolMap = useMemo((): Record<string, string> => {
    if (!preference) return {};
    return { [preference.defaultCurrency.code]: preference.defaultCurrency.symbol };
  }, [preference]);

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
    try {
      await updatePreference({ spendingChartType: type });
    } catch (error) {
      console.error('Failed to sync chart type preference:', error);
    }
  }

  async function handlePeriodChange(p: Period) {
    setPeriod(p);
    try {
      await updatePreference({ defaultPeriod: p });
    } catch (error) {
      console.error('Failed to sync period preference:', error);
    }
  }

  const categoryItems = useMemo(() => {
    const { groupBy, path } = drillState;
    const txns = groupBy === 'category' ? heroTxns : periodTxns;
    const filtered =
      categoryMode === 'expense'
        ? txns.filter((t) => t.amount < 0)
        : txns.filter((t) => t.amount > 0);

    const toItems = (txns: typeof filtered, keyFn: (t: (typeof filtered)[number]) => string, includeCurrency = true) => {
      const totals = txns.reduce<Record<string, { total: number; icon: string; currency: string }>>((acc, t) => {
        const fieldValue = keyFn(t);
        const composite = includeCurrency ? `${fieldValue}|${t.currency}` : fieldValue;
        if (!acc[composite]) acc[composite] = { total: 0, icon: t.icon, currency: t.currency };
        acc[composite]!.total += Math.abs(t.amount);
        return acc;
      }, {});
      const sum = Object.values(totals).reduce((s, { total }) => s + total, 0);
      return Object.entries(totals)
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([composite, { total, icon, currency }]) => {
          const fieldValue = includeCurrency ? composite.split('|')[0]! : composite;
          const sym = includeCurrency ? (currencySymbolMap[currency] ?? getCurrencySymbol(currency)) : undefined;
          return {
            name: sym ? `${fieldValue} • ${sym}` : fieldValue,
            icon,
            total,
            pct: sum > 0 ? Math.round((total / sum) * 100) : 0,
            symbol: sym,
            uniqueKey: composite,
          };
        });
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
      const currency = subcatTxns[0]?.currency ?? defaultCurrencyCode;
      const sym = currencySymbolMap[currency] ?? getCurrencySymbol(currency);
      return [{
        name: path[1]!,
        icon: subcatTxns[0]?.icon ?? '📦',
        total,
        pct: 100,
        symbol: sym,
        uniqueKey: `${path[1]}|${currency}`,
      }];
    }

    // account | vendor: composite top level (groupItem|currency), then category → subCategory → transactions
    if (groupBy === 'account' || groupBy === 'vendor') {
      if (path.length === 0) {
        const totals = filtered.reduce<
          Record<string, { total: number; groupName: string; currency: string }>
        >((acc, t) => {
          const groupName = getGroupField(t, groupBy);
          const composite = `${groupName}|${t.currency}`;
          if (!acc[composite]) acc[composite] = { total: 0, groupName, currency: t.currency };
          acc[composite]!.total += Math.abs(t.amount);
          return acc;
        }, {});
        const sum = Object.values(totals).reduce((s, { total }) => s + total, 0);
        return Object.entries(totals)
          .sort(([, a], [, b]) => b.total - a.total)
          .map(([composite, { total, groupName, currency }]) => {
            const sym = currencySymbolMap[currency] ?? getCurrencySymbol(currency);
            return {
              name: `${groupName} • ${sym}`,
              icon: sym,
              total,
              pct: sum > 0 ? Math.round((total / sum) * 100) : 0,
              symbol: sym,
              uniqueKey: composite,
            };
          });
      }
      const [groupName, currencyCode] = path[0]!.split('|') as [string, string];
      const byGroupAndCurrency = filtered.filter(
        (t) => getGroupField(t, groupBy) === groupName && t.currency === currencyCode,
      );
      if (path.length === 1) return toItems(byGroupAndCurrency, (t) => t.category);
      if (path.length === 2)
        return toItems(
          byGroupAndCurrency.filter((t) => t.category === path[1]),
          (t) => t.subCategory,
        );
      const subcatTxns4 = byGroupAndCurrency.filter(
        (t) => t.category === path[1] && t.subCategory === path[2],
      );
      const total4 = subcatTxns4.reduce((s, t) => s + Math.abs(t.amount), 0);
      const sym4 = currencySymbolMap[currencyCode] ?? getCurrencySymbol(currencyCode);
      return [{
        name: path[2]!,
        icon: subcatTxns4[0]?.icon ?? '📦',
        total: total4,
        pct: 100,
        symbol: sym4,
        uniqueKey: `${path[2]}|${currencyCode}`,
      }];
    }

    // currency | payment: 3-level drill (groupItem → category → subCategory)
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
    const currency = subcatTxns[0]?.currency ?? defaultCurrencyCode;
    const sym = currencySymbolMap[currency] ?? getCurrencySymbol(currency);
    return [{
      name: path[2]!,
      icon: subcatTxns[0]?.icon ?? '📦',
      total,
      pct: 100,
      symbol: sym,
      uniqueKey: `${path[2]}|${currency}`,
    }];
  }, [heroTxns, periodTxns, categoryMode, drillState, currencySymbolMap, defaultCurrencyCode]);

  const drillTransactions = useMemo((): typeof heroTxns | undefined => {
    const { groupBy, path } = drillState;
    const maxDepth = groupBy === 'category' ? 2 : 3;
    if (path.length !== maxDepth) return undefined;

    const txns = groupBy === 'category' ? heroTxns : periodTxns;
    const filtered =
      categoryMode === 'expense'
        ? txns.filter((t) => t.amount < 0)
        : txns.filter((t) => t.amount > 0);

    if (groupBy === 'category') {
      return filtered
        .filter((t) => t.category === path[0] && t.subCategory === path[1])
        .sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    if (groupBy === 'account' || groupBy === 'vendor') {
      const [groupName, currencyCode] = path[0]!.split('|') as [string, string];
      return filtered
        .filter(
          (t) =>
            getGroupField(t, groupBy) === groupName &&
            t.currency === currencyCode &&
            t.category === path[1] &&
            t.subCategory === path[2],
        )
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
  }, [heroTxns, periodTxns, categoryMode, drillState]);

  const activeCurrencySymbol = useMemo(() => {
    const { groupBy, path } = drillState;
    if ((groupBy === 'account' || groupBy === 'vendor') && path.length >= 1) {
      const currencyCode = path[0]!.split('|')[1];
      if (currencyCode) return currencySymbolMap[currencyCode] ?? getCurrencySymbol(currencyCode);
    }
    return currencySymbol;
  }, [drillState, currencySymbol, currencySymbolMap]);

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
    <div className="flex flex-col gap-4 p-3 sm:p-6">
      <HeroStatsRow
        totalExpenses={totalExpenses}
        totalIncome={totalIncome}
        currencySymbol={currencySymbol}
        activePlanner={activePlanner}
        transactions={allTxns}
        onPlannerClick={() => {
          if (activePlanner) {
            setSelectedPlannerForDetail(activePlanner.id);
          }
        }}
      />

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Left column — 2/3 width on desktop, full width on mobile */}
        <div className="flex flex-col gap-4 md:flex-[2] min-w-0">
          <div className="order-2 md:order-1">
            <SpendingChart
              transactions={chartTxns}
              period={period}
              onPeriodChange={handlePeriodChange}
              currencySymbol={currencySymbol}
              chartType={chartType}
              onChartTypeChange={handleChartTypeChange}
              offset={periodOffset}
              onOffsetChange={(delta) => setPeriodOffset((o) => Math.min(0, o + delta))}
            />
          </div>
          <div className="order-1 md:order-2">
            <DailyTransactions
              transactions={allTxns}
              onDelete={(id) => setDeletingId(id)}
              onTransactionAdded={() => {}}
              onDateChange={setFabDate}
            />
          </div>
        </div>

        {/* Right column — 1/3 width on desktop, full width on mobile */}
        <div className="flex flex-col gap-4 md:flex-[1] min-w-0">
          <CategoryBreakdown
            categories={categoryItems}
            mode={categoryMode}
            onModeChange={handleModeChange}
            currencySymbol={activeCurrencySymbol}
            groupBy={drillState.groupBy}
            onGroupByChange={handleGroupByChange}
            drillLevel={drillState.path.length}
            drillLabel={
              drillState.path.at(-1) !== undefined
                ? formatPathLabel(drillState.path.at(-1)!)
                : undefined
            }
            backLabel={
              drillState.path.length === 1
                ? '← Back'
                : drillState.path.length > 1
                  ? `← ${formatPathLabel(drillState.path.at(-2)!)}`
                  : undefined
            }
            onBack={
              drillState.path.length > 0
                ? () => setDrillState((prev) => ({ ...prev, path: prev.path.slice(0, -1) }))
                : undefined
            }
            onItemClick={
              drillTransactions === undefined
                ? (name) => setDrillState((prev) => ({ ...prev, path: [...prev.path, name] }))
                : undefined
            }
            transactions={drillTransactions}
            onEdit={(id) => setEditingId(id)}
          />
          <IncomeExpenseDonut
            categories={categoryItems}
            mode={categoryMode}
            currencySymbol={currencySymbol}
          />
          <QuickStats
            transactions={heroTxns}
            currencySymbol={currencySymbol}
            periodDays={periodDays}
          />
        </div>
      </div>

      {deletingId && (
        <DeleteConfirmDialog
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
      <AddTransactionDrawer
        open={editingId !== null}
        editId={editingId ?? undefined}
        onClose={() => setEditingId(null)}
        transactions={periodTxns}
      />
      {selectedPlannerForDetail && activePlanner && (
        <PlannerDetailDrawer
          planner={activePlanner}
          transactions={allTxns}
          initialOffset={plannerDetailOffset}
          onClose={() => {
            setSelectedPlannerForDetail(null);
            setPlannerDetailOffset(0);
          }}
        />
      )}
    </div>
  );
}
