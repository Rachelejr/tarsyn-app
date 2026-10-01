// UNIMUNITY - Full Firestore backup (READ-ONLY: this script never writes to the database)
// Usage:
//   node scripts/backup-firestore.mjs <path-to-service-account.json> [output-folder]
// Output (default): %USERPROFILE%\unimunity-backups\<timestamp>\
//   - one JSON file per top-level collection (all documents + all subcollections, recursively)
//   - manifest.json: document counts + field names per collection (no personal values)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, GeoPoint, DocumentReference } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';

const KEY_PATH = process.argv[2];
const OUT_ROOT = process.argv[3] || path.join(process.env.USERPROFILE || '.', 'unimunity-backups');
const EXPECTED_PROJECT = 'tarsyn-ea9de';

if (!KEY_PATH) {
  console.error('Usage: node scripts/backup-firestore.mjs <service-account.json> [output-folder]');
  process.exit(1);
}

const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
if (key.project_id !== EXPECTED_PROJECT) {
  console.error(`Wrong project: key is for "${key.project_id}", expected "${EXPECTED_PROJECT}". Aborting.`);
  process.exit(1);
}

initializeApp({ credential: cert(key) });
const db = getFirestore();

// Convert Firestore-specific types into plain, restorable JSON
function serialize(v) {
  if (v instanceof Timestamp) {
    return { __type: 'timestamp', iso: v.toDate().toISOString(), seconds: v.seconds, nanoseconds: v.nanoseconds };
  }
  if (v instanceof GeoPoint) return { __type: 'geopoint', latitude: v.latitude, longitude: v.longitude };
  if (v instanceof DocumentReference) return { __type: 'ref', path: v.path };
  if (v instanceof Uint8Array) return { __type: 'bytes', base64: Buffer.from(v).toString('base64') };
  if (Array.isArray(v)) return v.map(serialize);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = serialize(x);
    return out;
  }
  return v;
}

// "groups/abc123/payments" -> "groups/{id}/payments"
const pattern = (colPath) =>
  colPath.split('/').map((seg, i) => (i % 2 === 1 ? '{id}' : seg)).join('/');

const schema = {}; // pattern -> { count, fields:Set }

async function dumpCollection(colRef) {
  const pat = pattern(colRef.path);
  schema[pat] ??= { count: 0, fields: new Set() };

  // listDocuments() also returns "empty" parent docs that only hold subcollections
  const refs = await colRef.listDocuments();
  const docs = [];
  for (const ref of refs) {
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : null;
    if (data) Object.keys(data).forEach((f) => schema[pat].fields.add(f));
    schema[pat].count++;

    const subcollections = {};
    for (const sub of await ref.listCollections()) {
      subcollections[sub.id] = await dumpCollection(sub);
    }
    docs.push({ id: ref.id, path: ref.path, data: data ? serialize(data) : null, subcollections });
  }
  return docs;
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(OUT_ROOT, stamp);
fs.mkdirSync(outDir, { recursive: true });

console.log(`Backing up project ${EXPECTED_PROJECT} to ${outDir}`);
for (const col of await db.listCollections()) {
  process.stdout.write(`  ${col.id} ... `);
  const docs = await dumpCollection(col);
  fs.writeFileSync(path.join(outDir, `${col.id}.json`), JSON.stringify(docs, null, 2));
  console.log(`${docs.length} documents`);
}

const manifest = {
  project: EXPECTED_PROJECT,
  createdAt: new Date().toISOString(),
  note: 'Firestore only. Files uploaded to Firebase Storage are NOT included.',
  collections: Object.fromEntries(
    Object.entries(schema)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([p, s]) => [p, { documents: s.count, fields: [...s.fields].sort() }])
  ),
};
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nDone. Manifest: ${path.join(outDir, 'manifest.json')}`);
