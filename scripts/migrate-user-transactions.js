#!/usr/bin/env node

/**
 * Migration script: Move Transactions Between Users
 *
 * Transfers all transactions from one user to another by updating
 * the user_id field in each transaction document.
 *
 * Uses Firebase Admin SDK for safe Firestore access.
 *
 * Usage:
 *   node scripts/migrate-user-transactions.js <source-user-id> <destination-user-id>
 *
 * Example:
 *   node scripts/migrate-user-transactions.js "old-user-123" "new-user-456"
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

async function migrateUserTransactions(sourceUserId, destinationUserId) {
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

  console.log(`\n📦 User Transaction Migration Script`);
  console.log(`Source User ID: ${sourceUserId}`);
  console.log(`Destination User ID: ${destinationUserId}\n`);

  // Safety check
  if (sourceUserId === destinationUserId) {
    console.error('❌ Source and destination user IDs are the same!');
    process.exit(1);
  }

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
    // 1. Fetch all transactions for source user
    console.log('📝 Fetching transactions for source user...');
    const txSnapshot = await db
      .collection('transactions')
      .where('user_id', '==', sourceUserId)
      .get();

    if (txSnapshot.empty) {
      console.log('⚠️  No transactions found for source user.');
      process.exit(0);
    }

    const transactions = [];
    const transactionIds = [];

    txSnapshot.forEach((doc) => {
      transactions.push(doc.data());
      transactionIds.push(doc.id);
    });

    console.log(`✅ Found ${transactions.length} transactions\n`);

    // 2. Verify destination user exists
    console.log('🔍 Verifying destination user exists...');
    const destUserDoc = await db.collection('users').doc(destinationUserId).get();

    if (!destUserDoc.exists) {
      console.warn(`⚠️  Destination user does not have a users document yet.`);
      console.warn(`   Transaction migration will still proceed.\n`);
    } else {
      console.log(`✅ Destination user exists\n`);
    }

    // 3. Display preview
    console.log('📋 Preview of transactions to migrate:');
    console.log(`   Total: ${transactions.length}`);
    if (transactions.length > 0) {
      console.log(`\n   Sample transaction:`);
      const sample = transactions[0];
      console.log(`     - ID: ${transactionIds[0]}`);
      console.log(`     - Amount: ${sample.amount}`);
      console.log(`     - Category: ${sample.category}`);
      console.log(`     - Date: ${sample.date?.toDate?.() ?? 'N/A'}`);
      console.log(`     - Current user_id: ${sample.user_id}`);
      console.log(`     - New user_id: ${destinationUserId}`);
    }
    console.log();

    // 4. Ask for confirmation (in automated mode, just proceed with warning)
    console.log('⚠️  WARNING: This operation will update all transactions');
    console.log(`   Moving ${transactions.length} transactions from ${sourceUserId} to ${destinationUserId}`);
    console.log('   This action cannot be easily undone!\n');

    // 5. Update all transactions
    console.log('💾 Updating transaction documents...');

    const batch = db.batch();
    let updated = 0;

    transactionIds.forEach((docId) => {
      const docRef = db.collection('transactions').doc(docId);
      batch.update(docRef, {
        user_id: destinationUserId,
      });
      updated++;
    });

    await batch.commit();

    console.log(`✅ Successfully updated ${updated} transactions\n`);

    // 6. Verify update
    console.log('🔍 Verifying migration...');
    const verifySnapshot = await db
      .collection('transactions')
      .where('user_id', '==', sourceUserId)
      .get();

    const remaining = verifySnapshot.size;

    if (remaining === 0) {
      console.log(`✅ Verification successful - no transactions left for source user\n`);
    } else {
      console.warn(`⚠️  ${remaining} transactions still have source user_id\n`);
    }

    // 7. Summary
    console.log('📊 Migration Summary:');
    console.log(`   Transactions migrated: ${updated}`);
    console.log(`   Remaining for source user: ${remaining}`);
    console.log(`   Total moved to destination: ${updated}\n`);

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

// Get user IDs from command line arguments
const sourceUserId = process.argv[2];
const destinationUserId = process.argv[3];

if (!sourceUserId || !destinationUserId) {
  console.error('❌ Both source and destination user IDs are required');
  console.error('\nUsage: node scripts/migrate-user-transactions.js <source-user-id> <destination-user-id>');
  console.error('Example: node scripts/migrate-user-transactions.js "old-user-123" "new-user-456"\n');
  process.exit(1);
}

migrateUserTransactions(sourceUserId, destinationUserId);
