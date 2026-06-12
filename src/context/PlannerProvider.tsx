import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/db';
import { useAuth } from '../auth/AuthContext';
import { useSyncStatus } from './SyncStatusContext';
import { fetchPlanners } from '../hooks/usePlanners';
import { isPlannerExpired } from '../lib/plannerUtils';
import {
  PlannerContext,
  type PlannerContextValue,
  type PlannerInput,
  type PlannerPatch,
} from './PlannerContext';
import type { BudgetPlanner } from '../firestore/types';

function encodePlanner(id: string, p: PlannerInput): Record<string, unknown> {
  const now = Timestamp.now();
  return {
    id,
    user_id: p.user_id,
    name: p.name,
    description: p.description,
    currency: p.currency,
    active: p.active,
    archived: p.archived,
    period: p.period,
    custom_start: p.customStart ? Timestamp.fromDate(p.customStart) : null,
    custom_end: p.customEnd ? Timestamp.fromDate(p.customEnd) : null,
    repeatable: p.repeatable,
    filter_accounts: p.filterAccounts,
    filter_vendors: p.filterVendors,
    filter_payments: p.filterPayments,
    category_budgets: p.categoryBudgets,
    chart_view: p.chartView,
    created_at: now,
    updated_at: now,
  };
}

function encodePatch(patch: PlannerPatch): Record<string, unknown> {
  const out: Record<string, unknown> = { updated_at: Timestamp.now() };
  if (patch.name !== undefined) out['name'] = patch.name;
  if (patch.description !== undefined) out['description'] = patch.description;
  if (patch.currency !== undefined) out['currency'] = patch.currency;
  if (patch.active !== undefined) out['active'] = patch.active;
  if (patch.archived !== undefined) out['archived'] = patch.archived;
  if (patch.period !== undefined) out['period'] = patch.period;
  if (patch.customStart !== undefined)
    out['custom_start'] = patch.customStart ? Timestamp.fromDate(patch.customStart) : null;
  if (patch.customEnd !== undefined)
    out['custom_end'] = patch.customEnd ? Timestamp.fromDate(patch.customEnd) : null;
  if (patch.repeatable !== undefined) out['repeatable'] = patch.repeatable;
  if (patch.filterAccounts !== undefined) out['filter_accounts'] = patch.filterAccounts;
  if (patch.filterVendors !== undefined) out['filter_vendors'] = patch.filterVendors;
  if (patch.filterPayments !== undefined) out['filter_payments'] = patch.filterPayments;
  if (patch.categoryBudgets !== undefined) out['category_budgets'] = patch.categoryBudgets;
  if (patch.chartView !== undefined) out['chart_view'] = patch.chartView;
  return out;
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { notifyWrite, notifySynced } = useSyncStatus();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';

  const [planners, setPlanners] = useState<BudgetPlanner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const archivedThisSession = useRef(new Set<string>());

  useEffect(() => {
    if (!uid) {
      setPlanners([]);
      archivedThisSession.current.clear();
      return;
    }
    setLoading(true);
    setError(null);
    fetchPlanners(uid)
      .then((loaded) => {
        setPlanners(loaded);
        for (const planner of loaded) {
          if (
            !planner.archived &&
            !archivedThisSession.current.has(planner.id) &&
            isPlannerExpired(planner)
          ) {
            archivedThisSession.current.add(planner.id);
            void updateDoc(doc(db, 'budget_planners', planner.id), {
              archived: true,
              active: false,
              updated_at: Timestamp.now(),
            });
            setPlanners((prev) =>
              prev.map((p) =>
                p.id === planner.id ? { ...p, archived: true, active: false } : p,
              ),
            );
          }
        }
      })
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false));
  }, [uid]);

  const addPlanner = useCallback(
    (p: PlannerInput): string => {
      const id = crypto.randomUUID();
      const now = new Date();
      const newPlanner: BudgetPlanner = { ...p, id, createdAt: now, updatedAt: now };
      setPlanners((prev) => [newPlanner, ...prev]);
      notifyWrite();
      void setDoc(doc(collection(db, 'budget_planners'), id), encodePlanner(id, p)).then(
        () => notifySynced(),
      );
      return id;
    },
    [notifyWrite, notifySynced],
  );

  const updatePlanner = useCallback(
    (id: string, patch: PlannerPatch): void => {
      setPlanners((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date() } : p)),
      );
      notifyWrite();
      void updateDoc(doc(db, 'budget_planners', id), encodePatch(patch)).then(
        () => notifySynced(),
      );
    },
    [notifyWrite, notifySynced],
  );

  const archivePlanner = useCallback(
    (id: string): void => {
      setPlanners((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, archived: true, active: false, updatedAt: new Date() } : p,
        ),
      );
      notifyWrite();
      void updateDoc(doc(db, 'budget_planners', id), {
        archived: true,
        active: false,
        updated_at: Timestamp.now(),
      }).then(() => notifySynced());
    },
    [notifyWrite, notifySynced],
  );

  const deletePlanner = useCallback(
    (id: string): void => {
      setPlanners((prev) => prev.filter((p) => p.id !== id));
      notifyWrite();
      void deleteDoc(doc(db, 'budget_planners', id)).then(() => notifySynced());
    },
    [notifyWrite, notifySynced],
  );

  const value: PlannerContextValue = {
    planners,
    loading,
    error,
    addPlanner,
    updatePlanner,
    archivePlanner,
    deletePlanner,
  };

  return (
    <PlannerContext.Provider value={value}>
      {children}
    </PlannerContext.Provider>
  );
}
