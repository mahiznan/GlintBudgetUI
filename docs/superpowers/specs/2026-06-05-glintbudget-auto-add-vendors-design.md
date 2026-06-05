# Auto-Add Vendors to Preferences — Design Spec

**Date:** 2026-06-05  
**Status:** Design approved  
**Scope:** Feature implementation (migration script to follow)

## Overview

Currently, users can manually add vendors to their preferences, but when they enter a new vendor in the transaction form (via free-text), it doesn't automatically get added to the vendor list. This creates friction: users must manage vendors in two places (preferences and transaction form).

This spec covers **auto-adding vendors to preferences** when a transaction is saved with a new vendor. A follow-up migration script will backfill existing customers' vendors from transaction history.

## Requirements

### Functional Requirements

1. **Auto-add on save**: When a transaction is saved with a vendor name not in preferences, automatically add that vendor to the user's preference vendor list.
2. **Normalization**: Normalize all vendor names to title case (e.g., "STARBUCKS" → "Starbucks", "mcdonald's" → "McDonald's").
3. **Deduplication**: Use case-insensitive matching to prevent duplicate vendors (e.g., "Starbucks" and "starbucks" are the same vendor).
4. **Default emoji**: New auto-added vendors get a default emoji of 🏪.
5. **Metadata**: New vendors stored as `{ name, emoji: "🏪", type: "vendor", parent: null }` in preferences.

### Non-Functional Requirements

1. **No UI friction**: No dialog or confirmation — silent auto-add on transaction save.
2. **Data consistency**: Vendor name in transaction always matches normalized preference vendor name.
3. **Backward compatibility**: Works with existing preferences that have no vendors array (initialize as empty).
4. **Performance**: Normalization and dedup check must be fast (in-memory, not Firestore queries).

## Architecture

### Data Flow

```
User fills transaction form with vendor "STARBUCKS"
        ↓
Clicks "Save"
        ↓
TransactionForm calls useMutateTransaction.add() or .update()
        ↓
Hook receives vendor: "STARBUCKS"
        ↓
1. Normalize: "STARBUCKS" → "Starbucks"
2. Check preferences.vendors (case-insensitive)
3. If NOT found:
     - Add { name: "Starbucks", emoji: "🏪", type: "vendor", parent: null }
     - Update preferences doc in Firestore
4. Save transaction with normalized vendor: "Starbucks"
```

### Helper Functions

In `src/hooks/useMutateTransaction.ts`, add:

#### `toTitleCase(str: string): string`
- Input: any vendor name string
- Output: title case
- Rules:
  - Trim whitespace
  - Split on spaces and hyphens
  - Capitalize first letter of each word
  - Preserve internal structure (e.g., "O'Reilly" → "O'reilly", "McDonald's" → "Mcdonald's")
- Examples:
  - "STARBUCKS" → "Starbucks"
  - "mcdonald's" → "Mcdonald's"
  - "  whole foods  " → "Whole Foods"
  - "target-supercenter" → "Target-supercenter"

#### `vendorExists(name: string, vendors: BudgetData[]): boolean`
- Input: vendor name (already normalized) and preferences vendor list
- Output: `true` if vendor exists (case-insensitive)
- Logic: `vendors.some(v => v.name.toLowerCase() === name.toLowerCase())`

### Updated Hook Logic

**In `useMutateTransaction`, both `add` and `update` mutations:**

```typescript
// Before saving transaction:
const normalizedVendor = toTitleCase(data.vendor);

// Check preferences
if (preference && !vendorExists(normalizedVendor, preference.vendors ?? [])) {
  // Auto-add vendor to preferences
  const updatedVendors = [
    ...(preference.vendors ?? []),
    { name: normalizedVendor, emoji: "🏪", type: "vendor", parent: null }
  ];
  
  await updateDoc(preferencesRef, { vendors: updatedVendors });
}

// Save transaction with normalized vendor
const txData = {
  ...data,
  vendor: normalizedVendor,
  // ... other fields
};
await addDoc(transactionsCollection, txData);
```

