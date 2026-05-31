# Rename Field Script — Design Spec

**Date:** 2026-05-31
**Status:** Approved

## Overview

A standalone Node.js (TypeScript) admin script that finds all Firestore transactions belonging to a specific user where a given field equals an old value, and updates each matching transaction to a new value. Intended as a one-off terminal tool for data corrections.

## CLI Interface

```
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json \
npx tsx scripts/rename-field.ts \
  --uid <firebase-user-id> \
  --old "Old Name" \
  --new "New Name" \
  [--field vendor]   # default: vendor
  [--dry-run]        # preview without writing
```

### Arguments

| Argument    | Required | Default  | Description                                      |
|-------------|----------|----------|--------------------------------------------------|
| `--uid`     | yes      | —        | Firebase user ID to scope the query              |
| `--old`     | yes      | —        | Current field value to match                     |
| `--new`     | yes      | —        | Replacement value to write                       |
| `--field`   | no       | `vendor` | Firestore field to rename                        |
| `--dry-run` | no       | false    | Print matches without writing to Firestore       |

### Allowed fields

`vendor` | `account` | `category` | `payment`

Any other value causes the script to exit with code 1 and print the allowlist.

### Output (write mode)

```
Field:  vendor
Old:    "Starbucks"
New:    "Starbucks Coffee"
User:   abc123uid

Querying transactions…
Found 42 matching transactions.

Committing batch 1/1 (42 docs)… done.

Done. Updated 42 transactions.
```

### Output (dry-run mode)

```
DRY RUN — no writes will be made.

Field:  vendor
Old:    "Starbucks"
New:    "Starbucks Coffee"
User:   abc123uid

Querying transactions…
Found 3 matching transactions:
  tx_id_1  vendor = "Starbucks"
  tx_id_2  vendor = "Starbucks"
  tx_id_3  vendor = "Starbucks"

(dry-run) Would update 3 transactions. Re-run without --dry-run to apply.
```

## Architecture

**File:** `scripts/rename-field.ts` — single self-contained file, no helper modules.

**New dev dependency:** `firebase-admin`

**`tsx`** is already available in the project for running TypeScript scripts.

### Flow

```
parse args
  → validate required args (uid, old, new) — exit 1 if missing
  → validate --field against allowlist — exit 1 if invalid
  → check GOOGLE_APPLICATION_CREDENTIALS — exit 1 if missing
  → initializeApp(cert(serviceAccountPath))
  → getFirestore()
  → query: transactions where user_id == uid AND <field> == oldName
  → if dry-run: print matching doc IDs and exit 0
  → chunk docs into groups of 500
  → for each group in parallel:
      writeBatch → update <field> to newName on each doc → commit
  → print summary
```

### Batching

Mirrors the existing `useBulkRenameVendor` hook pattern. Firestore write batches are capped at 500 operations. Large result sets are split into chunks of 500 and all chunks are committed in parallel via `Promise.all`.

## Error Handling

| Scenario | Behaviour |
|---|---|
| Missing `--uid`, `--old`, or `--new` | Print usage, exit 1 (before any Firestore call) |
| Invalid `--field` value | Print allowlist, exit 1 (before any Firestore call) |
| `GOOGLE_APPLICATION_CREDENTIALS` not set | Print descriptive message, exit 1 |
| Service account file not found / invalid | Firebase Admin throws on init; caught, printed, exit 1 |
| Firestore query/write error | Caught, raw error message printed, exit 1 |
| Zero matches found | Print "No transactions matched." and exit 0 (no writes) |

**No partial-write rollback.** If a batch fails mid-run, already-committed batches are not reversed. The script prints how many batches succeeded so the caller knows the current state. This is acceptable for a one-off admin tool; re-running on the remaining records is safe.

## Testing

- No automated tests (one-off admin tool, not shipped app code).
- The `--dry-run` flag is the safe pre-flight check; always run dry-run first to verify match count and field values before a real write.
- Recommended workflow:
  1. `--dry-run` → confirm match count looks correct
  2. Remove `--dry-run` → apply updates

## Setup Instructions (summary for reference)

1. In Firebase Console → Project Settings → Service Accounts → Generate new private key → download JSON.
2. `export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`
3. `npm install --save-dev firebase-admin` (if not already installed)
4. `npx tsx scripts/rename-field.ts --uid <uid> --old "X" --new "Y" --dry-run`
