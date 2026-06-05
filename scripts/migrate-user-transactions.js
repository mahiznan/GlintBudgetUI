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
 *   node scripts/migrate-user-transactions.js <source-user-id> <destination-user-id> [--test-tx <transaction-id>]
 *
 * Examples:
 *   # Show preview of all transactions to migrate
 *   node scripts/migrate-user-transactions.js "old-user-123" "new-user-456"
 *
 *   # Test with a specific transaction first
 *   node scripts/migrate-user-transactions.js "old-user-123" "new-user-456" --test-tx "tx-abc123"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import readline from 'readline';

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

// Interactive prompt helper
function askQuestion(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase());
    });
  });
}

// Format transaction for display
function formatTransaction(tx, txId) {
  return {
    id: txId,
    amount: tx.amount,
    category: tx.category,
    subCategory: tx.sub_category,
    vendor: tx.vendor,
    account: tx.account,
    currency: tx.currency,
    date: tx.date?.toDate?.() ?? 'N/A',
    user_id: tx.user_id,
  };
}

// Display transaction details
function displayTransaction(tx, txId, sourceUserId, destinationUserId) {
  const formatted = formatTransaction(tx, txId);
  console.log('\n📋 Transaction Details:');
  console.log(`   ID:            ${formatted.id}`);
  console.log(`   Amount:        ${formatted.currency} ${formatted.amount}`);
  console.log(`   Category:      ${formatted.category} → ${formatted.subCategory}`);
  console.log(`   Vendor:        ${formatted.vendor}`);
  console.log(`   Account:       ${formatted.account}`);
  console.log(`   Date:          ${formatted.date}`);
  console.log(`   Current user:  ${formatted.user_id}`);
  console.log(`   New user:      ${destinationUserId}`);
  console.log();
}

async function migrateUserTransactions(sourceUserId, destinationUserId, testTxId) {
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
  console.log(`Source User ID:      ${sourceUserId}`);
  console.log(`Destination User ID: ${destinationUserId}`);
  if (testTxId) {
    console.log(`Test Transaction ID: ${testTxId}`);
  }
  console.log();

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
    // 1. Test single transaction if specified
    if (testTxId) {
      console.log('🧪 Testing with single transaction...');
      const txDoc = await db.collection('transactions').doc(testTxId).get();

      if (!txDoc.exists) {
        console.error(`❌ Transaction not found: ${testTxId}`);
        process.exit(1);
      }

      const txData = txDoc.data();

      // Verify transaction belongs to source user
      if (txData.user_id !== sourceUserId) {
        console.error(
          `❌ Transaction belongs to different user: ${txData.user_id} (expected: ${sourceUserId})`,
        );
        process.exit(1);
      }

      displayTransaction(txData, testTxId, sourceUserId, destinationUserId);

      // Ask for confirmation to proceed
      console.log('✅ Transaction validation passed!');
      console.log();
      const confirm = await askQuestion(
        '🤔 Proceed with migrating ALL transactions? (yes/no): ',
      );

      if (confirm !== 'yes' && confirm !== 'y') {
        console.log('❌ Migration cancelled by user');
        process.exit(0);
      }

      console.log();
    }

    // 2. Fetch all transactions for source user
    console.log('📝 Fetching all transactions for source user...');
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

    console.log(`✅ Found ${transactions.length} total transactions\n`);

    // 3. Verify destination user exists
    console.log('🔍 Verifying destination user exists...');
    const destUserDoc = await db.collection('users').doc(destinationUserId).get();

    if (!destUserDoc.exists) {
      console.warn(`⚠️  Destination user does not have a users document yet.`);
      console.warn(`   Transaction migration will still proceed.\n`);
    } else {
      console.log(`✅ Destination user exists\n`);
    }

    // 4. Display preview
    console.log('📋 Preview of transactions to migrate:');
    console.log(`   Total transactions: ${transactions.length}`);
    if (transactions.length > 0) {
      console.log(`\n   First transaction sample:`);
      const sample = transactions[0];
      const firstId = transactionIds[0];
      const formatted = formatTransaction(sample, firstId);
      console.log(`     - ID:       ${formatted.id}`);
      console.log(`     - Amount:   ${formatted.currency} ${formatted.amount}`);
      console.log(`     - Category: ${formatted.category}`);
      console.log(`     - Date:     ${formatted.date}`);
      console.log(`     - Vendor:   ${formatted.vendor}`);
    }
    console.log();

    // 5. Final confirmation if not already tested
    if (!testTxId) {
      console.log('⚠️  WARNING: This operation will update all transactions');
      console.log(`   Moving ${transactions.length} transactions from ${sourceUserId} to ${destinationUserId}`);
      console.log('   This action cannot be easily undone!\n');

      const confirm = await askQuestion(
        '🤔 Are you sure? Type "yes" to proceed: ',
      );

      if (confirm !== 'yes') {
        console.log('❌ Migration cancelled by user');
        process.exit(0);
      }

      console.log();
    }

    // 6. Update all transactions
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

    // 7. Verify update
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

    // 8. Summary
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

// Parse command line arguments
const sourceUserId = process.argv[2];
const destinationUserId = process.argv[3];

// Check for --test-tx flag
let testTxId = null;
const testTxIndex = process.argv.indexOf('--test-tx');
if (testTxIndex !== -1 && process.argv[testTxIndex + 1]) {
  testTxId = process.argv[testTxIndex + 1];
}

if (!sourceUserId || !destinationUserId) {
  console.error('❌ Both source and destination user IDs are required');
  console.error('\nUsage:');
  console.error('  node scripts/migrate-user-transactions.js <source-user-id> <destination-user-id> [--test-tx <transaction-id>]');
  console.error('\nExamples:');
  console.error('  # Show preview of all transactions');
  console.error('  node scripts/migrate-user-transactions.js "old-user-123" "new-user-456"');
  console.error('\n  # Test with a specific transaction first');
  console.error('  node scripts/migrate-user-transactions.js "old-user-123" "new-user-456" --test-tx "tx-abc123"\n');
  process.exit(1);
}

migrateUserTransactions(sourceUserId, destinationUserId, testTxId);
