/**
 * One-time Firestore migration
 *
 * Fixes data written by the old web app before 2026-05-18:
 *   1. Transactions missing an `id` field — adds a UUID so iOS can decode Transaction.id
 *   2. Preference `default_entries` stored as a map — converts to the flat alternating
 *      array that Swift Codable produces for [BudgetDataType:String]
 *
 * Prerequisites
 * -------------
 * 1. Install firebase-admin (one-time, dev only):
 *      npm install --save-dev firebase-admin
 *
 * 2. Download a service account key from:
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *    Save the file as  scripts/serviceAccount.json  (already in .gitignore)
 *
 * 3. Run:
 *      node scripts/migrate-firestore.mjs
 */

import { createRequire } from 'module';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccount.json'), 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

// ─── helpers ────────────────────────────────────────────────────────────────

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// Converts { account: "Monthly Budget" } → ["account", "Monthly Budget"]
function mapToAlternatingArray(obj) {
  return Object.entries(obj).flatMap(([k, v]) => [k, v]);
}

// ─── 1. Fix transactions missing `id` ───────────────────────────────────────

async function migrateTransactions() {
  console.log('\n── Transactions ──────────────────────────────────────────');
  const snap = await db.collection('transactions').get();
  let fixed = 0;
  let skipped = 0;

  const batch = db.batch();
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.id !== undefined) {
      skipped++;
      continue;
    }
    // Assign a brand-new UUID as the id field.
    // The document ID stays as-is (Firestore auto-id); iOS reads id from the field.
    batch.update(docSnap.ref, { id: randomUUID() });
    console.log(`  + ${docSnap.id}  →  will add id field`);
    fixed++;
  }

  if (fixed > 0) {
    await batch.commit();
    console.log(`  ✓ Added id to ${fixed} transaction(s).`);
  } else {
    console.log(`  ✓ All ${skipped} transaction(s) already have an id field.`);
  }
}

// ─── 2. Fix preference `default_entries` stored as a map ────────────────────

async function migratePreferences() {
  console.log('\n── Preferences ───────────────────────────────────────────');
  const snap = await db.collection('preference').get();
  let fixed = 0;
  let skipped = 0;

  const batch = db.batch();
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const de = data.default_entries;

    if (de === undefined || Array.isArray(de)) {
      skipped++;
      continue;
    }

    if (!isPlainObject(de)) {
      console.log(`  ? ${docSnap.id}  default_entries has unexpected type, skipping`);
      skipped++;
      continue;
    }

    const converted = mapToAlternatingArray(de);
    batch.update(docSnap.ref, { default_entries: converted });
    console.log(`  + ${docSnap.id}  ${JSON.stringify(de)}  →  ${JSON.stringify(converted)}`);
    fixed++;
  }

  if (fixed > 0) {
    await batch.commit();
    console.log(`  ✓ Converted default_entries in ${fixed} preference document(s).`);
  } else {
    console.log(`  ✓ All ${skipped} preference document(s) already use array format.`);
  }
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Starting Firestore migration...');
  await migrateTransactions();
  await migratePreferences();
  console.log('\nMigration complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
