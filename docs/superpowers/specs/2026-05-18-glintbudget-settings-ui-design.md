# GlintBudget Web — Settings UI Design

**Date:** 2026-05-18
**Status:** Approved
**Scope:** Stage 4 — Settings UI (sidebar simplification + full preference management)

---

## 1. Overview

Replace the four disabled sidebar items (Reports, Categories, Accounts, Preference) with a single active **Settings** entry. Settings is a tabbed page at `/app/settings` where users can view and manage all their preference data: accounts, categories, subcategories, vendors, payments, currencies, and form defaults.

**Out of scope (follow-up):** Dashboard filtering by default entries (e.g. show only transactions for the default account and currency). This will be designed separately after Settings is shipped.

---

## 2. Sidebar Changes

**Before:**

- Dashboard ✅
- Transactions ✅
- ─── divider ───
- Reports ❌ (disabled)
- Categories ❌ (disabled)
- Accounts ❌ (disabled)
- Preference ❌ (disabled)

**After:**

- Dashboard ✅
- Transactions ✅
- ─── divider ───
- Settings ✅ → `/app/settings` (⚙ icon)

The `DISABLED_ITEMS` array in `Sidebar.tsx` is removed entirely. `AppShell.tsx`'s `TITLE_MAP` gains `'/app/settings': 'Settings'`.

---

## 3. Routing

`App.tsx` gains one child route under `/app`:

```
/app/settings  →  Settings  (lazy-loaded)
```

No nested sub-routes. The active tab is tracked via URL query param `?tab=<tabKey>`.

---

## 4. Settings Page Structure

**Route:** `src/routes/Settings.tsx`
**URL pattern:** `/app/settings?tab=accounts` (default tab when param absent: `accounts`)

### 4.1 Tab Bar

A horizontal pill row at the top of the page — same visual style as the period switcher in TopBar. Seven tabs in order:

| Key             | Label         |
| --------------- | ------------- |
| `accounts`      | Accounts      |
| `categories`    | Categories    |
| `subcategories` | Subcategories |
| `vendors`       | Vendors       |
| `payments`      | Payments      |
| `currency`      | Currency      |
| `defaults`      | Defaults      |

Clicking a tab calls `setSearchParams({ tab: key })`. The active tab renders its component below the tab bar. All tabs read from `usePreferenceContext()` and write via `useUpdatePreference()`.

### 4.2 Loading and Error States

If `preference` is still loading, show a skeleton/spinner. If `error` is non-null, show an error banner with a retry button that calls `refetch()` from the preference context.

---

## 5. List Tabs — Shared Pattern (Accounts, Categories, Vendors, Payments)

All four tabs use a single reusable `BudgetDataTab` component configured via props.

### 5.1 Defaults Section (top, collapsible)

- Expanded by default, collapsible via a chevron toggle.
- Renders built-in default items as read-only rows: `[emoji] Name`.
- No edit or delete controls — these items cannot be modified.
- A small "Default" badge on each row makes the read-only status visually clear.

### 5.2 My Items Section (bottom)

- Shows only user-added entries (those not in the defaults list).
- Full CRUD:
  - **Inline edit:** clicking an item replaces the row with an emoji input + name input + Save / Cancel buttons.
  - **Delete:** red trash icon on each row, immediate write (no confirmation dialog).
  - **Add form:** a fixed row at the bottom — emoji text input (1 char) + name text input + "Add" button.
- At most one row is in edit mode at a time.

### 5.3 Duplicate Validation

Applied on **Add** and on **Save (edit)**:

1. Trim and lowercase the input name.
2. Compare against all names in the merged list (defaults + user items), excluding the item being edited.
3. If a match exists → show inline error `"[Name] already exists."` and abort the Firestore write.

### 5.4 Firestore Write

Each mutation calls `useUpdatePreference().mutate({ [field]: updatedArray })` where `field` is `accounts`, `categories`, `vendors`, or `payments`. Only user-added items are persisted to Firestore (defaults are seeded client-side from `defaultPreferences.ts` and not stored).

After a successful write, `refetch()` is called so `PreferenceContext` reflects the latest state.

---

## 6. Subcategories Tab

`src/components/settings/SubcategoriesTab.tsx`

### 6.1 Defaults Section (collapsible)

Default subcategories are grouped under their parent category:

```
▸ 🍲 Food
    Lunch · Dinner · Breakfast · …
▸ 🚗 Transportation
    Car · Taxi · Bus · …
```

Each group is a sub-heading inside the collapsible defaults block. Read-only.

### 6.2 My Items Section

User-added subcategories displayed as a flat list. Each row shows:
`[emoji] Name  [parent-category badge]  [edit icon] [delete icon]`

Full CRUD same as list tabs. The inline add form has three fields: emoji, name, and a **parent category dropdown** (populated from `preference.categories`).

### 6.3 Duplicate Validation

Duplicate check is scoped per parent: same name + same parent = duplicate. A subcategory named "Lunch" can exist under "Food" only once, but could theoretically exist under a different parent (though this is not recommended).

---

## 7. Currency Tab

`src/components/settings/CurrencyTab.tsx`

### 7.1 Default Currency (top)

A searchable currency selector. Shows current default currency code + name + symbol. On change, writes `{ default_currency: { name, code, symbol } }` to Firestore.

The list of currencies to pick from is a static curated list of ~30 major world currencies defined in a new `src/lib/currencies.ts` constant (not fetched from an API).

