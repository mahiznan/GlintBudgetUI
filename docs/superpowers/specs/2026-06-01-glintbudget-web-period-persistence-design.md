# GlintBudget Web: Period Preference Persistence Design

**Date:** 2026-06-01  
**Stage:** Stage 3+ Enhancement  
**Status:** Ready for implementation

## Overview

Persist the user's preferred period (day, week, month, quarter, year) as an app-level preference. When the user reloads the app, the dashboard and all widgets will restore to their last-used period view instead of always defaulting to 'month'.

## Requirements

- **Default period:** week (if no preference is stored)
- **Scope:** Global app-level state in AppShell; all current and future widgets inherit the persisted period
- **Data persistence:** Firestore Preference document
- **User experience:** 
  - No breaking changes to existing period-change UI
  - Period change is immediate (sync via `updatePreference`)
  - Period persists across browser reloads and sessions

## Architecture

### Data Model

**Preference type** (`src/firestore/types.ts`):
- Add optional field: `defaultPeriod?: Period`
- Stores the user's preferred period at time of last change
- Mirrors iOS app's preference persistence pattern

### State Management

**AppShell** (`src/routes/AppShell.tsx`):
- Initializes `period` state from `preference?.defaultPeriod ?? 'week'`
- Uses a `useEffect` to sync preference loading to period state
- All child routes access period via `useOutletContext`

**Dashboard & Components** (`src/routes/Dashboard.tsx` and descendants):
- When user changes period via SpendingChart buttons:
  - Update local period state immediately (via `setPeriod`)
  - Call `updatePreference({ defaultPeriod: newPeriod })` to persist
  - Follows existing pattern used for `spendingChartType`

### Widgets Affected

All period-dependent widgets automatically inherit the persisted default:
- SpendingChart (period buttons)
- CategoryBreakdown (filtered by period)
- IncomeExpenseDonut (filtered by period)
- QuickStats (period stats)
- Any future widgets using the period context

Period-independent widgets unaffected:
- DailyTransactions (all-date view)
- BudgetPlannerCarousel

## Implementation Details

### 1. Update Preference Type

File: `src/firestore/types.ts`

Add `defaultPeriod?: Period` to the `Preference` interface. This stores the user's preferred viewing period.

### 2. Initialize Period in AppShell

File: `src/routes/AppShell.tsx`

In the component, add a `useEffect` that:
- Reads `preference` via `usePreferenceContext()`
- Initializes `period` state from `preference?.defaultPeriod ?? 'week'`
- Runs once when preference loads (or when preference changes)

Since `PreferenceProvider` wraps `AppShell` in the component tree, `usePreferenceContext()` is available in AppShell.

### 3. Sync Period Changes to Preference

File: `src/routes/Dashboard.tsx`

In `handlePeriodChange` (create if needed, or extend the existing `onPeriodChange` callback):
- Call `setPeriod(newPeriod)` for immediate UI update
- Call `updatePreference({ defaultPeriod: newPeriod })` to persist

This follows the same pattern as `handleChartTypeChange`.

## Data Flow

```
User clicks period button in SpendingChart
  ↓
Dashboard.handlePeriodChange(newPeriod)
  ├─ setPeriod(newPeriod)          ← immediate UI update
  └─ updatePreference({ defaultPeriod: newPeriod })  ← persist to Firestore
       ↓
    Preference document updated in Firestore
       ↓
    App reload
       ↓
    AppShell initializes period from preference.defaultPeriod
       ↓
    All widgets use the restored period
```

## Testing Strategy

### Unit Tests
- Verify Preference type accepts `defaultPeriod` field
- Test `updatePreference` correctly saves the period

### Integration Tests
- User changes period → verify `updatePreference` is called with correct value
- App reloads with stored period → verify period is restored in AppShell

### Manual Testing
1. Set period to week, reload → should stay week
2. Change to month, reload → should stay month
3. Verify all widgets (chart, category breakdown, stats) reflect the restored period
4. Verify chart type and period persist independently (chart type can be bar, period can be week)

## Naming Convention

Field is named `defaultPeriod` (not `spendingChartPeriod`) to signal:
- This is the user's preferred period across the entire app
- It's not tied to any specific widget
- It supports any current or future use case (reports, budgets, forecasts, etc.)

## Migration & Backwards Compatibility

- Existing Preference documents without `defaultPeriod` are handled gracefully via the `??` fallback to 'week'
- No data migration needed; the field is optional
- Existing users see no change until they explicitly set a different period

## Success Criteria

✅ User can change the period, reload, and see the period restored  
✅ All widgets (chart, breakdown, stats) use the persisted period  
✅ Default is 'week' if no preference is stored  
✅ Period and chart type preferences persist independently  
✅ No performance regression
