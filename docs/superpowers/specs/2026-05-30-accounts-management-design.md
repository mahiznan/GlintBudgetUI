# Accounts Management — Design Spec

**Date:** 2026-05-30  
**Stage:** Settings → Accounts tab enhancement  
**Status:** Approved, ready for implementation

---

## 1. Overview

Replace the generic `BudgetDataTab` on the Settings Accounts tab with a dedicated `AccountsTab` component that adds archive, delete (with confirmation), and edit-with-transaction-rename capabilities. Archived accounts are hidden from all transaction form dropdowns automatically.

---

## 2. Requirements

| Action | Who it applies to | Behaviour |
|---|---|---|
| **Edit** (rename / emoji) | Default accounts + user accounts | Inline edit form; if name changed, show rename modal after save |
| **Archive** | User accounts only | Moves to `archivedAccounts`; hidden from form dropdowns |
| **Delete** | User accounts + archived accounts | Confirmation dialog; transactions NOT modified |
| **Restore** | Archived accounts only | Moves back to `accounts` |
| **Add** | User accounts | Existing add form at bottom of Active card |

Default accounts are identified by matching `DEFAULT_ACCOUNTS` by name. They show a ⭐ star badge and expose edit only (no archive, no delete).

---

## 3. Data Model

### 3.1 `Preference` type (`src/firestore/types.ts`)

Add one field:

```ts
archivedAccounts: BudgetData[];   // new — defaults to [] when absent
```

`accounts` continues to mean **active accounts only**. The iOS app safely ignores the new `archivedAccounts` field.

### 3.2 `FirestorePreferencePartial` (`src/hooks/useUpdatePreference.ts`)

Add:

```ts
archivedAccounts?: BudgetData[];
```

### 3.3 `usePreferences.ts`

Decode `archivedAccounts` from the Firestore document, defaulting to `[]` when the field is absent (existing documents).

---

## 4. New Component: `AccountsTab`

**File:** `src/components/settings/AccountsTab.tsx`  
**Test:** `src/components/settings/AccountsTab.test.tsx`

Replaces `BudgetDataTab` for the accounts tab in `Settings.tsx`. Other tabs (categories, vendors, payments) continue using `BudgetDataTab` unchanged.

### 4.1 Props

```ts
interface AccountsTabProps {
  accounts: BudgetData[];           // active accounts
  archivedAccounts: BudgetData[];   // archived accounts
  defaultItems: BudgetData[];       // DEFAULT_ACCOUNTS
  onSaveActive: (items: BudgetData[]) => void;
  onSaveArchived: (items: BudgetData[]) => void;
  uid: string;                      // needed for bulk rename hook
}
```

### 4.2 Active Accounts section

- All active accounts (defaults + user) rendered in a single card under "Active Accounts" heading.
- Default accounts (matched against `DEFAULT_ACCOUNTS` by name): ⭐ badge, **edit only** (no archive, no delete buttons).
- User accounts: edit ✏️, archive 📦, delete 🗑️ buttons.
- Inline edit form (emoji + name inputs, Save / Cancel) — same UX as `BudgetDataTab`.
- **If name changed on save**: save the preference immediately (fire-and-forget), then show the rename modal (passing `oldName`, `newName`) to ask about transactions.
- **If only emoji changed on save**: save immediately, no modal.
- Add form at bottom of the card.

### 4.3 Archived Accounts section

- Shown only when `archivedAccounts.length > 0`.
- Collapsible card, heading "Archived (N)".
- Each row: emoji + name (0.6 opacity), **Restore** button, 🗑️ Delete button.
- Restore: calls `onSaveActive([...accounts, item])` + `onSaveArchived(archivedAccounts.filter(...))`.
- Delete: shows delete confirmation dialog (same as active delete), then removes from `archivedAccounts`.

---

## 5. Dialogs

Both dialogs are rendered inline in `AccountsTab` (conditional render, not a portal). Only one dialog is visible at a time.

### 5.1 Rename modal

Triggered after saving an account with a changed name.

```
Title:   "Update transactions?"
Body:    "Do you want to update all existing transactions from
          "[oldName]" to "[newName]"?"
Note:    "Choosing No will keep old transactions linked to "[oldName]"."
Buttons: [No, keep as-is]   [Yes, update all]   (amber gradient)
```