### 7.2 Bookmarked Currencies (bottom)

- Lists current `bookmarkedCurrencies` as chips/rows: `[code] [name] [delete]`.
- An "Add" input lets the user type or select a currency code from the same static list.
- Duplicate check: cannot bookmark the same code twice.
- Writes to `frequent_currencies` in Firestore.

---

## 8. Defaults Tab

`src/components/settings/DefaultsTab.tsx`

Four dropdown pickers (matching the keys `TransactionForm` already reads from `defaultEntries`):

| Label                | Firestore key inside `default_entries` | Source                                                   |
| -------------------- | -------------------------------------- | -------------------------------------------------------- |
| Default Account      | `account`                              | `preference.accounts`                                    |
| Default Category     | `category`                             | `preference.categories`                                  |
| Default Sub-Category | `sub_category`                         | `preference.subCategories` filtered to selected category |
| Default Payment      | `payment`                              | `preference.payments`                                    |

Each picker saves on change (no Save button). Writes `{ default_entries: { ...existing, [key]: value } }` with merge. A "None" option is available for each to clear the default.

**Note for follow-up:** These defaults will also be used to filter the Dashboard (only show transactions matching the default account and currency). This filtering is out of scope here and will be spec'd separately.

---

## 9. Write Hook

**File:** `src/hooks/useUpdatePreference.ts`

```ts
interface UseUpdatePreferenceResult {
  mutate: (partial: Partial<FirestorePreferenceDoc>) => Promise<void>;
  loading: boolean;
  error: Error | null;
}
```

- Calls `setDoc(doc(db, 'preference', uid), partial, { merge: true })`.
- `FirestorePreferenceDoc` uses the Firestore field names (snake_case where applicable): `accounts`, `categories`, `subCategories`, `vendors`, `payments`, `default_currency`, `frequent_currencies`, `default_entries`.
- After success, calls `refetch()` from `PreferenceContext` to re-hydrate all consumers.

---

## 10. PreferenceContext + Provider Changes

`PreferenceContext` gains a `refetch: () => void` field. `PreferenceProvider` exposes it (currently `usePreferences` is a one-shot fetch; it gains a `refetch` callback that re-runs the Firestore `getDoc`). This allows any settings tab to trigger a fresh load after writing.

---

## 11. File Map

| File                                                | Change                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| `src/components/layout/Sidebar.tsx`                 | Remove `DISABLED_ITEMS`; add Settings nav item                      |
| `src/components/layout/Sidebar.test.tsx`            | Update to reflect 3-item nav                                        |
| `src/routes/AppShell.tsx`                           | Add `/app/settings` to `TITLE_MAP`                                  |
| `src/routes/AppShell.test.tsx`                      | Add Settings title test                                             |
| `src/App.tsx`                                       | Add `/app/settings` child route (lazy)                              |
| `src/context/PreferenceContext.tsx`                 | Add `refetch` to context value type                                 |
| `src/context/PreferenceProvider.tsx`                | Expose `refetch` from `usePreferences`                              |
| `src/hooks/usePreferences.ts`                       | Return `refetch` callback                                           |
| `src/hooks/usePreferences.test.ts`                  | Update tests                                                        |
| `src/hooks/useUpdatePreference.ts`                  | **NEW** — Firestore write hook                                      |
| `src/hooks/useUpdatePreference.test.ts`             | **NEW** — unit tests                                                |
| `src/lib/currencies.ts`                             | **NEW** — static list of ~30 world currencies                       |
| `src/routes/Settings.tsx`                           | **NEW** — tab bar + tab routing                                     |
| `src/routes/Settings.test.tsx`                      | **NEW** — renders correct tab content                               |
| `src/components/settings/BudgetDataTab.tsx`         | **NEW** — shared list tab (Accounts, Categories, Vendors, Payments) |
| `src/components/settings/BudgetDataTab.test.tsx`    | **NEW** — add/edit/delete/duplicate tests                           |
| `src/components/settings/SubcategoriesTab.tsx`      | **NEW** — grouped subcategories                                     |
| `src/components/settings/SubcategoriesTab.test.tsx` | **NEW**                                                             |
| `src/components/settings/CurrencyTab.tsx`           | **NEW** — default currency + bookmarks                              |
| `src/components/settings/CurrencyTab.test.tsx`      | **NEW**                                                             |
| `src/components/settings/DefaultsTab.tsx`           | **NEW** — default entries pickers                                   |
| `src/components/settings/DefaultsTab.test.tsx`      | **NEW**                                                             |

---

## 12. Testing Strategy

- **`useUpdatePreference`**: mock Firestore `setDoc`, verify field names and merge flag.
- **`BudgetDataTab`**: test defaults section toggle, add/delete/edit flows, duplicate error display.
- **`SubcategoriesTab`**: test grouping, add with parent selection, duplicate check within same parent.
- **`CurrencyTab`**: test default currency change, add/delete bookmarks, duplicate bookmark rejection.
- **`DefaultsTab`**: test each picker writes correct `default_entries` key.
- **`Settings`**: test tab switching updates URL param and renders correct tab.
- **`Sidebar`**: test only 3 nav items present, Settings is active/linked correctly.

---

## 13. Conventions

- TypeScript strict. No `any`.
- Tailwind utility classes + brand tokens only.
- Each new component co-located with its test file.
- Commit message prefixes: `feat:`, `fix:`, `test:`.
- Firestore field names must match the mobile app schema exactly (see `usePreferences.ts` field mapping).
