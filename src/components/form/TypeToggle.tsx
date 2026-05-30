type TxType = 'expense' | 'income';

interface TypeToggleProps {
  value: TxType;
  onChange: (v: TxType) => void;
}

export default function TypeToggle({ value, onChange }: TypeToggleProps) {
  return (
    <div className="flex w-full h-[64px] flex-shrink-0">
      {(['expense', 'income'] as TxType[]).map((type) => {
        const isActive = value === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            data-inactive={isActive ? undefined : 'true'}
            className="flex flex-1 items-center justify-center gap-1.5 text-sm font-bold uppercase tracking-wider transition-colors"
            style={
              isActive
                ? {
                    background:
                      type === 'expense' ? 'var(--expense-gradient)' : 'var(--income-gradient)',
                    color: '#fff',
                  }
                : { background: '#e2e8f0', color: '#94a3b8' }
            }
          >
            {type === 'expense' ? '💸' : '💰'} {type}
          </button>
        );
      })}
    </div>
  );
}
