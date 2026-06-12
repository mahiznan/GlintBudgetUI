/* eslint-disable react-refresh/only-export-components */
import { createContext } from 'react';
import type { BudgetPlanner } from '../firestore/types';

type PlannerInput = Omit<BudgetPlanner, 'id' | 'createdAt' | 'updatedAt'>;
type PlannerPatch = Partial<Omit<BudgetPlanner, 'id' | 'createdAt' | 'updatedAt'>>;

export type { PlannerInput, PlannerPatch };

export interface PlannerContextValue {
  planners: BudgetPlanner[];
  loading: boolean;
  error: Error | null;
  addPlanner: (p: PlannerInput) => string;
  updatePlanner: (id: string, patch: PlannerPatch) => void;
  archivePlanner: (id: string) => void;
  deletePlanner: (id: string) => void;
}

export const PlannerContext = createContext<PlannerContextValue | null>(null);

export { PlannerProvider } from './PlannerProvider';
export { usePlannerContext } from './usePlannerContext';
