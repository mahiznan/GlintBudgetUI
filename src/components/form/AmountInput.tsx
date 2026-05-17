interface AmountInputProps {
  value: string;
  onChange: (v: string) => void;
  currencySymbol: string;
  error?: string;
}

export default function AmountInput({ value, onChange, currencySymbol, error }: AmountInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-text" htmlFor="amount-input">
        Amount
      </label>
      <div className="flex items-center rounded-xl border border-border bg-surface focus-within:ring-2 focus-within:ring-brand/30 overflow-hidden">
        <span className="px-4 py-3 text-sm font-mono font-semibold text-text-muted bg-surface-alt border-r border-border">
          {currencySymbol}
        </span>
        <input
          id="amount-input"
          type="number"
          min="0.01"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className="flex-1 px-4 py-3 text-sm font-mono bg-transparent outline-none text-text placeholder:text-text-muted"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
