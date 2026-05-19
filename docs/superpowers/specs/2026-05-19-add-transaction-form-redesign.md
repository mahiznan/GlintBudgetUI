# Add Transaction Form Redesign — Design Spec

**Date:** 2026-05-19  
**Status:** Approved  
**Scope:** Redesign of `AddTransactionDrawer` and its sub-components (`TypeToggle`, `AmountInput`, `FieldPicker`) in the GlintBudget Web app.

---

## 1. Motivation

The existing form uses native `<select>` dropdowns and a small bordered `<input>` for the amount. This spec replaces it with a premium mobile-style drawer form that is fast to fill in, keyboard-navigable, and visually consistent with the brand.

---

## 2. Layout Overview

The drawer is a right-sliding panel (existing 480 px shell, unchanged). Inside, top to bottom:

1. **Header** — "New Transaction" title + close button (unchanged)
2. **Type Toggle** — full-width, 50/50 split
3. **Amount Row** — currency badge left, big number right
4. **Field List** — scrollable, each field expands inline when focused
5. **Footer** — Cancel + Save buttons

---

## 3. Component Designs

### 3.1 TypeToggle (full redesign)

- Full width of the drawer, no padding, no rounded corners, height 52 px
- Two equal halves (`flex: 1` each)
- **Active Expense:** `background: var(--expense-gradient)` (`linear-gradient(135deg, #f87171, #dc2626)`), white text
- **Active Income:** `background: var(--brand-gradient)`, white text
- **Inactive side:** `background: #e2e8f0`, `color: #94a3b8` — solid grey, no colour bleed
- Label format: emoji + uppercase text (e.g. "💸 EXPENSE" / "💰 INCOME")
- Clicking either half fires `onChange` immediately; no animation delay needed

### 3.2 Amount Display (full redesign of `AmountInput`)

The existing bordered input row is replaced by a two-element horizontal row inside a lightly tinted band (`background: #fafcff`, `border-bottom: 1px solid #f1f5f9`):

**Currency Badge (left)**
- Pill shape: `background: #f1f5f9`, `border: 1px solid #e2e8f0`, `border-radius: 20px`, `padding: 6px 12px`
- Shows currency code and symbol: e.g. `₹ INR ▾`
- Clicking opens a **currency picker** — same inline-expand pattern as other fields, showing `preference.bookmarkedCurrencies` as a searchable list
- `font-size: 13px`, `font-weight: 700`, `color: #475569`

**Amount Number (right)**
- `font-size: 48px`, `font-weight: 800`, monospaced font (`--font-mono`)
- `font-variant-numeric: tabular-nums`, `text-align: right`, `flex: 1`
- Placeholder value: `0.00` in `color: #cbd5e1`
- Filled value: `color: #0f172a`
- Implemented as a controlled `<input type="number">` visually styled to look like a display — `border: none`, `background: transparent`, `outline: none`
- `min="0.01"`, `step="0.01"`, `placeholder="0.00"`
- Focusing this input auto-selects existing value

### 3.3 Field List — Inline Expand Pattern

Each field is rendered as a **row**: icon pill + label/value stack + chevron.  
Tapping a row (or tabbing/entering into it) expands a picker inline immediately below the row header, pushing subsequent fields down. Only one picker is open at a time; opening a new field closes the previous one.

**Row anatomy:**
```
[28×28 icon pill]  [label (9px uppercase muted) / value (13px)]  [› chevron]
```

**Inline picker anatomy (when expanded):**
```
[full-bleed band: background #f8fafc, border-top/bottom 1.5px #e2e8f0]
  [search row: white bg, border 1.5px brand-green, rounded-10px]
    [🔍 icon]  [text input — user types here]
  [suggestion list]
    [emoji]  [name with match chars in brand-green]  [sub-hint]  [✓ if selected]
```

When the search field is empty, the full list is shown. As the user types, the list filters to matching items (case-insensitive prefix/substring match on name). Match characters are wrapped in `<em>` styled `color: var(--color-brand)`.

**Field order and icons:**

| # | Field | Icon bg | Required | Notes |
|---|-------|---------|----------|-------|
| 1 | Vendor | `#eff6ff` (blue-50) | Yes | `allowFreeText` — user can type a new name not in the list |
| 2 | Category | `#fdf4ff` (purple-50) | Yes | From `preference.categories` |
| 3 | Sub-category | `#fdf4ff` 70% opacity | No | Conditional — only rendered when the selected category has matching `preference.subCategories`; hidden otherwise |
| 4 | Date | `#ecfdf5` (green-50) | Yes | See §3.4 |
| 5 | Account + Payment | `#fff7ed` / `#fff1f2` | Both Yes | Side-by-side in one row (see §3.5) |
| 6 | Notes | `#f8fafc` (slate-50) | No | Free-text textarea inside the inline expand |