- "Yes, update all": closes modal, calls `useBulkRenameAccount.mutate(uid, oldName, newName)` (fire-and-forget).
- "No, keep as-is": closes modal, no transaction update.
- In both cases the preference save has already happened before the modal appeared.

### 5.2 Delete confirmation

Triggered by tapping 🗑️ on any account (active user account or archived account).

```
Title:   "Delete "[name]"?"
Body:    "This account will be removed. Transactions using "[name]"
          will not be changed."
Buttons: [Cancel]   [Delete]   (red)
```

---

## 6. New Hook: `useBulkRenameAccount`

**File:** `src/hooks/useBulkRenameAccount.ts`  
**Test:** `src/hooks/useBulkRenameAccount.test.ts`

```ts
export function useBulkRenameAccount() {
  const { notifyWrite } = useSyncStatus();

  function mutate(uid: string, oldName: string, newName: string): void {
    notifyWrite();
    void (async () => {
      const col = collection(db, 'transactions');
      const q = query(col, where('user_id', '==', uid), where('account', '==', oldName));
      const snap = await getDocs(q);
      // Split into batches of 500
      const chunks = chunk(snap.docs, 500);
      await Promise.all(
        chunks.map((group) => {
          const batch = writeBatch(db);
          group.forEach((d) => batch.update(d.ref, { account: newName }));
          return batch.commit();
        }),
      );
    })();
  }

  return { mutate };
}
```

- Fire-and-forget — matches the existing pattern across all mutation hooks.
- `notifyWrite()` keeps the sync status indicator active while Firestore commits.
- No `loading` state exposed; the sync indicator is sufficient feedback.

---

## 7. Changes to `Settings.tsx`

- Import `AccountsTab` and pass `preference.archivedAccounts`, `uid`, `onSaveActive`, `onSaveArchived`.
- Add `saveArchivedAccounts` handler (calls `mutate({ archivedAccounts: items })`).
- The `accounts` tab case switches from `<BudgetDataTab>` to `<AccountsTab>`.

---

## 8. Dropdowns & form consumers (no changes required)

All places that read account lists for dropdowns (`TransactionForm`, `DefaultsTab`, planner filter pickers) already consume `preference.accounts`. Since `accounts` will only ever contain active accounts after this change, no consumer needs updating.

---

## 9. Error handling

- Firestore writes are fire-and-forget; the sync indicator covers transient failures.
- Duplicate name check on add/edit: same logic as `BudgetDataTab` — checks only against active accounts (not archived).
- Restoring an archived account whose name now conflicts with an active account: show an inline error "An active account named '[name]' already exists. Rename it before restoring."

---

## 10. Testing

`AccountsTab.test.tsx` smoke tests:
- Renders active accounts with correct action buttons (defaults: edit only; user: edit + archive + delete)
- ⭐ star badge on default accounts
- Archived section hidden when `archivedAccounts` is empty
- Archived section visible and collapsible when accounts present
- Delete confirmation dialog appears and disappears on cancel
- Rename modal appears when name changes, not when only emoji changes

`useBulkRenameAccount.test.ts`:
- Batches > 500 docs correctly (mocked Firestore)

---

## 11. Files changed / created

| File | Action |
|---|---|
| `src/firestore/types.ts` | Add `archivedAccounts: BudgetData[]` to `Preference` |
| `src/hooks/useUpdatePreference.ts` | Add `archivedAccounts` to `FirestorePreferencePartial` |
| `src/hooks/usePreferences.ts` | Decode `archivedAccounts` (default `[]`) |
| `src/hooks/useBulkRenameAccount.ts` | **New** — bulk account rename hook |
| `src/hooks/useBulkRenameAccount.test.ts` | **New** — hook tests |
| `src/components/settings/AccountsTab.tsx` | **New** — dedicated accounts tab |
| `src/components/settings/AccountsTab.test.tsx` | **New** — component smoke tests |
| `src/routes/Settings.tsx` | Wire up `AccountsTab`, pass `archivedAccounts` + `uid` |
