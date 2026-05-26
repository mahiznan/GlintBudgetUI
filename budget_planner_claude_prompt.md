# Budget Planner Feature Prompt for Claude Code

I want to implement a new “Budget Planner” feature in my existing personal expense tracking web application.

Current transaction model already contains:

- amount
- currency
- category
- subCategory
- notes
- vendor
- account
- transactionDate
- paymentType (credit card, debit card, bank account, etc.)

I already have an existing dashboard.  
Need to add a new dashboard widget plus planner management screens.

Build this as a production-grade feature with clean architecture, scalable backend design, responsive frontend UI, and reusable components.

# High-Level Requirements

## Budget Planner Concept

Users can create any number of budget planners.

Each planner defines:

- a time range
- filters
- planned budget amount per category

The system then compares:

- planned budget
  vs
- actual expenses

and visually shows:

- spent amount
- remaining amount
- overspending
- unplanned expenses

---

# Planner Configuration

Each planner must support:

## Basic Details

- planner name
- description (optional)
- active/inactive
- archive status

## Time Range

Support:

- weekly
- monthly
- yearly
- custom date range

## Recurring Option

While creating planner ask:

- “Is this repeatable?”

If repeatable:

- planner continues automatically for future periods and past periods
- Should have a navigation to previous periods

If not repeatable:

- once the date range is completed, it should disappear from active dashboard widgets
- archived planners should still be accessible from planner history/archive section

---

# Planner Filters

Each planner can optionally filter transactions by:

- currency
- account
- vendor
- paymentType
- category

Default behavior:

- if no filters selected → include all

Example:

- one planner may track only SGD credit-card expenses
- another may track only cash expenses
- another may track only specific vendors/accounts

---

# Currency Rules

Each planner is fixed to ONE currency.

Do NOT convert currencies.

Only transactions matching the planner currency should be included.

---

# Budget Structure

Budget planning is required only at CATEGORY level.

Example:

- Food → 1000
- Transport → 300
- Shopping → 500

However:

- clicking a category must open sub-category breakdown
- sub-category breakdown is read-only analytics
- no separate budget configuration needed for subcategories

---

# Dashboard Widget

Add a new dashboard widget section.

## Widget Behavior

- horizontal swipeable carousel/cards
- responsive for desktop + mobile
- touch swipe support on mobile
- mouse drag or arrow navigation on desktop
- each planner displayed as separate card/widget

Users can create unlimited planners from preferences/settings.

---

# Widget Contents

Each planner widget should show:

## Summary

- planner name
- date range
- total planned
- total spent
- total remaining
- status indicator

## Category Visualization

For every configured category:

- planned amount
- spent amount
- remaining amount

Show visual chart with color progression:

- green → safe
- orange → nearing limit
- red → exceeded

Possible chart options:

- stacked progress bars
- radial progress
- donut charts
- horizontal budget bars

Choose the best UX.

---

# Overspending / Status Rules

If spending exceeds planned:

- visually highlight as exceeded
- remaining becomes negative
- show negative amount clearly

Examples:

- 👍 +250 remaining
- 👎 -120 exceeded

For completed historical planners:

- show success/failure indicators
- positive remaining → success with positive styling/emojis
- exceeded → negative styling/emojis

---

# Unplanned Expenses

If expenses exist in categories NOT configured in planner:

- automatically display them
- planned amount = 0
- actual amount = spent amount
- clearly highlight as unplanned spending

Display them as individual categories.

Only show such categories if actual expenses exist.

---

# Drill-down Behavior

Clicking a category should open:

- sub-category breakdown
- list of matching transactions
- totals per sub-category
- percentage contribution

Potential UI:

- modal
- drawer
- expandable section

Choose best UX.

---

# Active vs Archived

Dashboard should display:

- only currently active planners

Archived/completed planners should be accessible from:

- planner history page
- archive section

---

# Alerts

Only in-app visual alerts needed.

No push notifications.
No email notifications.

Examples:

- nearing limit
- exceeded budget
- unplanned expense detected

---

# Backend Requirements

Design:

- DB schema changes
- entities/models
- indexes
- recurring planner handling
- archive handling
- efficient aggregation queries
- filtering strategy
- scalable reporting queries

Need:

- proper REST or GraphQL APIs
- DTOs
- validation
- pagination where needed

Include:

- sample API contracts
- request/response examples

---

# Frontend Requirements

Need:

- responsive modern UI
- reusable planner card component
- reusable chart components
- clean state management
- loading states
- empty states
- error handling
- animations/transitions for carousel

Should work well on:

- desktop
- tablet
- mobile

---

# Performance Requirements

Optimize for:

- large transaction history
- many planners
- dashboard rendering performance

Need:

- caching strategy
- lazy loading
- aggregation optimization
- memoization recommendations

---

# Technical Expectations

Please provide:

1. Recommended architecture
2. Database schema design
3. API design
4. Frontend component hierarchy
5. Suggested chart libraries
6. Planner calculation logic
7. Recurring planner logic
8. Archive logic
9. Edge cases
10. UX recommendations
11. Responsive behavior
12. Validation rules
13. Suggested implementation phases
14. Testing strategy
15. Example JSON structures
16. Query optimization suggestions

---

# Important Business Rules

- Budget resets fresh for every period
- No rollover logic
- Transaction date is the source of truth
- paymentType is NOT a date
- Zero-spend configured categories should still display
- Multiple planners may overlap
- Planners are independent views
- Same transaction can appear in multiple planners depending on filters

---

# Deliverables Expected

Generate:

- complete technical design
- backend design
- frontend architecture
- UI/UX suggestions
- API contracts
- DB schema
- pseudocode where useful
- implementation roadmap
- edge case handling
- production considerations

Do not give shallow suggestions.  
Think like a senior staff engineer designing this feature for a real-world scalable finance application.
