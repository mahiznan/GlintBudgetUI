import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase/db';
import type { BudgetPlanner } from '../firestore/types';

function docToPlanner(id: string, raw: DocumentData): BudgetPlanner {
  return {
    id,
    user_id: raw['user_id'] as string,
    name: raw['name'] as string,
    description: (raw['description'] as string) ?? '',
    currency: raw['currency'] as string,
    active: raw['active'] as boolean,
    archived: raw['archived'] as boolean,
    period: raw['period'] as BudgetPlanner['period'],
    customStart: raw['custom_start']
      ? (raw['custom_start'] as { toDate(): Date }).toDate()
      : undefined,
    customEnd: raw['custom_end']
      ? (raw['custom_end'] as { toDate(): Date }).toDate()
      : undefined,
    repeatable: raw['repeatable'] as boolean,
    filterAccounts: (raw['filter_accounts'] as string[]) ?? [],
    filterVendors: (raw['filter_vendors'] as string[]) ?? [],
    filterPayments: (raw['filter_payments'] as string[]) ?? [],
    categoryBudgets:
      (raw['category_budgets'] as Array<{ category: string; amount: number }>) ?? [],
    chartView: (raw['chart_view'] as BudgetPlanner['chartView']) ?? 'bar',
    createdAt: (raw['created_at'] as { toDate(): Date }).toDate(),
    updatedAt: (raw['updated_at'] as { toDate(): Date }).toDate(),
  };
}

export async function fetchPlanners(uid: string): Promise<BudgetPlanner[]> {
  if (!uid) return [];
  const q = query(
    collection(db, 'budget_planners'),
    where('user_id', '==', uid),
    orderBy('created_at', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToPlanner(d.id, d.data()));
}
