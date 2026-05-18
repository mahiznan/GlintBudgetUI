# Dashboard Transactions Widget — Weekly Date Strip

**Date:** 2026-05-18  
**Status:** Approved

---

## Overview

Replace the existing `PeriodTransactions` widget on the Dashboard with a weekly date-strip navigator. The widget always shows transactions for a single selected day (defaulting to today) and lets the user browse day-by-day within a week, or step backward/forward between weeks.

---

## Requirements

### Date strip

- Displays **Mon–Sun of the active week** as 7 equally-spaced tiles.
- Each tile shows the **abbreviated day name** (Mon, Tue…) and the **date number** (1–31).
- Tile shape: **rounded rectangle** (`border-radius: 8px`), not a pill.
- **Selected tile**: diagonal gradient `linear-gradient(135deg, rgb(150,191,13), #22c55e)`, white text, subtle green box-shadow.
- **Unselected tile**: `#f8fafc` background, `#e2e8f0` border, `#475569` text.
- **Dot indicator** below the number: green (`#22c55e`) on unselected tiles that have at least one transaction; white semi-transparent on the selected tile if it has transactions; invisible if no transactions.
- **Today's tile** defaults to selected when the widget first mounts.
- Tiles are not scrollable — all 7 always fit in one row between the nav arrows.

### Week navigation

- **‹ / › arrow buttons** flank the date strip (28 × 28 px, `border-radius: 8px`, slate surface).
- **›** is disabled when the active week contains today (cannot navigate to the future).
- **‹** is always enabled (navigate arbitrarily far into the past).
- Clicking ‹ or › shifts the week by 7 days and resets the selected day to the **same day-of-week position** in the new week (e.g. if Thursday is selected, Thursday of the adjacent week is selected), or today if the new week contains today.
- Week boundaries: **Monday = first day, Sunday = last day**.

### Transaction list

- Shows **all transactions for the selected date**, unfiltered — no currency filter, no account-type filter.
- Sorted **newest-first** by time within the day.
- Each row: icon · vendor name · category + time · amount (red for expense, green for income).
- Empty state: centered muted text "No transactions for this day".
- **No pagination** — all transactions for the day are shown.
- A **date heading** above the list shows the full selected date, e.g. "Sunday, 18 May".

### Widget header

- Left: `TRANSACTIONS` label (11 px, uppercase, slate-600).
- Right: `See all →` link to `/app/transactions`, text uses the same gradient (`rgb(150,191,13) → #22c55e`) via `-webkit-background-clip: text`.

---

## Architecture

### Component rename / replacement

`PeriodTransactions` is renamed to **`DailyTransactions`** and rewritten. The old component handled multi-period views and pagination; the new one is day-focused only.

- **File:** `src/components/dashboard/DailyTransactions.tsx`
- **Test:** `src/components/dashboard/DailyTransactions.test.tsx` (replaces `PeriodTransactions.test.tsx`)

### Props

```ts
interface DailyTransactionsProps {
  transactions: Transaction[];   // all transactions for the whole period (pre-fetched by Dashboard)
  currencySymbol: string;
  onDelete: (id: string) => void;
}
```

The component filters to the selected day internally — no external date state needed.

### Internal state

```ts
const [weekStart, setWeekStart] = useState<Date>(getMondayOf(today));
const [selectedDate, setSelectedDate] = useState<Date>(today);
```

### Helper functions (add to `src/lib/dateUtils.ts`)

| Function | Signature | Purpose |
|---|---|---|
| `getMondayOf` | `(d: Date) => Date` | Return the Monday of the week containing `d` |
| `getWeekDays` | `(monday: Date) => Date[]` | Return the 7 Date objects Mon–Sun |
| `isSameDay` | `(a: Date, b: Date) => boolean` | Compare dates ignoring time |
| `isCurrentWeek` | `(monday: Date) => boolean` | True if the week contains today |

### Data flow

1. Dashboard passes `allTxns` (already fetched, up to 200 transactions) to `DailyTransactions`.
2. `DailyTransactions` filters to `selectedDate` internally using `isSameDay`.
3. Dot indicators: for each tile, check whether `allTxns` contains any transaction matching that tile's date.
4. No additional Firestore reads needed.

### Dashboard changes

- Replace `<PeriodTransactions … period={period} … />` with `<DailyTransactions … />`.
- Remove the `period` prop from the `DailyTransactions` call — the widget is period-independent.
- `onDelete` wiring stays the same.

---

## Styling

All styles via Tailwind utility classes. Custom gradient values applied inline where Tailwind v4 utility doesn't cover them directly.

| Token | Value |
|---|---|
| Selected tile gradient | `linear-gradient(135deg, rgb(150,191,13), #22c55e)` |
| Selected tile shadow | `0 3px 12px rgba(150,191,13,0.45)` |
| Unselected dot | `#22c55e` |
| "See all" gradient text | same gradient, `-webkit-background-clip: text` |
| Tile border-radius | `8px` |
| Nav button size | `32 × 32 px` |

---

## Tests

`DailyTransactions.test.tsx` covers:

1. Renders today's date as selected by default.
2. All 7 days of the current week are rendered.
3. Transactions for the selected day are shown; transactions for other days are not.
4. Clicking a different tile updates the displayed transactions.
5. ‹ button steps back one week; › is disabled on the current week.
6. Dot appears on tiles that have transactions; absent on empty days.
7. Empty state shown when selected day has no transactions.

---

## Out of scope

- No currency or account-type filters on this widget.
- No pagination.
- The period selector in the AppShell header does not affect this widget.
- Changing the global brand token from amber to green is **not** in scope — only this widget uses green.
