import type { BudgetData } from '../../firestore/types';

interface FieldPickerProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: BudgetData[];
  required?: boolean;
  error?: string;
  allowFreeText?: boolean;
}

export default function FieldPicker({
  label,
  value,
  onChange,
  options,
  required,
  error,
  allowFreeText,
}: FieldPickerProps) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-text">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {allowFreeText ? (
        <input
          id={id}
          list={`${id}-list`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Select or type ${label.toLowerCase()}…`}
          className="rounded-xl border border-border px-4 py-3 text-sm bg-surface outline-none focus:ring-2 focus:ring-brand/30 text-text"
        />
      ) : (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-border px-4 py-3 text-sm bg-surface outline-none focus:ring-2 focus:ring-brand/30 text-text appearance-none"
        >
          <option value="">Select {label.toLowerCase()}…</option>
          {options.map((o) => (
            <option key={o.name} value={o.name}>
              {o.emoji ? `${o.emoji} ` : ''}{o.name}
            </option>
          ))}
        </select>
      )}
      {allowFreeText && (
        <datalist id={`${id}-list`}>
          {options.map((o) => <option key={o.name} value={o.name} />)}
        </datalist>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
