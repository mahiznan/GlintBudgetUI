# Account Migration Script

Migrates account names from transaction history to user preferences.

## Background

Previously, account names were only referenced in transactions. With the preference management system, accounts should be stored in the user's preference document with metadata like emoji and type.

This script backfills existing customers' transaction accounts into their preferences, making them available as a curated list.

## Prerequisites

1. **Firebase Service Account Key**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project → Settings (⚙️) → Service accounts
   - Click "Generate new private key"
   - Save the JSON file as `scripts/serviceAccount.json`
   - ⚠️ **IMPORTANT**: Add `serviceAccount.json` to `.gitignore` to keep it private!

2. **Environment variables set up** in `.env.local`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   ```

3. **Node.js installed** (v16+)

4. **User ID** - The Firebase UID of the user to migrate

## Usage

```bash
# Run the migration script for a specific user
node scripts/migrate-accounts.js <user-id>

# Example:
node scripts/migrate-accounts.js "abc123def456xyz"
```

### From npm script

You can also use the npm script:

```bash
npm run migrate:accounts abc123def456xyz
```

## What the Script Does

1. **Connects to Firestore** using environment variables
2. **Fetches all transactions** for the given user
3. **Extracts unique accounts** from transaction history
4. **Checks for duplicates** against:
   - Existing active accounts in preferences
   - Archived accounts in preferences
5. **Adds new accounts** to the user's active accounts with:
   - Default emoji: 🏦
   - Type: "account"
   - Parent: null
6. **Displays a summary** of what was migrated

## Example Output

```
📦 Account Migration Script
User ID: user123

📝 Fetching transactions...
✅ Found 42 transactions

🔍 Extracting unique accounts from transaction history...
✅ Found 5 unique accounts in transaction history

📋 Fetching user preferences...
✅ User has 3 active accounts and 0 archived accounts

✏️  Checking for duplicates in active and archived accounts...
✅ Ready to add 3 new accounts
⏭️  Skipped 2 (already in active/archived or duplicates):
   - "Cash" (already exists in active or archived)
   - "Checking" (already exists in active or archived)

📋 Accounts to be added:
   1. 🏦 Savings
   2. 🏦 Credit Card
   3. 🏦 Investment

💾 Updating preferences document...
✅ Successfully added 3 accounts to preferences

📊 Migration Summary:
   Total accounts in transaction history: 5
   Accounts already in preferences: 2
   New accounts added: 3
   Total active accounts after migration: 6

✨ Migration complete!
```

## How Duplicate Detection Works

The script checks if an account already exists by comparing names **case-insensitively** across:
- **Active accounts** in preferences
- **Archived accounts** in preferences (won't add if archived)

This prevents duplicate accounts while respecting the distinction between active and archived accounts.

For example, if your preferences have:
- Active: "Checking", "Savings"
- Archived: "Old Account"

And transactions contain: "checking", "NEW ACCOUNT", "savings", "old account"

The script will only add "NEW ACCOUNT" as a new active account.

## Safety Features

- **Preview mode**: Shows what will be migrated before updating
- **Case-insensitive duplicate detection**: Won't add "savings" if "Savings" already exists
- **Archived account awareness**: Won't re-add archived accounts as active
- **Batch processing**: All updates in a single operation
- **Non-destructive**: Only adds accounts, never deletes or modifies existing ones

## Security

The migration script uses **Firebase Admin SDK**, which:
- Bypasses Firestore security rules (requires authentication)
- Requires a service account key from your Firebase project
- Has full read/write access to your database

**Keep `scripts/serviceAccount.json` private!**
- Never commit it to version control (already in `.gitignore`)
- Never share it publicly
- Treat it like a password

## Troubleshooting

### "Service account file not found"
You need to generate a service account key:
1. Go to Firebase Console → Project settings → Service accounts
2. Click "Generate new private key"
3. Save the JSON file as `scripts/serviceAccount.json`
4. The file is automatically ignored by git (see `.gitignore`)

### "Missing or insufficient permissions"
The service account doesn't have access. Check:
1. Service account was generated from the correct Firebase project
2. Firestore rules allow write access for the preference collection
3. Try regenerating the service account key

### "Firebase config not found"
Make sure `.env.local` exists and has all required `VITE_FIREBASE_*` variables filled in.

### "Preferences document not found"
The user ID doesn't have a preferences document. This user may not have been set up properly in the system.

### "No transactions found"
The user has no transactions yet, so there are no accounts to migrate.

## Running for Multiple Users

To migrate accounts for multiple users, create a batch script:

```bash
#!/bin/bash

USER_IDS=(
  "user1_uuid"
  "user2_uuid"
  "user3_uuid"
)

for uid in "${USER_IDS[@]}"; do
  echo "Migrating accounts for $uid..."
  npm run migrate:accounts "$uid"
  echo ""
done
```

## Notes

- The script is idempotent - running it multiple times on the same user is safe
- Account names are trimmed of whitespace but preserve original casing
- The default emoji 🏦 is used for all migrated accounts
- No transactions are modified during migration
- Archived accounts are checked but not modified
