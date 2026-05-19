import type { BudgetData } from '../../firestore/types';
import SearchPicker from './SearchPicker';

interface FieldPickerProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: BudgetData[];
  iconBg: string;
  icon: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  required?: boolean;
  allowFreeText?: boolean;
  error?: string;
  onNext?: () => void;
}

export default function FieldPicker({
  label,
  value,
  onChange,
  options,
  iconBg,
  icon,
  isOpen,
  onOpen,
  onClose,
  required,
  allowFreeText,
  error,
  onNext,
}: FieldPickerProps) {
  return (
    <div>
      {/* Row header */}
      <button
        type="button"
        onClick={onOpen}
        className="w-full flex items-center gap-[10px] py-[10px] border-b border-[#f1f5f9] text-left"
      >
        <div
          className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center text-[13px] flex-shrink-0"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold text-text-muted uppercase tracking-[0.07em]">
            {label}
            {required && <span className="text-red-500 ml-[2px]">*</span>}
          </div>
          <div
            className="text-[13px] font-medium mt-[1px] truncate"
            style={{ color: value ? '#0f172a' : '#cbd5e1' }}
          >
            {value || `Select ${label.toLowerCase()}…`}
          </div>
        </div>
        <span className="text-[11px] text-[#cbd5e1]">›</span>
      </button>

      {/* Inline picker — only when open */}
      {isOpen && (
        <SearchPicker
          label={label}
          value={value}
          options={options}
          onSelect={(name) => {
            onChange(name);
            onClose();
            onNext?.();
          }}
          onClose={onClose}
          allowFreeText={allowFreeText}
        />
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
