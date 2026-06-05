#!/usr/bin/env node

/**
 * Migration script: Account History → Preferences
 *
 * Extracts all unique account names from a user's transaction history
 * and adds them to the user's preferences account list (avoiding duplicates).
 * Checks both active accounts and archivedAccounts to avoid duplicates.
 *
 * Uses Firebase Admin SDK to bypass security rules.
 *
 * Usage:
 *   node scripts/migrate-accounts.js <user-id>
 *
 * Example:
 *   node scripts/migrate-accounts.js "abc123def456"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env.local');

const loadEnv = () => {
  const env = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach((line) => {
      const [key, value] = line.split('=');
      if (key && value && !key.startsWith('#')) {
        env[key.trim()] = value.trim();
      }
    });
  }
  return env;
};

const envVars = loadEnv();

/**
 * Check if account exists in arrays (case-insensitive)
 */
function accountExists(name, activeAccounts, archivedAccounts) {
  const lowerName = name.toLowerCase();
  return (
    activeAccounts.some((a) => a.name.toLowerCase() === lowerName) ||
    archivedAccounts.some((a) => a.name.toLowerCase() === lowerName)
  );
}

async function migrateAccounts(userId) {
  // Check for service account file
  const serviceAccountPath = path.join(__dirname, 'serviceAccount.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Service account file not found at scripts/serviceAccount.json');
    console.error('\n💡 To set up the migration script:');
    console.error('   1. Go to Firebase Console → Project settings → Service accounts');
    console.error('   2. Click "Generate new private key"');
    console.error('   3. Save the JSON file as scripts/serviceAccount.json');
    console.error('\n⚠️  Keep serviceAccount.json private and never commit it to git!\n');
    process.exit(1);
  }

  // Validate Firebase config
  const projectId = envVars.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error('❌ Firebase config not found. Please set environment variables in .env.local');
    process.exit(1);
  }

  console.log(`\n📦 Account Migration Script`);
  console.log(`User ID: ${userId}\n`);

  // Initialize Firebase Admin SDK
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
      });
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }

  const db = admin.firestore();

  try {
    // 1. Fetch all transactions for this user
    console.log('📝 Fetching transactions...');
    const txSnapshot = await db.collection('transactions').where('user_id', '==', userId).get();

    if (txSnapshot.empty) {
      console.log('⚠️  No transactions found for this user.');
      process.exit(0);
    }

    const transactions = [];
    txSnapshot.forEach((doc) => {
      transactions.push(doc.data());
    });

    console.log(`✅ Found ${transactions.length} transactions\n`);

    // 2. Extract unique accounts from transactions
    console.log('🔍 Extracting unique accounts from transaction history...');
    const accountSet = new Set();
    transactions.forEach((tx) => {
      const account = tx.account?.trim?.();
      if (account) {
        accountSet.add(account);
      }
    });

    const uniqueAccounts = Array.from(accountSet);
    console.log(`✅ Found ${uniqueAccounts.length} unique accounts in transaction history\n`);

    if (uniqueAccounts.length === 0) {
      console.log('ℹ️  No accounts to migrate.');
      process.exit(0);
    }

    // 3. Fetch user preferences
    console.log('📋 Fetching user preferences...');
    const prefDoc = await db.collection('preference').doc(userId).get();

    if (!prefDoc.exists) {
      console.error('❌ Preferences document not found for this user.');
      process.exit(1);
    }

    const preference = prefDoc.data();
    const existingAccounts = preference.accounts ?? [];
    const archivedAccounts = preference.archivedAccounts ?? [];
    console.log(`✅ User has ${existingAccounts.length} active accounts and ${archivedAccounts.length} archived accounts\n`);

    // 4. Check for duplicates across both active and archived accounts
    console.log('✏️  Checking for duplicates in active and archived accounts...');
    const accountsToAdd = [];
    const skipped = [];

    uniqueAccounts.forEach((account) => {
      const trimmed = account.trim();

      // Check if this account already exists (case-insensitive)
      if (accountExists(trimmed, existingAccounts, archivedAccounts)) {
        skipped.push(`"${account}" (already exists in active or archived)`);
        return;
      }

      // Check if this account is already in the "to add" list (case-insensitive)
      const lowerTrimmed = trimmed.toLowerCase();
      if (accountsToAdd.some((a) => a.name.toLowerCase() === lowerTrimmed)) {
        skipped.push(`"${account}" (duplicate in batch)`);
        return;
      }

      accountsToAdd.push({
        name: trimmed,
        emoji: '🏦',
        type: 'account',
        parent: null,
      });
    });

    console.log(`✅ Ready to add ${accountsToAdd.length} new accounts`);
    if (skipped.length > 0) {
      console.log(`⏭️  Skipped ${skipped.length} (already in active/archived or duplicates):`);
      skipped.forEach((s) => console.log(`   - ${s}`));
    }
    console.log();

    // 5. Display preview
    if (accountsToAdd.length > 0) {
      console.log('📋 Accounts to be added:');
      accountsToAdd.forEach((a, idx) => {
        console.log(`   ${idx + 1}. ${a.emoji} ${a.name}`);
      });
      console.log();
    }

    // 6. Update preferences
    if (accountsToAdd.length > 0) {
      console.log('💾 Updating preferences document...');
      const updatedAccounts = [...existingAccounts, ...accountsToAdd];

      await db.collection('preference').doc(userId).update({
        accounts: updatedAccounts,
      });

      console.log(`✅ Successfully added ${accountsToAdd.length} accounts to preferences\n`);
    } else {
      console.log('ℹ️  No new accounts to add (all already in active or archived accounts).\n');
    }

    // 7. Summary
    console.log('📊 Migration Summary:');
    console.log(`   Total accounts in transaction history: ${uniqueAccounts.length}`);
    console.log(`   Accounts already in preferences: ${skipped.length}`);
    console.log(`   New accounts added: ${accountsToAdd.length}`);
    console.log(`   Total active accounts after migration: ${existingAccounts.length + accountsToAdd.length}\n`);

    console.log('✨ Migration complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:');
    if (error instanceof Error) {
      console.error(error.message);
      if (error.message.includes('Missing or insufficient permissions')) {
        console.error('\n💡 Tip: Make sure serviceAccount.json has the correct permissions.');
        console.error('   Check Firebase Console → Firestore → Rules to ensure access is allowed.');
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.error('❌ User ID required');
  console.error('\nUsage: node scripts/migrate-accounts.js <user-id>');
  console.error('Example: node scripts/migrate-accounts.js "abc123def456"\n');
  process.exit(1);
}

migrateAccounts(userId);
