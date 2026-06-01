import admin from 'firebase-admin';

// Decode flat alternating array to key-value object
function decodeDefaultEntries(raw: unknown): Record<string, string> {
  if (!Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (let i = 0; i + 1 < raw.length; i += 2) {
    result[raw[i] as string] = raw[i + 1] as string;
  }
  return result;
}

async function migrateDefaultEntries() {
  // Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS env var)
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }

  const db = admin.firestore();
  const batch = db.batch();
  let migratedCount = 0;
  let skippedCount = 0;

  try {
    const snapshot = await db.collection('preference').get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const defaultEntries = data['default_entries'];

      // Only process if it's in the old flat array format
      if (Array.isArray(defaultEntries)) {
        const decoded = decodeDefaultEntries(defaultEntries);
        batch.update(doc.ref, { default_entries: decoded });
        migratedCount++;
        console.log(`Migrating ${doc.id}: ${JSON.stringify(defaultEntries)} → ${JSON.stringify(decoded)}`);
      } else if (defaultEntries === undefined || typeof defaultEntries === 'object') {
        // Already migrated or doesn't exist
        skippedCount++;
      }
    }

    // Commit batch in chunks of 500 (Firestore limit)
    if (migratedCount > 0) {
      await batch.commit();
      console.log(`\n✅ Migration complete: ${migratedCount} documents updated, ${skippedCount} skipped`);
    } else {
      console.log(`\n✅ No migration needed: ${skippedCount} documents already in correct format`);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateDefaultEntries();
