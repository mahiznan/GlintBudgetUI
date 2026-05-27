import { useState } from 'react';
import { usePlanners } from '../../hooks/usePlanners';
import { useArchivePlanner, useDeletePlanner, useUpdatePlanner } from '../../hooks/useMutatePlanner';
import { PlannerForm } from '../planner/PlannerForm';
import type { BudgetPlanner } from '../../firestore/types';

const PERIOD_LABELS: Record<BudgetPlanner['period'], string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  custom: 'Custom',
};

interface PlannerRowProps {
  planner: BudgetPlanner;
  onEdit: (p: BudgetPlanner) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}

function PlannerRow({ planner, onEdit, onArchive, onDelete, onToggleActive }: PlannerRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text truncate">{planner.name}</span>
          <span className="text-[10px] bg-surface-alt border border-border rounded px-1.5 py-0.5 text-text-muted">
            {planner.currency}
          </span>
          <span className="text-[10px] bg-surface-alt border border-border rounded px-1.5 py-0.5 text-text-muted">
            {PERIOD_LABELS[planner.period]}
          </span>
          {planner.repeatable && (
            <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 rounded px-1.5 py-0.5">
              repeating
            </span>
          )}
        </div>
        {planner.description && (
          <p className="text-xs text-text-muted mt-0.5 truncate">{planner.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Active toggle */}
        {!planner.archived && (
          <button
            type="button"
            role="switch"
            aria-checked={planner.active}
            aria-label={planner.active ? 'Active' : 'Inactive'}
            onClick={() => onToggleActive(planner.id, !planner.active)}
            className={[
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
              planner.active ? 'bg-brand' : 'bg-border',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                planner.active ? 'translate-x-4' : 'translate-x-0.5',
              ].join(' ')}
            />
          </button>
        )}

        {/* Edit */}
        {!planner.archived && (
          <button
            type="button"
            onClick={() => onEdit(planner)}
            className="text-xs text-text-muted hover:text-text border border-border rounded px-2 py-1 transition-colors"
          >
            Edit
          </button>
        )}

        {/* Archive */}
        {!planner.archived && (
          <button
            type="button"
            aria-label="Archive"
            onClick={() => onArchive(planner.id)}
            className="text-xs text-text-muted hover:text-text border border-border rounded px-2 py-1 transition-colors"
          >
            Archive
          </button>
        )}

        {/* Delete — single-step */}
        <button
          type="button"
          aria-label="Delete"
          onClick={() => onDelete(planner.id)}
          className="text-xs text-text-muted hover:text-red-500 border border-border rounded px-2 py-1 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

interface Props {
  uid: string;
}

export default function PlannerSettings({ uid }: Props) {
  const { planners, loading } = usePlanners(uid);
  const { mutate: archivePlanner } = useArchivePlanner();
  const { mutate: deletePlanner } = useDeletePlanner();
  const { mutate: updatePlanner } = useUpdatePlanner();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlanner, setEditingPlanner] = useState<BudgetPlanner | null>(null);

  const activePlanners = planners.filter((p) => !p.archived);
  const archivedPlanners = planners.filter((p) => p.archived);

  function openCreate() {
    setEditingPlanner(null);
    setFormOpen(true);
  }

  function openEdit(planner: BudgetPlanner) {
    setEditingPlanner(planner);
    setFormOpen(true);
  }

  if (loading) {
    return (
      <div role="status" className="flex items-center justify-center h-32 text-text-muted text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">
            Budget Planners
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {activePlanners.length} active planner{activePlanners.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          aria-label="New planner"
          onClick={openCreate}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--brand-gradient, var(--color-brand))' }}
        >
          + New Planner
        </button>
      </div>

      {/* Active planners */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {activePlanners.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-text-muted">No planners yet.</p>
            <p className="text-xs text-text-muted mt-1">
              Click <span className="font-medium">+ New Planner</span> to create your first budget
              planner.
            </p>
          </div>
        ) : (
          <div className="px-4">
            {activePlanners.map((p) => (
              <PlannerRow
                key={p.id}
                planner={p}
                onEdit={openEdit}
                onArchive={archivePlanner}
                onDelete={deletePlanner}
                onToggleActive={(id, active) => updatePlanner(id, { active })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Archived / History — always expanded when present */}
      {archivedPlanners.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
            Archived / History ({archivedPlanners.length})
          </h4>
          <div className="rounded-xl border border-border bg-surface overflow-hidden px-4">
            {archivedPlanners.map((p) => (
              <PlannerRow
                key={p.id}
                planner={p}
                onEdit={openEdit}
                onArchive={archivePlanner}
                onDelete={deletePlanner}
                onToggleActive={(id, active) => updatePlanner(id, { active })}
              />
            ))}
          </div>
        </div>
      )}

      {/* PlannerForm drawer */}
      {formOpen && (
        <PlannerForm
          uid={uid}
          mode={editingPlanner ? 'edit' : 'create'}
          initial={editingPlanner ?? undefined}
          onClose={() => {
            setFormOpen(false);
            setEditingPlanner(null);
          }}
        />
      )}
    </div>
  );
}
