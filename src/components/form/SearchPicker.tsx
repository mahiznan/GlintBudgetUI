import { useState, useRef, useEffect } from 'react';
import type { ReactNode, KeyboardEvent } from 'react';
import type { BudgetData } from '../../firestore/types';

interface SearchPickerProps {
  label: string;
  value: string;
  options: BudgetData[];
  onSelect: (name: string) => void;
  onClose: () => void;
  allowFreeText?: boolean;
}

function highlightMatch(text: string, query: string): ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <em style={{ fontStyle: 'normal', color: 'var(--color-brand)' }}>
        {text.slice(idx, idx + query.length)}
      </em>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchPicker({
  label,
  value,
  options,
  onSelect,
  onClose,
  allowFreeText,
}: SearchPickerProps) {
  const [query, setQuery] = useState('');
  const [hlIdx, setHlIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus search input when picker mounts (it is only rendered when open)
    inputRef.current?.focus();
  }, []);

  const filtered = options.filter(
    (o) => o.name != null && o.name.toLowerCase().includes(query.toLowerCase()),
  );

  function select(name: string) {
    onSelect(name);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setHlIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setHlIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (filtered[hlIdx]) {
        select(filtered[hlIdx]!.name);
      } else if (allowFreeText && query.trim()) {
        select(query.trim());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  }

  const showAddOption = allowFreeText && query.trim() && filtered.length === 0;

  return (
    <div className="-mx-[18px] bg-[#f8fafc] border-y-[1.5px] border-[#e2e8f0] px-[18px] py-[10px] pb-[12px]">
      {/* Search input */}
      <div className="flex items-center gap-[7px] bg-surface border-[1.5px] border-brand rounded-[10px] px-[11px] py-[8px] mb-[8px]">
        <span className="text-[13px] text-brand">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={`Search ${label.toLowerCase()}…`}
          onChange={(e) => {
            setQuery(e.target.value);
            setHlIdx(0);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 text-[13px] font-semibold text-text bg-transparent outline-none placeholder:text-[#cbd5e1]"
        />
      </div>

      {/* Suggestion list */}
      <div className="flex flex-col gap-[2px] max-h-[180px] overflow-y-auto">
        {filtered.map((o, i) => (
          <button
            key={o.name}
            type="button"
            onClick={() => select(o.name)}
            className={[
              'flex items-center gap-[9px] px-[8px] py-[8px] rounded-[9px] text-left w-full',
              i === hlIdx ? 'bg-brand/10' : 'hover:bg-[#f1f5f9]',
            ].join(' ')}
          >
            {o.emoji && (
              <span className="text-[16px] w-[24px] text-center flex-shrink-0">{o.emoji}</span>
            )}
            <span className="flex-1 text-[13px] font-semibold text-text min-w-0 truncate">
              {highlightMatch(o.name, query)}
            </span>
            {o.name === value && <span className="text-[13px] text-brand flex-shrink-0">✓</span>}
          </button>
        ))}

        {showAddOption && (
          <button
            type="button"
            onClick={() => select(query.trim())}
            className="flex items-center gap-[9px] px-[8px] py-[8px] rounded-[9px] text-left w-full hover:bg-[#f1f5f9]"
          >
            <span className="text-[13px] text-text-muted">
              Add &ldquo;<span className="font-semibold text-text">{query.trim()}</span>&rdquo;
            </span>
          </button>
        )}

        {filtered.length === 0 && !showAddOption && (
          <p className="text-[12px] text-text-muted text-center py-2">No results</p>
        )}
      </div>
    </div>
  );
}
