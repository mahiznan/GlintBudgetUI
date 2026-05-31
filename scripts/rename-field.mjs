/**
 * Rename a field value across all matching transactions for a given user.
 *
 * Usage:
 *   node scripts/rename-field.mjs \
 *     --uid <user-id> \
 *     --old "Old Name" \
 *     --new "New Name" \
 *     [--field vendor]   # vendor | account | category | payment (default: vendor)
 *     [--dry-run]        # preview without writing
 *
 * Prerequisites:
 *   scripts/serviceAccount.json must exist (Firebase Console → Project Settings
 *   → Service Accounts → Generate new private key).
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseArgs } from 'node:util';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const ALLOWED_FIELDS = ['vendor', 'account', 'category', 'payment'];

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  // ── Parse args ───────────────────────────────────────────────────────────
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        uid:       { type: 'string' },
        old:       { type: 'string' },
        new:       { type: 'string' },
        field:     { type: 'string', default: 'vendor' },
        'dry-run': { type: 'boolean', default: false },
      },
    }));
  } catch (err) {
    console.error(`Argument error: ${err.message}`);
    console.error('Usage: node scripts/rename-field.mjs --uid <uid> --old <old> --new <new> [--field vendor] [--dry-run]');
    process.exit(1);
  }

  const uid = values.uid;
  const oldName = values.old;
  const newName = values.new;
  const field = values.field ?? 'vendor';
  const dryRun = values['dry-run'] ?? false;

  if (!uid || !oldName || !newName) {
    console.error('Error: --uid, --old, and --new are required.');
    console.error('Usage: node scripts/rename-field.mjs --uid <uid> --old <old> --new <new> [--field vendor] [--dry-run]');
    process.exit(1);
  }

  if (!ALLOWED_FIELDS.includes(field)) {
    console.error(`Error: invalid --field "${field}". Allowed: ${ALLOWED_FIELDS.join(' | ')}`);
    process.exit(1);
  }

  // ── Load service account ──────────────────────────────────────────────────
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const saPath = join(__dirname, 'serviceAccount.json');
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'));
  } catch {
    console.error(`Error: could not read ${saPath}`);
    console.error('Generate one: Firebase Console → Project Settings → Service Accounts → Generate new private key');
    process.exit(1);
  }

  // ── Init Firebase ─────────────────────────────────────────────────────────
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  // ── Print header ──────────────────────────────────────────────────────────
  if (dryRun) console.log('DRY RUN — no writes will be made.\n');
  console.log(`Field:  ${field}`);
  console.log(`Old:    "${oldName}"`);
  console.log(`New:    "${newName}"`);
  console.log(`User:   ${uid}`);
  console.log('\nQuerying transactions…');

  // ── Query ─────────────────────────────────────────────────────────────────
  let snap;
  try {
    snap = await db
      .collection('transactions')
      .where('user_id', '==', uid)
      .where(field, '==', oldName)
      .get();
  } catch (err) {
    console.error('Firestore query failed:', err);
    process.exit(1);
  }

  if (snap.empty) {
    console.log('No transactions matched.');
    process.exit(0);
  }

  const countLabel = `Found ${snap.docs.length} matching transaction${snap.docs.length === 1 ? '' : 's'}`;

  // ── Dry run ───────────────────────────────────────────────────────────────
  if (dryRun) {
    console.log(`${countLabel}:`);
    snap.docs.forEach((d) => console.log(`  ${d.id}  ${field} = "${oldName}"`));
    console.log(`\n(dry-run) Would update ${snap.docs.length} transactions. Re-run without --dry-run to apply.`);
    process.exit(0);
  }

  // ── Batch write ───────────────────────────────────────────────────────────
  console.log(`${countLabel}.`);
  console.log('');
  const groups = chunk(snap.docs, 500);
  let committed = 0;

  try {
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      process.stdout.write(`Committing batch ${i + 1}/${groups.length} (${group.length} docs)… `);
      const batch = db.batch();
      group.forEach((d) => batch.update(d.ref, { [field]: newName }));
      await batch.commit();
      committed += group.length;
      console.log('done.');
    }
  } catch (err) {
    console.error('\nBatch commit failed:', err);
    console.error(`Committed ${committed} of ${snap.docs.length} transactions before failure.`);
    process.exit(1);
  }

  console.log(`\nDone. Updated ${snap.docs.length} transactions.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
