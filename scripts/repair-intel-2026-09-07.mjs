import fs from 'node:fs';
import { dedupeIntel, validIntelUrl } from '../src/intel-quality.mjs';
import rules from '../src/intel-duplicate-rules.mjs';

const file = 'content/intel/clawbot_intel.json';
const archive = 'data/archive/intel/repair-2026-09-07';
fs.mkdirSync(archive, { recursive: true });
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
// Refuse to overwrite the pre-repair snapshot on a second run.
fs.writeFileSync(`${archive}/before.json`, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
const history = JSON.parse(fs.readFileSync('data/archive/intel/2026-06.json', 'utf8'));
const historicalRecords = Array.isArray(history) ? history : history.records;
const changes = [];
const researched = {
  '2026-08-28-sk-hynix-indiana-hbm-groundbreaking': ['https://news.skhynix.com/en/groundbreaking-ceremony-in-indiana/', 'SK海力士官方'],
  '2026-08-28-nvidia-amazon-nvhbm': ['https://blogs.nvidia.com/blog/nvlink-fusion-nvhbm-custom-high-bandwidth-memory/', 'NVIDIA 官方博客'],
  '2026-08-28-primemas-micron-cxl-abaco': ['https://www.primemas.com/company/press.php?category=0&code=press&idx=103&page=1&ptype=view', 'Primemas 官方新闻稿'],
};
for (const record of raw.records) {
  if (!validIntelUrl(record.url)) {
    const original = historicalRecords.find(old => old.id === record.id && old.title === record.title && validIntelUrl(old.url));
    if (researched[record.id]) {
      [record.url, record.source] = researched[record.id];
      changes.push({ id: record.id, url: record.url, reason: '已核对官方原文' });
    } else if (original && !/\/tag\/|\/topic\/|2026-02-01-sk-hynix-q4/.test(original.url + record.id)) {
      record.url = original.url;
      changes.push({ id: record.id, url: record.url, reason: '恢复同 ID、同标题历史归档中的链接；未重新验证网页存活及全文' });
    }
  }
  if (['watch', 'deep_tracking'].includes(record.reaction_type)) {
    const previous = record.reaction_type;
    record.reaction_type = previous === 'deep_tracking' ? 'undervalued' : 'archive';
    changes.push({ id: record.id, field: 'reaction_type', from: previous, to: record.reaction_type });
  }
}
const unique = dedupeIntel(raw.records);
const pending = unique.filter(r => !validIntelUrl(r.url));
const published = unique.filter(r => validIntelUrl(r.url));
fs.writeFileSync(`${archive}/pending.json`, JSON.stringify({ reason: '原文链接缺失，等待核实后重新收录；不编造链接', records: pending }, null, 2) + '\n');
const report = {
  before: raw.records.length, missing_before: raw.records.filter(r => !validIntelUrl(r.url)).length + changes.filter(c => c.url).length,
  urls_restored: changes.filter(c => c.url).length, duplicate_records_merged: raw.records.length - unique.length,
  pending: pending.length, published: published.length, changes, duplicate_rules: rules,
};
fs.writeFileSync(`${archive}/audit.json`, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(file, JSON.stringify({ ...raw, records: published }, null, 2) + '\n');
console.log(JSON.stringify({ ...report, changes: undefined, duplicate_rules: undefined }, null, 2));
