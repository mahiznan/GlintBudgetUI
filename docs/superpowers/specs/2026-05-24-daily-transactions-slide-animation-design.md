# DailyTransactions Slide Animation — Design Spec

**Date:** 2026-05-24
**Status:** Approved

## Overview

Add a direction-aware sliding animation to the `DailyTransactions` dashboard widget. When the user navigates between days or weeks, the content panel (day heading + expense total + transaction list) slides in from the appropriate side. Adjacent day content is always pre-rendered off-screen so the slide is instant with no loading buffer.

## Scope

- **Triggers:** both the ‹ › week arrows and the individual day pill buttons.
- **Animated region:** the content panel below the week strip — day heading, expense total, and transaction list together as one unit.
- **Week strip:** updates immediately on every navigation (not inside the carousel).
- **Implementation:** pure CSS transitions, no new dependencies.

## Architecture

The content area becomes a **three-panel carousel**:

- A clipping wrapper (`overflow: hidden`) contains a flex track at `width: 300%`.
- The track holds **left / center / right** panels, each `width: 33.33%`.
- At rest the track is at `transform: translateX(-33.33%)` — center panel is visible.
- Adjacent panels are always rendered with their respective dates' transaction data (already in memory from the `transactions` prop).

**Navigation flow for a `targetDate`:**

1. Direction determined: `targetDate < center` → slide right (going to the past); `targetDate > center` → slide left (going to the future).
2. Destination panel content is set to `targetDate` (instant — all data is in memory).
3. CSS transition fires: track shifts to `translateX(0%)` (right) or `translateX(-66.66%)` (left) over 280ms.
4. `transitionend` fires → disable transition, commit new center date, reset left/right to `center ± 1 day`, snap transform back to `-33.33%`, re-enable transition on next `requestAnimationFrame`.

## State Model

Two new state values are added alongside existing `weekStart` and `selectedDate`:

```typescript
// What each panel renders
const [panels, setPanels] = useState({
  left:   dayOffset(today, -1),
  center: today,
  right:  dayOffset(today, +1),
});

// Active slide direction (null = idle)
const [sliding, setSliding] = useState<'left' | 'right' | null>(null);
```

A `trackRef` (`useRef<HTMLDivElement>`) targets the flex track for the snap-back reset.

### Single navigation entry point

All existing handlers (`goToPrevWeek`, `goToNextWeek`, day-pill `onClick`, Today button, calendar picker) are replaced by:

```typescript
function navigateTo(targetDate: Date) {
  if (sliding !== null) return;                          // guard rapid taps
  if (isSameDay(targetDate, panels.center)) return;      // guard same-day tap
  const dir = targetDate < panels.center ? 'right' : 'left';
  setPanels(prev => ({
    ...prev,
    [dir === 'left' ? 'right' : 'left']: targetDate,    // pre-load target panel
  }));
  setWeekStart(getMondayOf(targetDate));                 // week strip updates immediately
  setSelectedDate(targetDate);                           // day pill highlight updates immediately
  setSliding(dir);
}
```

### Commit on transitionend

```typescript
function onTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
  if (e.target !== trackRef.current) return;            // ignore child transitions
  const committed = sliding === 'left' ? panels.right : panels.left;
  setSliding(null);
  // disable transition, snap back, re-enable on next frame
  const track = trackRef.current!;
  track.style.transition = 'none';
  setPanels({
    left:  dayOffset(committed, -1),
    center: committed,
    right: dayOffset(committed, +1),
  });
  requestAnimationFrame(() => {
    track.style.transition = '';
  });
}
```

## CSS & Rendering

### Transform table

| State | `translateX` |
|---|---|
| Idle | `-33.33%` |
| Sliding left (→ future) | `-66.66%` |
| Sliding right (→ past) | `0%` |

### JSX structure

```tsx
<div className="overflow-hidden relative">
  <div
    ref={trackRef}
    className="flex w-[300%] will-change-transform"
    style={{
      transform: sliding === 'left'
        ? 'translateX(-66.66%)'
        : sliding === 'right'
        ? 'translateX(0%)'
        : 'translateX(-33.33%)',
      transition: sliding ? 'transform 280ms ease' : 'none',
    }}
    onTransitionEnd={onTransitionEnd}
  >
    {(['left', 'center', 'right'] as const).map((slot) => (
      <div key={slot} className="w-1/3 min-w-0">
        <DayPanel
          date={panels[slot]}
          transactions={transactions}
          currencySymbol={currencySymbol}
          onDelete={onDelete}
          onEdit={(id) => { setEditingId(id); setDrawerOpen(true); }}
        />
      </div>
    ))}
  </div>
</div>
```

`will-change-transform` hints to the browser to composite the layer for smooth 60fps transitions.

### DayPanel component

An internal (non-exported) component defined inside `DailyTransactions.tsx`. Encapsulates:
- Day heading (`formatDayHeading(date)`)
- Daily expense total
- Transaction rows (filtered from `transactions` prop by `isSameDay`)
- Empty state message

Receives: `date`, `transactions`, `currencySymbol`, `onDelete`, `onEdit`.

## Edge Cases

| Scenario | Handling |
|---|---|
| Rapid taps | `navigateTo` returns early while `sliding !== null` |
| Same-day tap | `navigateTo` returns early via `isSameDay` guard |
| Week boundary (‹ from Monday) | Target = 7 days back; direction = right; left panel pre-renders that day |
| `transitionend` on a child element | Guard: `e.target !== trackRef.current` |
| Today button | Calls `navigateTo(today)` — direction computed normally |
| Calendar picker | Calls `navigateTo(pickedDate)` — direction computed normally |

## Tests

Update `DailyTransactions.test.tsx`:

- Clicking ‹ renders prev-week content after animation settles
- Clicking › renders next-week content after animation settles
- Clicking a day pill earlier than selected slides right; later slides left
- Rapid clicks during animation are ignored (only first navigation fires)
- Today button and calendar picker both trigger the slide animation
- `transitionend` on a child element does not commit state prematurely

## Files Changed

- `src/lib/dateUtils.ts` — add `dayOffset(date: Date, days: number): Date` helper
- `src/components/dashboard/DailyTransactions.tsx` — carousel state, `navigateTo`, `DayPanel` internal component
- `src/components/dashboard/DailyTransactions.test.tsx` — updated and new tests
