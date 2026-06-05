# Vendor Migration Guide

Quick reference for migrating vendor data from transaction history to user preferences.

## ⚡ Quick Start (3 steps)

### 1️⃣ Get Service Account Key

```bash
# Go to Firebase Console:
# Project Settings → Service Accounts → Generate new private key
# 
# Save the JSON file as:
# scripts/serviceAccount.json
```

### 2️⃣ Verify .env.local

Make sure your `.env.local` has Firebase config:
```
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_API_KEY=...
(etc.)
```

### 3️⃣ Run Migration

```bash
# For a single user:
npm run migrate:vendors <user-id>

# Example:
npm run migrate:vendors "abc123def456xyz"
```

## 📋 What It Does

- Reads all transactions from a user's history
- Extracts unique vendor names  
- Normalizes to title case (e.g., "STARBUCKS" → "Starbucks")
- Adds to user's preference vendor list
- Skips duplicates (case-insensitive)
- Shows preview before updating

## 🔒 Security

- Uses Firebase Admin SDK (requires service account)
- `serviceAccount.json` is in `.gitignore` (never committed)
- Only adds vendors, doesn't modify transactions

## 📖 Full Documentation

See `scripts/MIGRATION.md` for:
- Detailed setup instructions
- Complete troubleshooting guide
- Batch migration examples
- Safety features
- API reference

## ❓ Need Help?

**"Missing or insufficient permissions"**
→ Check that you saved the correct service account key

**"Service account file not found"**  
→ Generate new private key in Firebase Console and save to `scripts/serviceAccount.json`

**"Preferences document not found"**
→ User hasn't been set up in the system yet

See `scripts/MIGRATION.md` for more troubleshooting.
