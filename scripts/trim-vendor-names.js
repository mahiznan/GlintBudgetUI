#!/usr/bin/env node

/**
 * Cleanup script: Trim whitespace from vendor names in transactions
 *
 * Finds all transactions where the vendor field has leading or trailing
 * whitespace and updates them with the trimmed value.
 *
 * Uses Firebase Admin SDK to bypass security rules.
 *
 * Usage:
 *   node scripts/trim-vendor-names.js <user-id> [--vendor "Name "] [--dry-run]
 *
 * Examples:
 *   node scripts/trim-vendor-names.js "abc123def456" --vendor "Home Depot " --dry-run
 *   node scripts/trim-vendor-names.js "abc123def456" --vendor "Home Depot "
 *   node scripts/trim-vendor-names.js "abc123def456" --dry-run   # all vendors with whitespace
 *   node scripts/trim-vendor-names.js "abc123def456"             # all vendors with whitespace
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

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

async function trimVendorNames(userId, targetVendor, dryRun) {
  const serviceAccountPath = path.join(__dirname, 'serviceAccount.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Service account file not found at scripts/serviceAccount.json');
    console.error('\n💡 To set up:');
    console.error('   1. Go to Firebase Console → Project settings → Service accounts');
    console.error('   2. Click "Generate new private key"');
    console.error('   3. Save the JSON file as scripts/serviceAccount.json');
    console.error('\n⚠️  Keep serviceAccount.json private and never commit it to git!\n');
    process.exit(1);
  }

  const projectId = envVars.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error('❌ Firebase config not found. Please set VITE_FIREBASE_PROJECT_ID in .env.local');
    process.exit(1);
  }

  console.log(`\n✂️  Trim Vendor Names${dryRun ? ' (DRY RUN — no changes will be saved)' : ''}`);
  console.log(`User ID: ${userId}`);
  if (targetVendor !== null) console.log(`Target vendor: "${targetVendor}"`);
  console.log();

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    process.exit(1);
  }

  const db = admin.firestore();

  console.log('📝 Fetching transactions...');
  const snapshot = await db.collection('transactions').where('user_id', '==', userId).get();

  if (snapshot.empty) {
    console.log('⚠️  No transactions found for this user.');
    process.exit(0);
  }

  console.log(`✅ Found ${snapshot.size} transactions\n`);

  // Collect docs that need fixing
  const toFix = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    const vendor = data.vendor ?? '';
    const trimmed = vendor.trim();
    if (vendor === trimmed) return;
    if (targetVendor !== null && vendor !== targetVendor) return;
    toFix.push({ id: doc.id, original: vendor, trimmed });
  });

  if (toFix.length === 0) {
    console.log('✅ No transactions have vendor names with leading/trailing whitespace. Nothing to do.\n');
    process.exit(0);
  }

  console.log(`🔍 Found ${toFix.length} transaction(s) with whitespace in vendor name:\n`);
  toFix.forEach(({ id, original, trimmed }) => {
    console.log(`   ${id}: "${original}" → "${trimmed}"`);
  });
  console.log();

  if (dryRun) {
    console.log('ℹ️  Dry run complete. Re-run without --dry-run to apply these changes.\n');
    process.exit(0);
  }

  // Apply fixes in batches of 500 (Firestore limit)
  console.log('💾 Applying fixes...');
  const BATCH_SIZE = 500;
  for (let i = 0; i < toFix.length; i += BATCH_SIZE) {
    const chunk = toFix.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(({ id, trimmed }) => {
      batch.update(db.collection('transactions').doc(id), { vendor: trimmed });
    });
    await batch.commit();
    console.log(`   Committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} docs)`);
  }

  console.log(`\n✅ Fixed ${toFix.length} transaction(s).\n`);
  process.exit(0);
}

const userId = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

// Parse --vendor "Name with spaces"
let targetVendor = null;
const vendorFlag = process.argv.indexOf('--vendor');
if (vendorFlag !== -1) {
  targetVendor = process.argv[vendorFlag + 1] ?? null;
}

if (!userId) {
  console.error('❌ User ID required');
  console.error('\nUsage: node scripts/trim-vendor-names.js <user-id> [--vendor "Name "] [--dry-run]');
  console.error('Example: node scripts/trim-vendor-names.js "abc123def456" --vendor "Home Depot " --dry-run\n');
  process.exit(1);
}

trimVendorNames(userId, targetVendor, dryRun);
