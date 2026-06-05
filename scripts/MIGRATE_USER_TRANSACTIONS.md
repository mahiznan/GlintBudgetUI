# User Transaction Migration Script

Migrate all transactions from one user to another by updating the user_id field.

## Use Cases

- **Account Merging**: Combine transactions from multiple accounts
- **User ID Updates**: Transfer transactions when user ID changes
- **Data Cleanup**: Consolidate scattered transactions
- **Testing**: Move test data to a test user account

## Prerequisites

1. **Firebase Service Account Key**
   - Go to Firebase Console → Project settings → Service accounts
   - Click "Generate new private key"
   - Save as `scripts/serviceAccount.json`
   - Keep this file private (in `.gitignore`)

2. **Environment variables** in `.env.local`:
   ```
   VITE_FIREBASE_PROJECT_ID=your-project-id
   ```

3. **Source and destination user IDs** (Firebase UIDs)

## Usage

### Basic Command (Preview Only)

```bash
# Using npm script
npm run migrate:user-transactions <source-user-id> <destination-user-id>

# Or with node directly
node scripts/migrate-user-transactions.js <source-user-id> <destination-user-id>
```

This shows a preview of transactions to migrate and asks for confirmation.

### With Test Transaction (Recommended)

```bash
# Using npm script
npm run migrate:user-transactions <source-user-id> <destination-user-id> --test-tx <transaction-id>

# Or with node directly
node scripts/migrate-user-transactions.js <source-user-id> <destination-user-id> --test-tx <transaction-id>
```

This tests the migration with a single transaction first, then asks for confirmation to migrate all.

### Examples

```bash
# Preview all transactions (no test)
npm run migrate:user-transactions "abc123def456" "xyz789uvw012"

# Test with a specific transaction first
npm run migrate:user-transactions "abc123def456" "xyz789uvw012" --test-tx "tx-doc-id-123"

# Using node directly with test
node scripts/migrate-user-transactions.js "old-user" "new-user" --test-tx "transaction-id"
```

## What It Does

### Without --test-tx flag:
1. ✅ Connects to Firestore using Admin SDK
2. ✅ Finds all transactions for source user
3. ✅ Shows preview of first transaction as sample
4. ✅ Verifies destination user exists
5. ✅ Asks for confirmation
6. ✅ Updates user_id in all transaction documents
7. ✅ Verifies migration completed successfully
8. ✅ Displays summary

### With --test-tx flag:
1. ✅ Fetches specific transaction by ID
2. ✅ Verifies it belongs to source user
3. ✅ Displays full transaction details
4. ✅ Asks for confirmation before proceeding
5. ✅ **Only then** fetches and migrates all transactions
6. ✅ Verifies migration completed successfully
7. ✅ Displays summary

This two-step approach lets you validate on a real transaction before migrating all.

## Test Mode (--test-tx)

Test with a single transaction before migrating all:

```bash
npm run migrate:user-transactions "old-user" "new-user" --test-tx "tx-123"
```

The script will:
1. Fetch the specific transaction by ID
2. Verify it belongs to the source user
3. Display full transaction details
4. Ask for confirmation
5. Proceed to migrate all transactions

### Test Mode Output Example

```
📦 User Transaction Migration Script
Source User ID: old-user-123
Destination User ID: new-user-456
Test Transaction ID: tx-abc123

🧪 Testing with single transaction...

📋 Transaction Details:
   ID:            tx-abc123
   Amount:        USD 50.00
   Category:      Food → Groceries
   Vendor:        Whole Foods
   Account:       Checking
   Date:          Wed Jun 05 2026
   Current user:  old-user-123
   New user:      new-user-456

✅ Transaction validation passed!

🤔 Proceed with migrating ALL transactions? (yes/no): yes

📝 Fetching all transactions for source user...
✅ Found 42 total transactions

[... continues with full migration ...]

✨ Migration complete!
```

## Example Output (Without Test Mode)

```
📦 User Transaction Migration Script
Source User ID: old-user-123
Destination User ID: new-user-456

📝 Fetching all transactions for source user...
✅ Found 42 total transactions

🔍 Verifying destination user exists...
✅ Destination user exists

📋 Preview of transactions to migrate:
   Total transactions: 42

   First transaction sample:
     - ID:       tx-abc123
     - Amount:   USD 50.00
     - Category: Food
     - Date:     Wed Jun 05 2026
     - Vendor:   Whole Foods

⚠️  WARNING: This operation will update all transactions
   Moving 42 transactions from old-user-123 to new-user-456
   This action cannot be easily undone!

🤔 Are you sure? Type "yes" to proceed: yes

💾 Updating transaction documents...
✅ Successfully updated 42 transactions

🔍 Verifying migration...
✅ Verification successful - no transactions left for source user

📊 Migration Summary:
   Transactions migrated: 42
   Remaining for source user: 0
   Total moved to destination: 42

✨ Migration complete!
```

## Safety Features

✅ **Test mode**: Validate with a single transaction before migrating all  
✅ **Preview mode**: Shows sample before updating  
✅ **Verification**: Checks that all transactions were updated  
✅ **Source validation**: Finds all transactions for source user  
✅ **Destination validation**: Checks destination user exists  
✅ **Interactive confirmation**: Ask before proceeding  
✅ **Error handling**: Clear error messages if something fails  
✅ **Batch operations**: Updates all at once (atomic-like)  

## Important Notes

### ⚠️ Cannot Be Easily Undone

This operation updates documents in Firestore. While reversible, it requires:
1. Another run with swapped user IDs, or
2. Manual Firestore edits, or
3. Database restore from backup

**Recommendation**: Test with a non-critical user first.

### Data Consistency

After migration:
- **Source user**: Has NO transactions
- **Destination user**: Has ALL transactions (original + migrated)
- **Preferences**: Remain unchanged (each user keeps their own)
- **Vendors list**: Remains with original user's preferences

If you want to transfer preferences too, that's a separate operation.

## Troubleshooting

### "Service account file not found"
1. Go to Firebase Console → Project settings → Service accounts
2. Click "Generate new private key"
3. Save JSON file as `scripts/serviceAccount.json`

### "Firebase config not found"
Ensure `.env.local` has `VITE_FIREBASE_PROJECT_ID` set

### "Missing or insufficient permissions"
- Verify service account key is from the correct project
- Check Firestore rules allow read/write access
- Try regenerating the service account key

### "Destination user does not exist"
The destination user ID doesn't have a users document yet. Migration will still proceed, but create the user account first if needed.

## Batch Migration

To migrate multiple users, create a script:

```bash
#!/bin/bash

# Map of source -> destination user IDs
declare -A MIGRATIONS=(
  ["user-1"]="user-a"
  ["user-2"]="user-b"
  ["user-3"]="user-c"
)

for source in "${!MIGRATIONS[@]}"; do
  dest=${MIGRATIONS[$source]}
  echo "Migrating $source → $dest..."
  npm run migrate:user-transactions "$source" "$dest"
  echo ""
done
```

## Reverting a Migration

If you need to reverse a migration, run the script in reverse:

```bash
# This reverses the previous migration
npm run migrate:user-transactions "new-user-456" "old-user-123"
```

## Performance Considerations

- **Batch size**: Uses Firestore batch operations (max 500 writes per batch)
- **Time**: Should complete in seconds for most users
- **Scale**: Handles thousands of transactions efficiently

## Security

- Service account credentials are never logged or displayed
- `serviceAccount.json` is in `.gitignore` to prevent accidental commits
- Requires authentication via service account
- Admin SDK access is logged in Firestore audit logs

## Questions?

Check `scripts/MIGRATION.md` for general migration script setup instructions.
