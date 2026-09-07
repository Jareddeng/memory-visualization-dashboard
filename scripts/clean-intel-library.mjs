import fs from 'node:fs';
import { dedupeIntel, isArticleUrl, assertUniqueIntelUrls } from '../src/intel-quality.mjs';

export function cleanLibrary(raw) {
  const records = dedupeIntel(raw.records);
  const published = records.filter(record => isArticleUrl(record.url));
  const pending = records.filter(record => !isArticleUrl(record.url));
  assertUniqueIntelUrls(published);
  return { published, pending, merged: raw.records.length - records.length };
}

export function saveCleanLibrary(raw, label = 'cleanup') {
  const result = cleanLibrary(raw);
  const archive = 'data/archive/intel';
  fs.mkdirSync(archive, { recursive: true });
  const filename = `${archive}/${label}-${Date.now()}.json`;
  // Complete input snapshot makes every merge and quarantine reversible.
  fs.writeFileSync(filename, JSON.stringify({ reason: '去重前快照；缺少有效链接的记录待核实', ...raw }, null, 2) + '\n', { flag: 'wx' });
  fs.writeFileSync('content/intel/clawbot_intel.json', JSON.stringify({ ...raw, records: result.published }, null, 2) + '\n');
  console.log(JSON.stringify({ published: result.published.length, pending: result.pending.length, merged: result.merged, backup: filename }));
  return result;
}
