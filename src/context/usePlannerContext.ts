import { useContext } from 'react';
import { PlannerContext } from './PlannerContext';
import type { PlannerContextValue } from './PlannerContext';

export function usePlannerContext(): PlannerContextValue {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('usePlannerContext must be used within PlannerProvider');
  return ctx;
}
