import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePatches } from './apply-seo-keywords.mjs';

const rows = [{ id: 'abo', before: { 'seoSection.title.de': 'Old' }, set: { 'seoSection.title.de': 'New' } }];
test('changes only requested German field with revision lock', () => {
  const docs = [{ _id: 'abo', _rev: 'rev1', seoSection: { title: { de: 'Old', en: 'English' } }, price: 650 }];
  assert.deepEqual(preparePatches(rows, docs), [{ id: 'abo', ifRevisionID: 'rev1', set: rows[0].set }]);
  assert.equal(docs[0].seoSection.title.en, 'English');
  assert.equal(docs[0].price, 650);
});
test('refuses changed editorial text and missing documents', () => {
  assert.throws(() => preparePatches(rows, [{ _id: 'abo', _rev: 'rev2', seoSection: { title: { de: 'Edited' } } }]), /Editorial conflict/);
  assert.throws(() => preparePatches(rows, []), /Missing document/);
});

test('supports indexed link fields and adding absent CMS sections', () => {
  const docs = [{ _id: 'service', _rev: 'r1', solutions: [{ href: '/work' }] }];
  const changes = [{ id: 'service', before: { 'solutions[0].href': '/work' }, set: { 'solutions[0].href': '/content-abo/', packagesSection: { vatNote: { de: 'zzgl. MWST' } } } }];
  assert.equal(preparePatches(changes, docs)[0].set['solutions[0].href'], '/content-abo/');
  assert.throws(() => preparePatches(changes, [{ ...docs[0], packagesSection: { edited: true } }]), /Editorial conflict/);
});
