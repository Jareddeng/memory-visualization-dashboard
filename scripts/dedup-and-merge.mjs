import fs from 'node:fs';
import { saveCleanLibrary } from './clean-intel-library.mjs';
import { validIntelUrl } from '../src/intel-quality.mjs';
const raw = JSON.parse(fs.readFileSync('content/intel/clawbot_intel.json', 'utf8'));
const files = fs.existsSync('tmp') ? fs.readdirSync('tmp').filter(f => f.startsWith('news-candidates-') && f.endsWith('.json')).sort() : [];
const candidates = files.flatMap(f => {
  const value = JSON.parse(fs.readFileSync('tmp/' + f, 'utf8'));
  return Array.isArray(value) ? value : value.records || [];
});
for (const r of candidates) {
  if (!r.id || !r.title || !r.date || !r.summary || !validIntelUrl(r.url)) throw new Error('候选缺少 id/title/date/summary 或有效 URL: ' + (r.id || 'unknown'));
}
saveCleanLibrary({ ...raw, records: [...raw.records, ...candidates] }, 'merge');
// Retain candidate files for audit. Re-running is idempotent; no bulk deletion.
