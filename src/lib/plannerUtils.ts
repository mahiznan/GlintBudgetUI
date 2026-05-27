import { shiftPeriodDate } from './dateUtils';
import type {
  BudgetPlanner,
  CategoryResult,
  PlannerAggregation,
  Transaction,
} from '../firestore/types';

// ── Period computation ────────────────────────────────────────────────────────

const PERIOD_MAP = {
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
} as const satisfies Record<'weekly' | 'monthly' | 'yearly', 'week' | 'month' | 'year'>;

/**
 * Returns the full (always start-of-period → end-of-period) date range for a
 * given reference date.  Unlike the dashboard's getPeriodRange, this never
 * caps the end at "today" so budget planners always show the complete period.
 */
function getFullPeriodRange(
  period: 'week' | 'month' | 'year',
  ref: Date,
): { start: Date; end: Date } {
  const start = new Date(ref);
  const end = new Date(ref);

  switch (period) {
    case 'week': {
      // ISO week: Monday → Sunday
      const day = start.getDay(); // 0 = Sunday
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'month': {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      // Last day of month: day 0 of the next month
      end.setFullYear(ref.getFullYear(), ref.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'year': {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    }
  }

  return { start, end };
}

function formatPeriodLabel(
  period: BudgetPlanner['period'],
  start: Date,
  end: Date,
): string {
  if (period === 'yearly') return start.getFullYear().toString();
  if (period === 'monthly') {
    return start.toLocaleString('en', { month: 'long', year: 'numeric' });
  }
  if (period === 'weekly') {
    const s = start.toLocaleString('en', { day: 'numeric', month: 'short' });
    const e = end.toLocaleString('en', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${s} – ${e}`;
  }
  // custom
  const s = start.toLocaleString('en', { day: 'numeric', month: 'short', year: 'numeric' });
  const e = end.toLocaleString('en', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${s} – ${e}`;
}

export function computePeriodRange(
  planner: Pick<BudgetPlanner, 'period' | 'customStart' | 'customEnd' | 'repeatable'>,
  offset: number,
  now = new Date(),
): { start: Date; end: Date; periodLabel: string; isCurrentPeriod: boolean } {
  // Custom period or non-repeatable: always use stored customStart/customEnd
  if (planner.period === 'custom' || !planner.repeatable) {
    const start = planner.customStart!;
    const end = planner.customEnd!;
    return {
      start,
      end,
      periodLabel: formatPeriodLabel('custom', start, end),
      isCurrentPeriod: true,
    };
  }

  const p = PERIOD_MAP[planner.period as 'weekly' | 'monthly' | 'yearly'];
  const refDate = shiftPeriodDate(p, offset, now);
  const { start, end } = getFullPeriodRange(p, refDate);
  return {
    start,
    end,
    periodLabel: formatPeriodLabel(planner.period, start, end),
    isCurrentPeriod: offset === 0,
  };
}

/**
 * Computes the concrete start/end for a non-repeatable planner at creation time.
 * Called in PlannerForm before saving when repeatable=false.
 */
export function computeEffectiveDates(
  period: BudgetPlanner['period'],
  now = new Date(),
): { customStart: Date; customEnd: Date } {
  if (period === 'custom') {
    throw new Error('Custom period must supply explicit dates');
  }
  const p = PERIOD_MAP[period as 'weekly' | 'monthly' | 'yearly'];
  const { start, end } = getFullPeriodRange(p, now);
  return { customStart: start, customEnd: end };
}

// ── Expiry check ─────────────────────────────────────────────────────────────

export function isPlannerExpired(planner: BudgetPlanner, now = new Date()): boolean {
  if (planner.repeatable) return false;
  if (!planner.customEnd) return false;
  return planner.customEnd < now;
}

// ── Transaction filtering ─────────────────────────────────────────────────────

export function filterTransactionsForPlanner(
  planner: Pick<
    BudgetPlanner,
    'currency' | 'filterAccounts' | 'filterVendors' | 'filterPayments'
  >,
  transactions: Transaction[],
  dateRange: { start: Date; end: Date },
): Transaction[] {
  return transactions.filter((t) => {
    if (t.date < dateRange.start || t.date > dateRange.end) return false;
    if (t.currency !== planner.currency) return false;
    if (planner.filterAccounts.length > 0 && !planner.filterAccounts.includes(t.account))
      return false;
    if (planner.filterVendors.length > 0 && !planner.filterVendors.includes(t.vendor))
      return false;
    if (planner.filterPayments.length > 0 && !planner.filterPayments.includes(t.payment))
      return false;
    return true;
  });
}

// ── Aggregation ───────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<CategoryResult['status'], number> = {
  exceeded: 0,
  near: 1,
  ok: 2,
  'no-budget': 3,
  unplanned: 4,
};

export function aggregateTransactions(
  planner: Pick<BudgetPlanner, 'categoryBudgets'>,
  filteredTransactions: Transaction[],
): Pick<PlannerAggregation, 'categoryResults' | 'unplannedResults' | 'summary'> {
  // Group spend by category
  const spendByCategory = new Map<string, number>();
  for (const t of filteredTransactions) {
    spendByCategory.set(t.category, (spendByCategory.get(t.category) ?? 0) + t.amount);
  }

  // Build categoryResults from configured budgets
  const categoryResults: CategoryResult[] = planner.categoryBudgets.map(
    ({ category, amount }) => {
      const spent = spendByCategory.get(category) ?? 0;
      const remaining = amount - spent;
      const pct = amount > 0 ? Math.min(100, Math.round((spent / amount) * 100)) : 0;

      let status: CategoryResult['status'];
      if (amount === 0) status = 'no-budget';
      else if (spent > amount) status = 'exceeded';
      else if (pct >= 80) status = 'near';
      else status = 'ok';

      return { category, planned: amount, spent, remaining, pct, status };
    },
  );

  // Sort: exceeded → near → ok → no-budget (within same status: higher spend first)
  categoryResults.sort((a, b) => {
    const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    return so !== 0 ? so : b.spent - a.spent;
  });

  // Find unplanned categories (transactions in categories not in categoryBudgets)
  const plannedCategories = new Set(planner.categoryBudgets.map((b) => b.category));
  const unplannedResults: CategoryResult[] = [];
  for (const [category, spent] of spendByCategory) {
    if (!plannedCategories.has(category) && spent > 0) {
      unplannedResults.push({
        category,
        planned: 0,
        spent,
        remaining: -spent,
        pct: 0,
        status: 'unplanned',
      });
    }
  }
  unplannedResults.sort((a, b) => b.spent - a.spent);

  // Summary: totalSpent includes unplanned spend
  const totalPlanned = planner.categoryBudgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = [...spendByCategory.values()].reduce((s, v) => s + v, 0);

  return {
    categoryResults,
    unplannedResults,
    summary: {
      totalPlanned,
      totalSpent,
      totalRemaining: totalPlanned - totalSpent,
    },
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}
