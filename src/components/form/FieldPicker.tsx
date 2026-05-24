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
  onNext?: (name: string) => void;
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
        aria-label={label}
        onClick={onOpen}
        className="w-full flex items-center gap-[10px] py-[14px] border-b border-[#f1f5f9] text-left"
      >
        <div
          className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-[16px] flex-shrink-0"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-[0.07em]">
            {label}
            {required && <span className="text-red-500 ml-[2px]">*</span>}
          </div>
          <div
            className="text-[16px] font-medium mt-[1px] truncate"
            style={{ color: value ? '#0f172a' : '#cbd5e1' }}
          >
            {value || `Select ${label.toLowerCase()}…`}
          </div>
        </div>
        <span className="text-[14px] text-[#cbd5e1]">›</span>
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
            onNext?.(name);
          }}
          onClose={onClose}
          allowFreeText={allowFreeText}
        />
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
