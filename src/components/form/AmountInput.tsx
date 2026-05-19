interface AmountInputProps {
  value: string;
  onChange: (v: string) => void;
  currencyCode: string;
  currencySymbol: string;
  onCurrencyClick: () => void;
  onNext?: () => void;
  error?: string;
}

export default function AmountInput({
  value,
  onChange,
  currencyCode,
  currencySymbol,
  onCurrencyClick,
  onNext,
  error,
}: AmountInputProps) {
  return (
    <div>
      <div className="flex items-center gap-[12px] px-[18px] py-[16px] bg-[#fafcff] border-b border-[#f1f5f9]">
        {/* Currency badge */}
        <button
          type="button"
          aria-label="Currency selector"
          onClick={onCurrencyClick}
          className="inline-flex items-center gap-[4px] bg-[#f1f5f9] border border-border rounded-[20px] px-[12px] py-[6px] text-[13px] font-bold text-text-muted flex-shrink-0 whitespace-nowrap hover:bg-border transition-colors"
        >
          {currencySymbol} {currencyCode} <span className="text-[10px] opacity-60">▾</span>
        </button>

        {/* Amount number */}
        <input
          id="amount-input"
          type="number"
          min="0.01"
          step="0.01"
          value={value}
          placeholder="0.00"
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onNext?.();
            }
          }}
          className="flex-1 min-w-0 text-right text-[48px] font-bold font-mono bg-transparent border-none outline-none"
          style={{
            color: value ? '#0f172a' : '#cbd5e1',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-1px',
          }}
        />
      </div>
      {error && <p className="text-xs text-red-600 px-[18px] pt-1">{error}</p>}
    </div>
  );
}
