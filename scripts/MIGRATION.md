# Vendor Migration Script

Migrates vendors from transaction history to user preferences, normalizing names to title case.

## Background

Previously, vendor suggestions in the transaction drawer came from both:
1. **Preferences vendor list** - manually curated vendors
2. **Transaction history** - all vendors ever used

With the auto-add vendors feature, all new vendors are automatically added to preferences when transactions are saved. This script backfills existing customers' transaction vendors into their preferences for consistency.

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
node scripts/migrate-vendors.js <user-id>

# Example:
node scripts/migrate-vendors.js "abc123def456xyz"
```

### From npm script

You can also add this to your `package.json` scripts for easier access:

```json
{
  "scripts": {
    "migrate:vendors": "node scripts/migrate-vendors.js"
  }
}
```

Then run:
```bash
npm run migrate:vendors abc123def456xyz
```

## What the Script Does

1. **Connects to Firestore** using environment variables
2. **Fetches all transactions** for the given user
3. **Extracts unique vendors** from transaction history
4. **Normalizes vendor names** to title case (e.g., "STARBUCKS" → "Starbucks")
5. **Checks for duplicates** against existing preferences vendors
6. **Adds new vendors** to the user's preferences with:
   - Default emoji: 🏪
   - Type: "vendor"
   - Parent: null
7. **Displays a summary** of what was migrated

## Example Output

```
📦 Vendor Migration Script
User ID: user123

📝 Fetching transactions...
✅ Found 42 transactions

🔍 Extracting unique vendors from transaction history...
✅ Found 18 unique vendors in transaction history

📋 Fetching user preferences...
✅ User has 5 vendors already in preferences

✏️  Normalizing vendor names and checking for duplicates...
✅ Ready to add 15 new vendors
⏭️  Skipped 3 (already in preferences or duplicates):
   - "Starbucks" → "Starbucks" (already exists)
   - "SUBWAY" → "Subway" (already exists)
   - "taco bell" → "Taco Bell" (already exists)

📋 Vendors to be added:
   1. 🏪 Amazon
   2. 🏪 Whole Foods
   3. 🏪 Target
   ... (12 more)

💾 Updating preferences document...
✅ Successfully added 15 vendors to preferences

📊 Migration Summary:
   Total vendors in transaction history: 18
   Vendors already in preferences: 3
   New vendors added: 15
   Total vendors after migration: 20

✨ Migration complete!
```

## Safety Features

- **Preview mode**: Shows what will be migrated before updating
- **Case-insensitive duplicate detection**: Won't add "starbucks" if "Starbucks" already exists
- **Normalization**: All vendors normalized to title case for consistency
- **Batch processing**: All updates in a single operation
- **Non-destructive**: Only adds vendors, never deletes or modifies existing ones

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
2. Firestore rules allow read access (usually they do for Admin SDK)
3. Try regenerating the service account key

### "Firebase config not found"
Make sure `.env.local` exists and has all required `VITE_FIREBASE_*` variables filled in.

### "Preferences document not found"
The user ID doesn't have a preferences document. This user may not have been set up properly in the system.

### "No transactions found"
The user has no transactions yet, so there are no vendors to migrate.

## Running for Multiple Users

To migrate vendors for multiple users, create a batch script:

```bash
#!/bin/bash

USER_IDS=(
  "user1_uuid"
  "user2_uuid"
  "user3_uuid"
)

for uid in "${USER_IDS[@]}"; do
  echo "Migrating vendors for $uid..."
  npx ts-node scripts/migrate-vendors.ts "$uid"
  echo ""
done
```

## Notes

- The script is idempotent - running it multiple times on the same user is safe
- Vendors are normalized to title case (matching the auto-add feature behavior)
- The default emoji 🏪 is used for all migrated vendors
- No transactions are modified during migration
