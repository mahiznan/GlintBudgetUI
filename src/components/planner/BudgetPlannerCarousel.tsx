import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlannerContext } from '../../context/PlannerContext';
import { useTransactionContext } from '../../context/TransactionContext';
import { PlannerCard } from './PlannerCard';
import { PlannerDetailDrawer } from './PlannerDetailDrawer';
import type { BudgetPlanner } from '../../firestore/types';

// selectedPlanner state is set here and passed down in Phase 3 when
// PlannerDetailDrawer is added. For now, the onCardClick stores selection
// but nothing renders.
export function BudgetPlannerCarousel() {
  const { planners, loading } = usePlannerContext();
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
            <Link
              to="/app/settings?tab=planners"
              className="text-brand font-medium hover:underline"
            >
              Settings → Budget Planners
            </Link>
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

      {selected && (
        <PlannerDetailDrawer
          planner={selected.planner}
          transactions={transactions}
          initialOffset={selected.offset}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
