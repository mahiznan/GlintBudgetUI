# Daily Transactions — Calendar Date Picker

**Date:** 2026-05-24  
**Status:** Approved  
**Scope:** `DailyTransactions` widget + `MiniCalendar` component

---

## Goal

Add a calendar icon button next to the "Today" button in the `DailyTransactions` widget header. Clicking it opens a popover month-grid picker. Selecting any past or present date navigates the week strip to that week and highlights that day. Future dates are disabled.

---

## UI Changes

### Header row

Current layout (left side):

```
[Transactions label]  [Today button]
```

New layout:

```
[Transactions label]  [Today button]  [📅 calendar icon]
```

The calendar icon button:

- SVG calendar icon, ~14 px, `text-text-muted` at rest, `text-brand` on hover
- `aria-label="Pick a date"`, `aria-expanded={calendarOpen}`
- Toggles `calendarOpen` state; clicking again closes the popover
- Sits inside a `relative`-positioned `div` that also contains the popover

### Popover

- Absolutely positioned below the icon (`top-full mt-1`), left-aligned to the icon
- `bg-surface rounded-xl border border-border shadow-lg p-3 w-64 z-50`
- Closes on outside click via `useEffect` + `mousedown` document listener
- Contains the adapted `MiniCalendar`

---

## `MiniCalendar` changes

The existing component accepts `activeType: 'expense' | 'income'`. Extend to:

```ts
activeType?: 'expense' | 'income' | 'brand'
```

- Default: `'brand'`
- `'brand'` uses `var(--brand-gradient)` as the selected-day background and `0 2px 6px rgba(245,158,11,0.30)` as the shadow — matching the Today button
- Future dates (`ds > todayStr`) render with `opacity-30 cursor-not-allowed pointer-events-none`
- All existing callers (TransactionForm) pass `activeType="expense"` or `activeType="income"` explicitly, so the default does not affect them

---

## State and logic in `DailyTransactions`

Add one new piece of state:

```ts
const [calendarOpen, setCalendarOpen] = useState(false);
```

On date pick from the popover:

```ts
function handleCalendarPick(dateStr: string) {
  const picked = new Date(dateStr + 'T00:00:00');
  setWeekStart(getMondayOf(picked));
  setSelectedDate(picked);
  setCalendarOpen(false);
}
```

Outside-click handler (in `useEffect`):

```ts
useEffect(() => {
  if (!calendarOpen) return;
  function handleClick(e: MouseEvent) {
    if (!popoverRef.current?.contains(e.target as Node)) setCalendarOpen(false);
  }
  document.addEventListener('mousedown', handleClick);
  return () => document.removeEventListener('mousedown', handleClick);
}, [calendarOpen]);
```

A `popoverRef = useRef<HTMLDivElement>(null)` is attached to the relative wrapper div.

The `MiniCalendar` receives the current `selectedDate` formatted as `YYYY-MM-DD` as its `value`, so the picker opens showing the already-selected date highlighted.

---

## What does NOT change

- Week strip prev/next navigation — unchanged
- Today button behavior — unchanged
- Next-week disabled guard (`onCurrentWeek`) — unchanged
- All other `DailyTransactions` props and behavior — unchanged
- `MiniCalendar` behavior for existing callers — unchanged (explicit `activeType` prop)

---

## Files affected

| File                                                  | Change                                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/components/form/MiniCalendar.tsx`                | Add `'brand'` to `activeType` union; disable future dates                           |
| `src/components/dashboard/DailyTransactions.tsx`      | Add calendar icon, popover, `calendarOpen` state, outside-click handler             |
| `src/components/form/MiniCalendar.test.tsx`           | Test that future dates are disabled when `activeType` is omitted / `'brand'`        |
| `src/components/dashboard/DailyTransactions.test.tsx` | Smoke test: calendar icon opens/closes popover, picking a date updates selected day |

---

## Accessibility

- Icon button has `aria-label="Pick a date"` and `aria-expanded`
- Popover is adjacent in DOM order so Tab lands on it naturally
- `Escape` key closes the popover (add `keydown` listener alongside the `mousedown` one)
