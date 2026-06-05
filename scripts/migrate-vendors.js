#!/usr/bin/env node

/**
 * Migration script: Vendor History → Preferences
 *
 * Extracts all unique vendors from a user's transaction history,
 * normalizes them to title case, and adds them to the user's
 * preferences vendor list (avoiding duplicates).
 *
 * Uses Firebase Admin SDK to bypass security rules.
 *
 * Usage:
 *   node scripts/migrate-vendors.js <user-id>
 *
 * Example:
 *   node scripts/migrate-vendors.js "abc123def456"
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
 * Normalize vendor name to title case
 */
function toTitleCase(str) {
  const trimmed = str.trim();
  if (!trimmed) return '';

  return trimmed
    .split(' ')
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Check if vendor exists in array (case-insensitive)
 */
function vendorExists(name, vendors) {
  const lowerName = name.toLowerCase();
  return vendors.some((v) => v.name.toLowerCase() === lowerName);
}

async function migrateVendors(userId) {
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

  console.log(`\n📦 Vendor Migration Script`);
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

    // 2. Extract unique vendors from transactions
    console.log('🔍 Extracting unique vendors from transaction history...');
    const vendorSet = new Set();
    transactions.forEach((tx) => {
      const vendor = tx.vendor?.trim?.();
      if (vendor) {
        vendorSet.add(vendor);
      }
    });

    const uniqueVendors = Array.from(vendorSet);
    console.log(`✅ Found ${uniqueVendors.length} unique vendors in transaction history\n`);

    if (uniqueVendors.length === 0) {
      console.log('ℹ️  No vendors to migrate.');
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
    const existingVendors = preference.vendors ?? [];
    console.log(`✅ User has ${existingVendors.length} vendors already in preferences\n`);

    // 4. Normalize vendors and check for duplicates
    console.log('✏️  Normalizing vendor names and checking for duplicates...');
    const vendorsToAdd = [];
    const skipped = [];

    uniqueVendors.forEach((vendor) => {
      const normalized = toTitleCase(vendor);

      // Check if this vendor already exists (case-insensitive)
      if (vendorExists(normalized, existingVendors)) {
        skipped.push(`"${vendor}" → "${normalized}" (already exists)`);
        return;
      }

      // Check if this vendor is already in the "to add" list (case-insensitive)
      if (vendorExists(normalized, vendorsToAdd)) {
        skipped.push(`"${vendor}" → "${normalized}" (duplicate in batch)`);
        return;
      }

      vendorsToAdd.push({
        name: normalized,
        emoji: '🏪',
        type: 'vendor',
        parent: null,
      });
    });

    console.log(`✅ Ready to add ${vendorsToAdd.length} new vendors`);
    if (skipped.length > 0) {
      console.log(`⏭️  Skipped ${skipped.length} (already in preferences or duplicates):`);
      skipped.forEach((s) => console.log(`   - ${s}`));
    }
    console.log();

    // 5. Display preview
    if (vendorsToAdd.length > 0) {
      console.log('📋 Vendors to be added:');
      vendorsToAdd.forEach((v, idx) => {
        console.log(`   ${idx + 1}. ${v.emoji} ${v.name}`);
      });
      console.log();
    }

    // 6. Update preferences
    if (vendorsToAdd.length > 0) {
      console.log('💾 Updating preferences document...');
      const updatedVendors = [...existingVendors, ...vendorsToAdd];

      await db.collection('preference').doc(userId).update({
        vendors: updatedVendors,
      });

      console.log(`✅ Successfully added ${vendorsToAdd.length} vendors to preferences\n`);
    } else {
      console.log('ℹ️  No new vendors to add (all already in preferences).\n');
    }

    // 7. Summary
    console.log('📊 Migration Summary:');
    console.log(`   Total vendors in transaction history: ${uniqueVendors.length}`);
    console.log(`   Vendors already in preferences: ${skipped.length}`);
    console.log(`   New vendors added: ${vendorsToAdd.length}`);
    console.log(`   Total vendors after migration: ${existingVendors.length + vendorsToAdd.length}\n`);

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
  console.error('\nUsage: node scripts/migrate-vendors.js <user-id>');
  console.error('Example: node scripts/migrate-vendors.js "abc123def456"\n');
  process.exit(1);
}

migrateVendors(userId);