## Implementation Points

### Files to Modify

1. **`src/hooks/useMutateTransaction.ts`**
   - Add `toTitleCase()` helper
   - Add `vendorExists()` helper
   - Update `add()` mutation: normalize vendor, check preferences, auto-add if needed
   - Update `update()` mutation: normalize vendor, check preferences, auto-add if needed
   - Export helpers for testing

2. **`src/hooks/useMutateTransaction.test.ts`**
   - Add tests for `toTitleCase()`
   - Add tests for `vendorExists()`
   - Add tests for auto-add logic (vendor doesn't exist → added)
   - Add tests for dedup (vendor already exists → not added again)
   - Add tests for normalization applied to transaction

### Files NOT Changed

- `src/components/form/FieldPicker.tsx` — already supports `allowFreeText`
- `src/routes/TransactionForm.tsx` — already calls `useMutateTransaction`
- `src/firestore/types.ts` — `Preference.vendors` already exists
- `src/context/PreferenceContext.tsx` — no changes needed

## Edge Cases

1. **Preferences without vendors array**
   - Old preferences may not have `vendors` field yet
   - Hook uses `preference.vendors ?? []` to handle gracefully
   - Auto-add initializes the array if missing

2. **Whitespace in vendor names**
   - `toTitleCase()` trims input before processing
   - Example: "  STARBUCKS  " → "Starbucks"

3. **Special characters**
   - Title case preserves apostrophes, hyphens, etc.
   - Examples: "o'reilly" → "O'reilly", "mcd's" → "Mcd's"

4. **Empty or invalid vendor**
   - TransactionForm validation already requires vendor
   - Hook receives non-empty string; no extra validation needed

5. **Concurrent edits (same vendor added twice)**
   - Case-insensitive `vendorExists()` check prevents this in single user session
   - Firestore dedup via second-write-wins if race condition occurs (acceptable)

6. **Transaction update with new vendor**
   - Same logic as add: check preferences, auto-add if needed
   - Prevents orphaned vendors in transaction history

## Testing Strategy

### Unit Tests (in `useMutateTransaction.test.ts`)

**Helper functions:**
- `toTitleCase()`:
  - "starbucks" → "Starbucks"
  - "MCDONALD'S" → "Mcdonald's"
  - "  WHOLE FOODS  " → "Whole Foods"
  - "target-express" → "Target-express"
  - Empty string → ""

- `vendorExists()`:
  - Exact match: returns `true`
  - Case mismatch: returns `true` (case-insensitive)
  - Not found: returns `false`
  - Empty vendors array: returns `false`

**Mutation logic:**
- Add transaction with new vendor:
  - Vendor normalized
  - Preferences updated with new vendor
  - Transaction saved with normalized vendor
- Add transaction with existing vendor (case-mismatch):
  - Vendor normalized
  - Preferences NOT updated (dedup works)
  - Transaction saved with normalized vendor
- Update transaction with new vendor:
  - Same as add logic
- Preferences without vendors array:
  - Auto-add initializes vendors array
  - New vendor added correctly

### Integration Tests (if applicable)

- Form → hook → Firestore → preferences updated
- Verify vendor suggestions in form now include newly added vendors

## Migration (Out of Scope)

A separate migration script will:
1. Query all existing transactions
2. Extract unique vendors (case-insensitive)
3. Add missing vendors to each user's preferences with default emoji 🏪
4. Scheduled as one-time batch operation per user

Migration script details in separate spec.

## Success Criteria

- ✓ New vendors in transactions automatically appear in preferences
- ✓ No duplicate vendors in preferences (case-insensitive)
- ✓ All vendor names in preferences are title case
- ✓ No UI friction (silent auto-add)
- ✓ All tests pass
- ✓ Backward compatible with existing preferences

## Open Questions

None — design is complete.
