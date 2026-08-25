#!/usr/bin/env node
// Batch backfill all found URLs (S + A levels)

import { readFileSync, writeFileSync } from 'fs';

const file = '/root/.openclaw/workspace/content/intel/clawbot_intel.json';
const data = JSON.parse(readFileSync(file, 'utf8'));
const records = data.records;

// All found URL mappings
const updates = {
  // S-level
  '2026-08-08-hbm-shortage-until-2028': {
    url: 'https://www.eeo.com.cn/2026/0811/994788.shtml'
  },
  '2026-06-20-hbm-pricing-dashboard-200-300-500': {
    url: 'https://siliconanalysts.com/data/hbm-pricing'
  },
  '2026-06-29-nvidia-1t-order-commitments-2027': {
    url: 'https://techcrunch.com/2026/03/16/jensen-just-put-nvidias-blackwell-and-vera-rubin-sales-projections-into-the-1-trillion-stratosphere/'
  },
  '2026-06-27-wsts-semiconductor-975b-2026': {
    url: 'https://www.wsts.org/76/103/Global-Semiconductor-Market-Approaches-1T-in-2026'
  },
  // Additional A-level found in previous searches
  '2026-08-18-sk-hynix-crash-10-percent': {
    url: 'https://news.10jqka.com.cn/deep-topic/topic/dt_01M0CWR4F1XP43JMVF9S4DR041'
  },
  '2026-08-19-samsung-asan-fab-expansion': {
    url: 'https://www.chinaflashmarket.com/newsflash/38622'
  },
  '2026-08-21-micron-ceo-ai-demand-shortage': {
    url: 'https://m.cls.cn/detail/2460168'
  },
  '2026-08-22-samsung-shareholder-return': {
    url: 'https://wallstreetcn.com/articles/3779992'
  },
  '2026-08-24-sk-hynix-ai-memory-leadership': {
    url: 'https://www.chinaflashmarket.com/a/184208'
  },
  '2026-08-24-samsung-pyeongtaek-p5-expansion': {
    url: 'https://www.chinaflashmarket.com/a/184199'
  },
  '2026-08-24-sk-hynix-hbm-packaging-path': {
    url: 'https://www.ithome.com/0/993/345.htm'
  }
};

let updated = 0;
for (const item of records) {
  const mapping = updates[item.id];
  if (mapping && !item.url) {
    item.url = mapping.url;
    updated++;
    console.log(`FIXED: ${item.id}`);
  }
}

writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log(`\nTotal records updated: ${updated}`);
