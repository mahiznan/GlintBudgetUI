import { usePlannerContext } from '../context/usePlannerContext';
import type { PlannerInput, PlannerPatch } from '../context/PlannerContext';

export function useAddPlanner() {
  const { addPlanner } = usePlannerContext();
  function mutate(planner: PlannerInput): string {
    return addPlanner(planner);
  }
  return { mutate };
}

export function useUpdatePlanner() {
  const { updatePlanner } = usePlannerContext();
  function mutate(id: string, patch: PlannerPatch): void {
    updatePlanner(id, patch);
  }
  return { mutate };
}

export function useArchivePlanner() {
  const { archivePlanner } = usePlannerContext();
  function mutate(id: string): void {
    archivePlanner(id);
  }
  return { mutate };
}

export function useDeletePlanner() {
  const { deletePlanner } = usePlannerContext();
  function mutate(id: string): void {
    deletePlanner(id);
  }
  return { mutate };
}