### 3.4 Date Field — Mini Calendar Picker

When expanded, the date field shows a compact inline calendar:

- **Header:** Month + year label left, `‹` `›` nav buttons right (24×24 px, bordered)
- **Grid:** 7-column CSS grid, Mon–Sun header row (9px uppercase muted), then day cells
- **Day cell:** `aspect-ratio: 1`, `border-radius: 6px`, 11px font
  - Default: `color: #0f172a`
  - Other month: `color: #cbd5e1`
  - Today: `background: #f1f5f9`, `font-weight: 700`
  - Selected: gradient matching active type (expense = red, income = brand-green), white text, drop shadow
- Selecting a day closes the calendar and shows the formatted date in the row value
- **Default value:** The `selectedDate` prop passed from `DailyTransactions` — the date the user has selected in the Transactions widget before opening the drawer. `DailyTransactions` must pass `selectedDate` to `AddTransactionDrawer` as a new prop.

### 3.5 Account + Payment — Side-by-Side Row

Account and Payment share a single row divided by a vertical separator:

```
[🏦 Account: Select…]  |  [💳 Payment: Select…]
```

Each half is `flex: 1` and tappable independently. Tapping either half expands the full-width inline picker below, scoped to that field. Only one of the two can be open at a time.

### 3.6 Notes Field

When expanded, shows a `<textarea>` (3 rows, `resize: none`) inside the inline band. No suggestions needed.

### 3.7 Footer Buttons

- `Cancel` and `Save` are both `flex: 1` (equal width)
- **Save** gradient tracks active type:
  - Expense: `var(--expense-gradient)` with `box-shadow: 0 4px 14px rgba(220,38,38,0.30)`
  - Income: `var(--brand-gradient)` with matching green glow
- Label: "Save" (not "Save Transaction")

---

## 4. Keyboard Navigation

- **Enter** on the amount input → moves focus to Vendor
- **Enter** or **Tab** while a picker is open → selects highlighted suggestion and advances to next field
- **Arrow Up / Down** in a picker list → moves highlight
- **Escape** → closes current picker (field stays in row, value unchanged)
- **Enter** on the last field (Notes) → focuses Save button
- **Enter** on Save button → submits the form

---

## 5. Prop Changes

### `AddTransactionDrawer`

Add `selectedDate?: Date` prop. When provided, the form's initial `date` is set to this value instead of `new Date()`.

```ts
interface AddTransactionDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  selectedDate?: Date;   // NEW — pre-fill from DailyTransactions
}
```

### `DailyTransactions`

Pass `selectedDate` to `<AddTransactionDrawer>`:

```tsx
<AddTransactionDrawer
  open={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  onSaved={() => { onTransactionAdded?.(); }}
  selectedDate={selectedDate}   // NEW
/>
```

---

## 6. New / Modified Components

| File | Change |
|------|--------|
| `src/components/form/TypeToggle.tsx` | Full redesign per §3.1 |
| `src/components/form/AmountInput.tsx` | Full redesign per §3.2; remove currency symbol prop, add `onCurrencyClick` |
| `src/components/form/FieldPicker.tsx` | Full redesign per §3.3 — replace `<select>` / `<datalist>` with custom inline-expand search UI |
| `src/components/form/MiniCalendar.tsx` | **New** — standalone calendar component used by the date field |
| `src/components/transactions/AddTransactionDrawer.tsx` | Wire new components, add `selectedDate` prop, implement single-open-picker state, keyboard nav |
| `src/components/dashboard/DailyTransactions.tsx` | Pass `selectedDate` to drawer |

---

## 7. State Management (inside `AddTransactionDrawer`)

```ts
const [activeField, setActiveField] = useState<string | null>(null);
// null = no picker open
// 'vendor' | 'category' | 'subCategory' | 'date' | 'account' | 'payment' | 'notes' | 'currency'
```

Opening a field: `setActiveField('vendor')`  
Closing: `setActiveField(null)`  
Selecting a value in a picker: set form value, then `setActiveField(nextField)` for keyboard-Enter flow.

---

## 8. Validation

Unchanged from current implementation. Errors render as `text-xs text-red-600` below the affected field row (not inside the picker).

---

## 9. What Does NOT Change

- Drawer slide-in/out animation and portal rendering
- Escape-key closes-drawer behavior
- Firebase `addTx` mutation logic
- `preference` data seeding on open
- Form submission structure and `Transaction` shape written to Firestore
- All existing smoke tests for `AddTransactionDrawer` (will be updated to match new DOM)
