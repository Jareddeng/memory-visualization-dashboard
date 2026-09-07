import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dedupeIntel, mergeIntel, assertUniqueIntelUrls, intelUrlKey, isArticleUrl } from '../src/intel-quality.mjs';
import { cleanLibrary } from './clean-intel-library.mjs';
const record = { id: 'one', date: '2026-09-07', title: 'HBM供应', summary: '订单已经签署', url: 'https://news.test/article/1' };
test('local stale edit cannot erase remote URL or lose user pricing edits', () => {
  const result = mergeIntel([record], [{ ...record, url: '', pricing_status: 'priced' }]);
  assert.equal(result[0].url, record.url);
  assert.equal(result[0].pricing_status, 'priced');
});
test('duplicate ID prefers valid URL even if first copy is empty', () => {
  const result = dedupeIntel([{ ...record, url: '' }, record]);
  assert.equal(result.length, 1); assert.equal(result[0].url, record.url);
});
test('exact content with another ID dedupes; similar topics and later updates survive', () => {
  assert.equal(dedupeIntel([record, { ...record, id: 'copy' }]).length, 1);
  assert.equal(dedupeIntel([record, { ...record, id: 'update', date: '2026-09-08' }]).length, 2);
  assert.equal(dedupeIntel([record, { ...record, id: 'other', summary: '订单取消' }]).length, 2);
});
test('shared URL is flagged for review, never blanked or silently merged', () => {
  const other = { ...record, id: 'other', title: '另一条新闻' };
  assert.throws(() => cleanLibrary({ records: [record, other] }), /URL 重复/);
  assert.equal(other.url, record.url);
});
test('URL normalization catches protocol/www/tracking variants but retains article parameters', () => {
  assert.equal(intelUrlKey('http://www.news.test/article/1/?utm_source=a#x'), intelUrlKey(record.url));
  assert.notEqual(intelUrlKey('https://news.test/press?id=1'), intelUrlKey('https://news.test/press?id=2'));
});
test('missing/unsafe URLs and generic pages cannot be published', () => {
  for (const url of ['', 'javascript:alert(1)', 'https://news.test/', 'https://news.test/tag/dram/', 'https://finance.yahoo.com/quote/MU/']) assert.equal(isArticleUrl(url), false);
  assert.equal(cleanLibrary({ records: [{ ...record, url: '' }] }).pending.length, 1);
});
test('published library has unique IDs/URLs and cleaning is idempotent', () => {
  const raw = JSON.parse(fs.readFileSync('content/intel/clawbot_intel.json'));
  assertUniqueIntelUrls(raw.records);
  assert.equal(new Set(raw.records.map(r => r.id)).size, raw.records.length);
  assert.deepEqual(cleanLibrary({ records: cleanLibrary(raw).published }).published, cleanLibrary(raw).published);
});
test('every original record is accounted for by publication, pending, or merged archive', () => {
  const base = 'data/archive/intel/repair-2026-09-07/';
  const before = JSON.parse(fs.readFileSync(base + 'before.json')).records;
  const all = ['content/intel/clawbot_intel.json', base + 'pending.json', base + 'merged.json'].flatMap(f => JSON.parse(fs.readFileSync(f)).records);
  assert.equal(all.length, before.length);
  assert.deepEqual(all.map(r => r.id).sort(), before.map(r => r.id).sort());
});
