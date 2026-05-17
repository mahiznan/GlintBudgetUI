type TxType = 'expense' | 'income';

interface TypeToggleProps {
  value: TxType;
  onChange: (v: TxType) => void;
}

export default function TypeToggle({ value, onChange }: TypeToggleProps) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface-alt p-1 gap-1">
      {(['expense', 'income'] as TxType[]).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={[
            'rounded-lg px-5 py-2 text-sm font-semibold capitalize transition-all',
            value === type
              ? type === 'expense'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-white shadow-sm'
              : 'text-text-muted hover:text-text',
          ].join(' ')}
          style={
            value === type && type === 'income'
              ? { background: 'linear-gradient(135deg, #007836, #1fa32e)' }
              : undefined
          }
        >
          {type}
        </button>
      ))}
    </div>
  );
}
