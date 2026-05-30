# Vendors Tab — Full Vendor Management Design

**Date:** 2026-05-30
**Status:** Approved

## Overview

Replace the generic `BudgetDataTab` vendor usage in Settings with a dedicated `VendorsTab` component that mirrors `AccountsTab` behaviour — minus archive. The key improvement: list **all** vendors the user has ever used, not just those explicitly saved in `preference.vendors`. Transaction-derived vendors (vendor names found in transactions but not in the preference list) are shown in a collapsible "From Transactions" section.

## Data Sources

| Source | Where |
|--------|-------|
| `preference.vendors` | `Preference.vendors: BudgetData[]` — explicitly saved vendors (name + emoji) |
| Transactions | `vendor` field on every `Transaction` document — free-form names entered during transaction creation |

The tab shows the **union** of both. Duplicate detection (case-insensitive) always checks the full union.

## New Hooks

### `useAllTransactionVendors(uid: string)`

- Fetches all transactions for the given uid with no date filter and no limit.
- Returns `{ vendorNames: Set<string>; loading: boolean }`.
- Filters out empty / whitespace-only vendor strings.
- Used only inside `VendorsTab`; acceptable performance for personal-scale data (hundreds to low-thousands of transactions).

### `useBulkRenameVendor()`

Mirrors `useBulkRenameAccount` exactly:

- Queries `collection('transactions')` where `user_id == uid` AND `vendor == oldName`.
- Batch-updates the `vendor` field to `newName` in chunks of 500.
- Returns `{ mutate(uid: string, oldName: string, newName: string): void }`.

## `VendorsTab` Component

**File:** `src/components/settings/VendorsTab.tsx`

### Props

```ts
interface VendorsTabProps {
  vendors: BudgetData[];          // preference.vendors
  uid: string;
  onSave: (items: BudgetData[]) => void;
}
```

### Derived State

| Variable | Derivation |
|----------|-----------|
| `savedVendors` | `vendors` prop (all items in `preference.vendors`) |
| `txVendorNames` | `Set<string>` from `useAllTransactionVendors(uid)` |
| `txOnlyVendors` | Names in `txVendorNames` not present in `savedVendors` (case-insensitive) |
| `allVendorNames` | Union of `savedVendors` names + `txVendorNames` — used for all duplicate checks |

### Local State

```ts
editingName: string | null        // name of vendor row being edited
editName: string
editEmoji: string
editError: string
addName: string
addEmoji: string
addError: string
renameModal: { oldName: string; newName: string } | null
deleteDialog: string | null       // vendor name pending delete confirmation
fromTxOpen: boolean               // collapsible "From Transactions" section (default: false)
```

## Layout

### "Saved Vendors" Card (always visible)

- Header: `SAVED VENDORS` (uppercase, muted, same style as AccountsTab "Active Accounts").
- Rows: `[emoji] [name] [✏️ edit] [🗑 delete]` for each item in `savedVendors`.
- Inline edit row: emoji input + name input + Save + Cancel. On Save:
  1. Duplicate check against `allVendorNames` (excluding the current name).
  2. If duplicate → show inline error.
  3. If name changed → call `onSave` with updated list, then open rename modal.
  4. If name unchanged (emoji only) → call `onSave`, no modal.
- Add form (bottom of card): emoji input + name input + Add button.
  - Checks `allVendorNames` for duplicates before adding.
  - On success: calls `onSave([...savedVendors, newItem])`.

### "From Transactions" Card (collapsible, collapsed by default)

- Toggle button shows count: `From Transactions (N) ▸ / ▾`.
- Shows a loading skeleton while `useAllTransactionVendors` is fetching.
- Rows (when expanded): `[name] [✏️ edit] [Save to list]` for each name in `txOnlyVendors`.
  - No emoji column (transaction-only vendors have no metadata).
  - No delete button.
- **Edit / rename**: inline name input + Save + Cancel. On Save:
  1. Duplicate check against `allVendorNames`.
  2. If duplicate → inline error.
  3. If no duplicate and name changed → open rename modal (same modal as saved vendors).
- **"Save to list"**: adds the vendor to `preference.vendors` as `{ name, emoji: null, type: 'vendor', parent: null }`, calls `onSave`.

### Rename Modal

Identical wording to AccountsTab:

> **Update transactions?**
> Do you want to update all existing transactions from **"OldName"** to **"NewName"**?
> *Choosing No will keep old transactions linked to "OldName".*
>
> [ No, keep as-is ] [ Yes, update all ]

Choosing **Yes** calls `bulkRenameVendor(uid, oldName, newName)`.

### Delete Dialog

> **Delete "Name"?**
> This vendor will be removed. Transactions using "Name" will **not** be changed.
>
> [ Cancel ] [ Delete ]

Choosing **Delete** calls `onSave(savedVendors.filter(v => v.name !== name))`.

## `Settings.tsx` Change

Replace:

```tsx
{activeTab === 'vendors' && (
  <BudgetDataTab
    itemType="vendor"
    allItems={preference.vendors}
    defaultItems={[]}
    onSave={(items) => saveList('vendors', items)}
    saving={false}
  />
)}
```

With:

```tsx
{activeTab === 'vendors' && (
  <VendorsTab
    vendors={preference.vendors}
    uid={uid}
    onSave={(items) => saveList('vendors', items)}
  />
)}
```

## Tests

### `useBulkRenameVendor.test.ts`

- Mocks Firestore `getDocs` and `writeBatch`.
- Verifies query uses `where('vendor', '==', oldName)`.
- Verifies each matching doc is updated with `{ vendor: newName }`.

### `useAllTransactionVendors.test.ts`

- Mocks Firestore `onSnapshot` (or `getDocs`) with a set of transactions.
- Verifies returned `Set` contains unique non-empty vendor names.
- Verifies empty-string vendors are excluded.

### `VendorsTab.test.tsx`

- Renders "Saved Vendors" heading and each saved vendor name.
- "From Transactions" section is collapsed by default; expands on click.
- Adding a duplicate name shows inline error, does not call `onSave`.
- Renaming a saved vendor to a new name opens the rename modal.
- Confirming rename modal calls `bulkRenameVendor`.
- "Save to list" on a transaction-only vendor calls `onSave` with that vendor appended.

## What This Does NOT Change

- No archive for vendors (unlike accounts).
- Deleting a saved vendor does not modify any transactions.
- `BudgetDataTab` is unchanged; it continues to serve categories, payments, etc.
- Firestore rules and the iOS data model are not modified.
