# Rename Field Script — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `scripts/rename-field.mjs` — a terminal script that finds all Firestore transactions for a given user where a field equals an old value, and updates each to a new value.

**Architecture:** Single `.mjs` script following the existing `migrate-firestore.mjs` pattern. Uses `firebase-admin` (already installed) with `scripts/serviceAccount.json` for auth. Accepts `--uid`, `--old`, `--new`, `--field` (default: `vendor`), and `--dry-run` via Node's built-in `parseArgs`.

**Tech Stack:** Node 22, `firebase-admin ^13.10.0`, `node:util parseArgs`, ESM `.mjs`

---

### Task 1: Create the script

**Files:**
- Create: `scripts/rename-field.mjs`

- [ ] **Step 1: Create `scripts/rename-field.mjs` with this exact content:**

```javascript
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

  console.log(`Found ${snap.docs.length} matching transactions.`);

  // ── Dry run ───────────────────────────────────────────────────────────────
  if (dryRun) {
    console.log('');
    snap.docs.forEach((d) => console.log(`  ${d.id}  ${field} = "${oldName}"`));
    console.log(`\n(dry-run) Would update ${snap.docs.length} transactions. Re-run without --dry-run to apply.`);
    process.exit(0);
  }

  // ── Batch write ───────────────────────────────────────────────────────────
  console.log('');
  const groups = chunk(snap.docs, 500);
  let committed = 0;

  try {
    await Promise.all(
      groups.map(async (group, i) => {
        process.stdout.write(`Committing batch ${i + 1}/${groups.length} (${group.length} docs)… `);
        const batch = db.batch();
        group.forEach((d) => batch.update(d.ref, { [field]: newName }));
        await batch.commit();
        committed += group.length;
        console.log('done.');
      }),
    );
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
```

---

### Task 2: Smoke-test arg validation (no Firebase connection needed)

These checks exit before touching Firestore, so `serviceAccount.json` does not need to be valid (though it must exist — copy any JSON file temporarily if needed, or use the real one if it's already present).

**Files:** none (read-only verification)

- [ ] **Step 1: Test missing required args**

Run:
```bash
node scripts/rename-field.mjs
```
Expected output (exit code 1):
```
Error: --uid, --old, and --new are required.
Usage: node scripts/rename-field.mjs --uid <uid> --old <old> --new <new> [--field vendor] [--dry-run]
```

- [ ] **Step 2: Test invalid --field**

Run:
```bash
node scripts/rename-field.mjs --uid abc --old X --new Y --field banana
```
Expected output (exit code 1):
```
Error: invalid --field "banana". Allowed: vendor | account | category | payment
```

- [ ] **Step 3: Test missing serviceAccount.json (rename it temporarily if it exists)**

If `scripts/serviceAccount.json` does not exist, run:
```bash
node scripts/rename-field.mjs --uid abc --old X --new Y
```
Expected output (exit code 1):
```
Error: could not read …/scripts/serviceAccount.json
Generate one: Firebase Console → Project Settings → Service Accounts → Generate new private key
```

If `serviceAccount.json` already exists (it does in this project), skip this step — the real file is present and this error path won't trigger.

---

### Task 3: Commit

**Files:** none (git only)

- [ ] **Step 1: Stage and commit**

```bash
git add scripts/rename-field.mjs
git commit -m "feat: add rename-field admin script"
```

Expected: clean commit on `main`.

---

## Usage Reference

Always dry-run first:

```bash
# 1. Preview — safe, no writes
node scripts/rename-field.mjs \
  --uid YOUR_FIREBASE_UID \
  --old "Starbucks" \
  --new "Starbucks Coffee" \
  --dry-run

# 2. Apply — only after confirming the dry-run count looks right
node scripts/rename-field.mjs \
  --uid YOUR_FIREBASE_UID \
  --old "Starbucks" \
  --new "Starbucks Coffee"

# Rename a different field (account, category, or payment)
node scripts/rename-field.mjs \
  --uid YOUR_FIREBASE_UID \
  --field account \
  --old "Chase" \
  --new "Chase Checking" \
  --dry-run
```

Your Firebase UID is visible in the Firebase Console → Authentication → Users table, or in the app's URL after sign-in.
