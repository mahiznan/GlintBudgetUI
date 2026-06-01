# Mini Budget Widget in Hero Section — Design Spec

**Date:** June 1, 2026  
**Status:** Approved  
**Scope:** Add a compact budget planner widget to the HeroStatsRow, displaying the first active budget planner with color-sensitive progress indication.

---

## Overview

A new mini budget widget will be integrated into the existing `HeroStatsRow` component, appearing alongside Income and Expenses. The widget displays budget status for the first active budget planner in a compact card format, with color-coded progress indication based on spending percentage.

**Goal:** Give users at-a-glance budget health on the dashboard home screen, with a clear visual cue (green/orange/red) about their spending status.

---

## Design

### Layout

The HeroStatsRow flex container will be extended to include the mini budget widget after the Expenses stat and divider:

```
[Income: $X,XXX] | [Expenses: $X,XXX] | [Groceries Budget Card]
```

The widget card occupies the remaining flex space (flex: 1) after Income/Expenses, maintaining the hero gradient background.

### Widget Content

**Header:**
- Format: `{Budget Planner Name} • {Month Year}` (e.g., "Groceries Budget • Jun 2026")
- Styling: 10px, font-weight 700, letter-spacing 1.2px, text-transform uppercase, opacity 0.85

**Amounts (Single Line):**
Three values displayed horizontally with equal visual weight:
- **Budget:** `$XXX` (24px, font-weight bold)
- **Spent:** `$XXX` (24px, font-weight bold)
- **Remaining:** `$XXX` (24px, font-weight bold)

All amounts use 24px font size to match the visual scale of Income/Expenses in the Hero.

**Progress Bar:**
- Height: 8px, border-radius 4px
- Width: Represents percentage of budget spent (0–100%+, capped at 100% for display)
- Dynamic color gradient based on spending percentage:
  - **Green gradient** (`#10b981` → `#059669`): < 75% of budget
  - **Orange gradient** (`#f59e0b` → `#d97706`): 75–100% of budget
  - **Red gradient** (`#ef4444` → `#dc2626`): 100%+ of budget (exceeded)

**Percentage Text:**
- Displays below progress bar: "X% of budget"
- Font: 8px, opacity 0.6, right-aligned
- When exceeded: "XXX% of budget"

### Styling

- **Background:** Semi-transparent white (`rgba(255,255,255,0.1)`)
- **Border:** 1px solid `rgba(255,255,255,0.2)`
- **Border-radius:** 12px
- **Padding:** 16px
- **Cursor:** pointer (indicates clickability)
- **Text color:** white (inherits from hero gradient)

### Interaction

**Click Behavior:**
Clicking anywhere on the widget opens the `PlannerDetailDrawer` for the displayed budget planner (same behavior as `PlannerCard`).

**No Navigation Controls:**
Period/offset navigation controls are NOT included in this widget. Future enhancements may add period navigation if needed.

---

## Data & State

### Data Source

- **Planner:** First active (non-archived) budget planner from the user's Firestore data
- **Period:** Current period (no offset control); dynamically determined based on the planner's period setting (weekly/monthly/yearly)
- **Aggregation:** Uses existing `usePlannerAggregation` hook to compute:
  - `totalPlanned`
  - `totalSpent`
  - `totalRemaining`
  - `pct` (spending percentage, capped at 100 for display)

### Fallback States

- **No active planners:** The widget does not render; the hero row shows only Income and Expenses
- **Loading:** Placeholder skeleton matching the widget size
- **Empty planner:** Shows $0 for all amounts; bar shows 0% with green gradient

---

## Component Structure

**New Component:** `MiniBudgetWidget`
- **Props:**
  - `planner: BudgetPlanner` (the first active planner)
  - `transactions: Transaction[]`
  - `onWidgetClick: () => void` (callback to open detail drawer)
  
- **Hooks:**
  - `usePlannerAggregation()` — computes budget totals and percentage

**Integration Point:** `HeroStatsRow`
- Receives first active planner and transactions from parent (Dashboard)
- Conditionally renders the widget if a planner exists
- Passes click handler to open `PlannerDetailDrawer`

---

## Color States Examples

| Scenario | Spent | Budget | % | Bar Color |
|----------|-------|--------|---|-----------|
| Under control | $180 | $300 | 60% | Green |
| Approaching limit | $245 | $300 | 82% | Orange |
| Exceeded | $325 | $300 | 108% | Red |

---

## Responsive Behavior

- **Desktop (sm+):** Widget appears in the same row as Income/Expenses; flex layout ensures it wraps if space is constrained
- **Mobile:** Follows parent flex-wrap behavior; may stack to next line if screen width is limited
- No responsive breakpoints specific to the widget; it adapts to parent container

---

## Testing

**Unit Tests** (`MiniBudgetWidget.test.tsx`):
- Renders with a valid planner and transactions
- Displays correct amounts (Budget, Spent, Remaining)
- Computes correct percentage and progress bar width
- Applies correct color gradient based on percentage thresholds (< 75%, 75–100%, 100%+)
- Fires `onWidgetClick` when clicked
- Does not render if planner is null/undefined
- Shows placeholder skeleton during loading

**Integration Tests** (`HeroStatsRow.test.tsx`):
- Includes mini budget widget when a planner exists
- Omits widget when no active planners
- Passes correct data to widget

---

## Future Enhancements (Out of Scope)

- Period navigation (◄ ►) controls within the widget
- Multiple planner carousel (currently shows only first active)
- Comparison with prior periods
- Custom formatting per budget planner

---

## Summary

The mini budget widget integrates seamlessly into the hero section, providing users with immediate insight into their budget health via color-coded progress. The compact design preserves the hero row's visual balance while adding valuable at-a-glance information. Clicking the widget opens the full `PlannerDetailDrawer` for detailed budget breakdown.