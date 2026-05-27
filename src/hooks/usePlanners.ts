import { useEffect, useReducer } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase/db';
import { useSyncStatus } from '../context/SyncStatusContext';
import { isPlannerExpired } from '../lib/plannerUtils';
import type { BudgetPlanner } from '../firestore/types';

interface State {
  planners: BudgetPlanner[];
  loading: boolean;
  error: Error | null;
  hasPendingWrites: boolean;
}

type Action =
  | { type: 'fetch' }
  | { type: 'success'; planners: BudgetPlanner[]; hasPendingWrites: boolean }
  | { type: 'error'; error: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'fetch':
      return { ...state, loading: true, error: null };
    case 'success':
      return { ...state, loading: false, planners: action.planners, hasPendingWrites: action.hasPendingWrites };
    case 'error':
      return { ...state, loading: false, error: action.error };
  }
}

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
    categoryBudgets: (raw['category_budgets'] as Array<{ category: string; amount: number }>) ?? [],
    chartView: (raw['chart_view'] as BudgetPlanner['chartView']) ?? 'bar',
    createdAt: (raw['created_at'] as { toDate(): Date }).toDate(),
    updatedAt: (raw['updated_at'] as { toDate(): Date }).toDate(),
  };
}

export function usePlanners(uid: string): State {
  const { notifyWrite } = useSyncStatus();
  const [state, dispatch] = useReducer(reducer, {
    planners: [],
    loading: !!uid,
    error: null,
    hasPendingWrites: false,
  });

  useEffect(() => {
    if (!uid) return;
    dispatch({ type: 'fetch' });

    const q = query(
      collection(db, 'budget_planners'),
      where('user_id', '==', uid),
      orderBy('created_at', 'desc'),
    );

    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const planners = snap.docs.map((d) => docToPlanner(d.id, d.data()));

        // Auto-archive expired non-repeatable planners
        for (const planner of planners) {
          if (!planner.archived && isPlannerExpired(planner)) {
            notifyWrite();
            void updateDoc(doc(db, 'budget_planners', planner.id), {
              archived: true,
              active: false,
              updated_at: Timestamp.now(),
            });
          }
        }

        dispatch({
          type: 'success',
          planners,
          hasPendingWrites: snap.metadata.hasPendingWrites,
        });
      },
      (err) => dispatch({ type: 'error', error: err }),
    );
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
