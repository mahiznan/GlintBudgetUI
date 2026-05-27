import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { usePlanners } from '../../hooks/usePlanners';
import { useTransactionContext } from '../../context/TransactionContext';
import { PlannerCard } from './PlannerCard';
import type { BudgetPlanner } from '../../firestore/types';

// selectedPlanner state is set here and passed down in Phase 3 when
// PlannerDetailDrawer is added. For now, the onCardClick stores selection
// but nothing renders.
export function BudgetPlannerCarousel() {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { planners, loading } = usePlanners(uid);
  const { transactions } = useTransactionContext();

  const [selected, setSelected] = useState<{
    planner: BudgetPlanner;
    offset: number;
  } | null>(null);

  const activePlanners = planners.filter((p) => p.active && !p.archived);

  if (loading) {
    return (
      <div role="status" className="flex gap-4 overflow-hidden py-1">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="shrink-0 w-80 h-56 rounded-xl bg-surface-alt border border-border animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (activePlanners.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface-alt py-8 px-6 text-center">
        <div>
          <p className="text-sm font-medium text-text">No active budget planners</p>
          <p className="text-xs text-text-muted mt-1">
            Create your first budget planner in{' '}
            <span className="text-brand font-medium">Settings → Budget Planners</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Horizontal scroll carousel with snap */}
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {activePlanners.map((planner) => (
          <div key={planner.id} className="snap-start shrink-0 w-80 sm:w-96">
            <PlannerCard
              planner={planner}
              transactions={transactions}
              onCardClick={(offset) => setSelected({ planner, offset })}
            />
          </div>
        ))}
      </div>

      {/* PlannerDetailDrawer will be added here in Phase 3 */}
      {selected && null /* Phase 3: replace with <PlannerDetailDrawer ... /> */}
    </>
  );
}
