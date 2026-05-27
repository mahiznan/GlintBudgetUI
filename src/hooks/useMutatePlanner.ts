import { collection, doc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/db';
import { useSyncStatus } from '../context/SyncStatusContext';
import type { BudgetPlanner } from '../firestore/types';

type PlannerInput = Omit<BudgetPlanner, 'id' | 'createdAt' | 'updatedAt'>;
type PlannerPatch = Partial<Omit<BudgetPlanner, 'id' | 'createdAt' | 'updatedAt'>>;

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

export function useAddPlanner() {
  const { notifyWrite } = useSyncStatus();

  function mutate(planner: PlannerInput): string {
    const id = crypto.randomUUID();
    notifyWrite();
    void setDoc(doc(collection(db, 'budget_planners'), id), encodePlanner(id, planner));
    return id;
  }

  return { mutate };
}

export function useUpdatePlanner() {
  const { notifyWrite } = useSyncStatus();

  function mutate(id: string, patch: PlannerPatch): void {
    notifyWrite();
    void updateDoc(doc(db, 'budget_planners', id), encodePatch(patch));
  }

  return { mutate };
}

export function useArchivePlanner() {
  const { notifyWrite } = useSyncStatus();

  function mutate(id: string): void {
    notifyWrite();
    void updateDoc(doc(db, 'budget_planners', id), {
      archived: true,
      active: false,
      updated_at: Timestamp.now(),
    });
  }

  return { mutate };
}

export function useDeletePlanner() {
  const { notifyWrite } = useSyncStatus();

  function mutate(id: string): void {
    notifyWrite();
    void deleteDoc(doc(db, 'budget_planners', id));
  }

  return { mutate };
}
