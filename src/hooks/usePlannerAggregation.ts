import { useMemo } from 'react';
import {
  computePeriodRange,
  filterTransactionsForPlanner,
  aggregateTransactions,
} from '../lib/plannerUtils';
import type { BudgetPlanner, PlannerAggregation, Transaction } from '../firestore/types';

export function usePlannerAggregation(
  planner: BudgetPlanner,
  transactions: Transaction[],
  periodOffset: number,
  now = new Date(),
): PlannerAggregation {
  return useMemo(() => {
    const { start, end, periodLabel, isCurrentPeriod } = computePeriodRange(
      planner,
      periodOffset,
      now,
    );
    const filtered = filterTransactionsForPlanner(planner, transactions, { start, end });
    const { categoryResults, unplannedResults, summary } = aggregateTransactions(
      planner,
      filtered,
    );
    return {
      dateRange: { start, end },
      periodLabel,
      isCurrentPeriod,
      summary,
      categoryResults,
      unplannedResults,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planner, transactions, periodOffset]);
}
