# GlintBudget Dashboard UX Polish — Design Spec

**Date:** 2026-05-19
**Status:** Approved

## Overview

Seven focused UX improvements to the Dashboard and global shell: a personalised greeting, a relocated Add Transaction button, a right-aligned period switcher, a sidebar logout, smarter week-navigation defaults, a Today shortcut button, and a per-day expense summary in the Transactions widget.

---

## 1. Personalised Greeting in TopBar

**What changes:** On the `/app/dashboard` route, the TopBar title changes from the static string `'Dashboard'` to `'Hello, <firstName>'`.

**Implementation:**

- `AppShell` already passes `title={getTitle(location.pathname)}` to `TopBar`.
- `getTitle` is updated: when `pathname === '/app/dashboard'`, it receives the authenticated user's first name (first word of `auth.user.name`, e.g. `'Rajesh Kumar'` → `'Rajesh'`). Falls back to `'there'` if `auth.user.name` is null.
- `AppShell` already has access to `auth` via `useAuth()`. It extracts `firstName` and passes it through to `getTitle` (or handles the substitution inline).
- The TopBar `<h1>` renders the string as-is; no other changes to `TopBar`.

**Example output:** `Hello, Rajesh`

---

## 2. Add Transaction Button — Moves to DailyTransactions Widget

**What changes:** The `+ Add Transaction` button is removed from `TopBar` and added to the `DailyTransactions` widget header.

**TopBar (`src/components/layout/TopBar.tsx`):**

- Remove the `<Link to="/app/transactions/new">` button entirely.
- Remove the `showAddButton` concern — the TopBar no longer owns this action.

**DailyTransactions (`src/components/dashboard/DailyTransactions.tsx`):**

- Add `<Link to="/app/transactions/new">` button labelled `+ Add` in the widget header, right side (next to "See all →").
- Styled the same as the previous TopBar button: brand gradient background, white text, small rounded pill.

---

## 3. Period Switcher — Right-Aligned

**What changes:** The Day/Week/Month/Quarter/Year switcher moves to the far right of the TopBar.

**Layout:** `title (left) — flex spacer — period switcher (right)`. There is no Add Transaction button here anymore (removed in change 2), so the right side contains only the period switcher.

This is already architecturally correct after change 2; the TopBar flex layout just needs the spacer confirmed (a `<div className="flex-1" />` between title and switcher).

---

## 4. Logout Button in Sidebar

**What changes:** A "Sign out" button is added at the bottom of the `Sidebar`, below the nav links.

**Sidebar (`src/components/layout/Sidebar.tsx`):**

- Import `useNavigate` from `react-router-dom` and `signOutCurrentUser` from `../../firebase/auth`.
- The sidebar currently has no access to auth state — it doesn't need it; calling `signOutCurrentUser()` is enough.
- Layout: `nav` flex-grows to fill space; a `<div className="sidebar-footer">` below it contains the Sign out button.
- Button style: ghost/frosted (white border, white/70 text) consistent with the sidebar's existing nav item inactive style.
- On click: call `navigate('/')` first, then `signOutCurrentUser()`. Navigating first ensures the router lands on the landing page before Firebase's `onAuthStateChanged` fires and `RequireAuth` can redirect to `/signin`.

**Logout redirect target:** `/` (landing page), not `/signin`.

---

## 5. Previous Week Navigation — Default to Last Day (Sunday)

**What changes:** When the user taps `‹` (previous week), the selected date defaults to **Sunday** of that week rather than the same weekday as the current selection.

**DailyTransactions — `goToPrevWeek()`:**

```
Before: newSelected = newMonday + dayOfWeekOffset(selectedDate)  (same weekday)
After:  newSelected = getWeekDays(newMonday)[6]  (Sunday = index 6 of Mon-based week)
```

`getWeekDays` returns 7 dates starting from Monday, so index 6 is always Sunday.

**`goToNextWeek()` is unchanged** — navigating forward to the current week already resets to today; navigating forward to a future week (not currently possible — the `›` button is disabled on the current week) would retain the existing same-weekday logic.

---

## 6. "Today" Button

**What changes:** A `Today` button appears in the DailyTransactions widget header, left side (next to the "Transactions" label).

**Two visual states — determined by `isSameDay(selectedDate, new Date())`:**

| State       | Condition                   | Style                                 |
| ----------- | --------------------------- | ------------------------------------- |
| **Filled**  | `selectedDate` is today     | Brand gradient background, white text |
| **Outline** | `selectedDate` is not today | White background, border, muted text  |

**Behaviour:**

- **Filled state:** button is still rendered but click is a no-op (user is already on today).
- **Outline state:** clicking resets `weekStart` to `getMondayOf(new Date())` and `selectedDate` to today (midnight).

**No new props needed** — `DailyTransactions` derives `isToday` from its existing state.

---

## 7. Per-Day Expense Sum

**What changes:** A summary row appears between the date strip and the first transaction, showing total expenses for the selected day.

**Placement:** Below date strip, above first transaction row. Always visible (shows `−<symbol>0` when no expenses exist for the day).

**Calculation:** Sum of `Math.abs(t.amount)` for all `dayTxns` where `t.amount < 0`.

**Label adapts to selected date:**

- Selected date is today → `"Today's expenses"`
- Any other date → `"<DayName> <date> expenses"` e.g. `"Fri 9 expenses"` using `day.toLocaleDateString('en-US', { weekday: 'short' })` and `day.getDate()`.

**Display:** `−<currencySymbol><formattedAmount>` in red (`text-red-600`), right-aligned. Label in small uppercase muted text, left-aligned. Separated from transactions below by a subtle border.

---

## Files Changed

| File                                                  | Change                                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/routes/AppShell.tsx`                             | Extract firstName from auth.user.name; pass to getTitle for dashboard route                                      |
| `src/components/layout/TopBar.tsx`                    | Remove Add Transaction button; add flex-1 spacer between title and period switcher                               |
| `src/components/layout/Sidebar.tsx`                   | Add logout button in footer; navigate('/') then signOutCurrentUser()                                             |
| `src/components/dashboard/DailyTransactions.tsx`      | Add Today button (left); Add Transaction link (right); update goToPrevWeek to select Sunday; add expense sum row |
| `src/components/layout/TopBar.test.tsx`               | Update test: no Add Transaction button expected                                                                  |
| `src/components/layout/Sidebar.test.tsx`              | Add test: Sign out button present                                                                                |
| `src/components/dashboard/DailyTransactions.test.tsx` | Add tests: Today button states, expense sum row, goToPrevWeek selects Sunday                                     |

---

## Testing

- **AppShell/TopBar:** greeting shows first name; no Add button in TopBar.
- **Sidebar:** Sign out button present; clicking it calls signOut and navigates to `/`.
- **DailyTransactions:**
  - Today button is filled when `selectedDate` is today; outline otherwise.
  - Clicking Today (outline state) resets to current week and today.
  - `goToPrevWeek` sets `selectedDate` to Sunday of the new week.
  - Expense sum row shows correct total; label says "Today's expenses" for today and "Fri 9 expenses" for other dates.
  - Expense sum shows `−<symbol>0` when no expense transactions exist.

---

## Non-Goals

- No change to the Transactions list page (`/app/transactions`).
- No change to the period switcher options or their behaviour.
- No change to how `RequireAuth` works — logout redirect is handled by navigating before sign-out, not by modifying `RequireAuth`.
