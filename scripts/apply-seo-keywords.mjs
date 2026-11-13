import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createClient } from '@sanity/client';

const rollout = process.argv.includes('--quick-wins') ? 'seo-quick-wins-2026-11-13' : 'seo-keywords-2026-11-13';
export const markerId = `migration-${rollout}`;
export const readPath = (doc, path) => path.replace(/\[(\d+)\]/g, '.$1').split('.').reduce((value, key) => value?.[key], doc);

// Field-level expected values prevent overwriting intervening editorial changes.
// Revision locks additionally protect changes between this read and the commit.
export function preparePatches(rows, documents) {
  return rows.map(row => {
    const doc = documents.find(item => item._id === row.id);
    if (!doc?._rev) throw new Error(`Missing document: ${row.id}`);
    for (const path of Object.keys(row.set)) {
      if (JSON.stringify(readPath(doc, path)) !== JSON.stringify(row.before[path])) {
        throw new Error(`Editorial conflict: ${row.id}.${path}`);
      }
    }
    return { id: row.id, ifRevisionID: doc._rev, set: row.set };
  });
}

async function main() {
  const apply = process.argv.includes('--apply');
  const token = process.env.SANITY_AUTH_TOKEN;
  const client = createClient({ projectId: 'tgx6e6jg', dataset: 'production',
    apiVersion: '2025-01-01', useCdn: false, ...(token ? { token } : {}) });
  // Completed rollouts never reset subsequent CMS edits.
  if (await client.getDocument(markerId)) {
    console.log('SEO keyword rollout already completed; CMS content left unchanged.');
    return;
  }
  const rows = JSON.parse(await readFile(new URL(`./content/${rollout}.json`, import.meta.url), 'utf8'));
  const documents = await client.fetch('*[_id in $ids]', { ids: rows.map(row => row.id) });
  const patches = preparePatches(rows, documents);
  console.log(`Validated ${patches.length} documents; ${patches.reduce((n, p) => n + Object.keys(p.set).length, 0)} German text fields.`);
  if (!apply) {
    console.log('Dry run only. Use --apply to commit the reviewed content.');
    return;
  }
  if (!token) throw new Error('SANITY_AUTH_TOKEN is required to apply the rollout.');
  let transaction = client.transaction();
  for (const patch of patches) transaction = transaction.patch(patch.id, p => p.ifRevisionId(patch.ifRevisionID).set(patch.set));
  // create (not createIfNotExists) makes concurrent runs fail atomically.
  transaction = transaction.create({ _id: markerId, _type: 'contentMigration',
    appliedAt: new Date().toISOString(), description: 'Regional SEO keyword rollout, 13 November 2026',
    rollbackJson: JSON.stringify(rows.map(row => ({ id: row.id, set: row.before }))) });
  await transaction.commit({ visibility: 'sync' });
  console.log('SEO keyword rollout committed atomically. Previous text retained in migration record.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
