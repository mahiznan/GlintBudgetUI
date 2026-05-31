/* eslint-disable react-refresh/only-export-components */
import { createContext } from 'react';
import type { BudgetPlanner } from '../firestore/types';

export interface PlannerContextValue {
  planners: BudgetPlanner[];
  loading: boolean;
  error: Error | null;
  hasPendingWrites: boolean;
}

export const PlannerContext = createContext<PlannerContextValue | null>(null);

export { PlannerProvider } from './PlannerProvider';
export { usePlannerContext } from './usePlannerContext';
