import fs from 'node:fs';
import { saveCleanLibrary } from './clean-intel-library.mjs';
import { validIntelUrl } from '../src/intel-quality.mjs';

const raw = JSON.parse(fs.readFileSync('content/intel/clawbot_intel.json', 'utf8'));
const files = fs.existsSync('tmp') ? fs.readdirSync('tmp').filter(f => f.startsWith('news-candidates-') && f.endsWith('.json')).sort() : [];

const candidates = files.flatMap(f => {
  const value = JSON.parse(fs.readFileSync('tmp/' + f, 'utf8'));
  return Array.isArray(value) ? value : value.records || [];
});

const valid = [];
const rejected = [];
for (const r of candidates) {
  const errors = [];
  if (!r.id) errors.push('missing id');
  if (!r.title) errors.push('missing title');
  if (!r.date) errors.push('missing date');
  if (!r.summary) errors.push('missing summary');
  const urlValid = validIntelUrl(r.url);
  if (!urlValid) errors.push('missing or invalid url');

  if (errors.length) {
    rejected.push({ id: r.id || '(no-id)', title: r.title || '(no-title)', errors: errors.join(', ') });
  } else {
    valid.push(r);
  }
}

if (rejected.length) {
  console.error(`[dedup-and-merge] REJECTED ${rejected.length} candidate(s):`);
  for (const r of rejected) {
    console.error(`  - ${r.id}: ${r.errors}`);
  }
}

if (!valid.length) {
  console.log('[dedup-and-merge] No valid candidates to merge.');
  process.exit(0);
}

console.log(`[dedup-and-merge] Merging ${valid.length} candidate(s)...`);
saveCleanLibrary({ ...raw, records: [...raw.records, ...valid] }, 'merge');
