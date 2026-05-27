import { useSyncStatus, type SyncStatus } from '../../context/SyncStatusContext';

const CONFIG: Record<SyncStatus, { label: string; dotClass: string; pillClass: string }> = {
  synced: {
    label: 'In Sync',
    dotClass: 'w-[7px] h-[7px] rounded-full bg-[#22c55e] flex-shrink-0',
    pillClass: 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]',
  },
  syncing: {
    label: 'Syncing…',
    dotClass: 'w-[7px] h-[7px] rounded-full bg-[#3b82f6] flex-shrink-0 animate-pulse',
    pillClass: 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]',
  },
  pending: {
    label: 'Pending Sync',
    dotClass: 'w-[7px] h-[7px] rounded-full bg-[#f97316] flex-shrink-0',
    pillClass: 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]',
  },
};

export default function SyncPill() {
  const { status } = useSyncStatus();
  const { label, dotClass, pillClass } = CONFIG[status];

  return (
    <span
      role="status"
      aria-live="polite"
      className={[
        'inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full',
        'text-[11px] font-semibold whitespace-nowrap border flex-shrink-0',
        'transition-[background-color,color,border-color] duration-200',
        pillClass,
      ].join(' ')}
    >
      <span className={dotClass} aria-hidden="true" />
      {label}
    </span>
  );
}
