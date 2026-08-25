#!/usr/bin/env node
/**
 * Batch URL backfill script for missing URLs in clawbot_intel.json
 */

import { readFile, writeFile } from 'fs/promises';

const INTEL_FILE = '/root/.openclaw/workspace/content/intel/clawbot_intel.json';

// URL mappings: id -> url (matched by source where possible)
const URL_MAP = {
  // 2026-08-18 ~ 08-19
  '2026-08-19-ymtc-ipo-acceptance': 'https://www.semi.org.cn/site/semi/article/ffcb8b6d32924eeca7dcc428593a2f04.html',
  '2026-08-18-sk-hynix-crash-10-percent': 'https://news.10jqka.com.cn/deep-topic/topic/dt_01M0CWR4F1XP43JMVF9S4DR041',
  '2026-08-19-samsung-asan-fab-expansion': 'https://www.chinaflashmarket.com/newsflash/38622',

  // 2026-08-21
  '2026-08-21-micron-ceo-ai-demand-shortage': 'https://m.cls.cn/detail/2460168',
  '2026-08-21-sk-hynix-japan-fab-miyagi': 'https://m.cls.cn/detail/2460696', // 财联社 (same day, same source)

  // 2026-08-22
  '2026-08-22-samsung-shareholder-return': 'https://wallstreetcn.com/articles/3779992',
  '2026-08-22-nvidia-sk-micron-long-term-deal': 'https://www.digitimes.com/news/a20260821PD219/asic-shipments-gpu-2027-cpu.html',

  // 2026-08-23
  '2026-08-23-cowos-packaging-demand': '', // skip - not found

  // 2026-08-24
  '2026-08-24-sk-hynix-ai-memory-leadership': 'https://www.chinaflashmarket.com/a/184208',
  '2026-08-24-sk-hynix-hbm-packaging-path': 'https://www.ithome.com/0/993/345.htm',
  '2026-08-24-nvidia-server-prices-rise-memory': 'https://chinaflashmarket.com/a/184208',
  '2026-08-24-asic-overtake-gpu-2027': 'https://www.digitimes.com/news/a20260821PD219/asic-shipments-gpu-2027-cpu.html',
  '2026-08-24-samsung-pyeongtaek-p5-expansion': 'https://www.chinaflashmarket.com/a/184199',
  '2026-08-24-hbm4-advanced-logic-base-die': '', // skip - not found
  '2026-08-24-primemas-micron-cxl-memory': '', // skip - not found
  '2026-08-24-ymtc-star-market-listing': '', // skip - not found
  '2026-08-24-sk-hynix-hbf-cpo': '', // skip - not found

  // 2026-08-19 others
  '2026-08-19-ddr5-price-up-volume-down': '',
  '2026-08-19-sk-hynix-net-cash': '',
  '2026-08-19-samsung-ds-lab-upgrade': '',

  // 2026-08-20
  '2026-08-20-samsung-netlist-settlement': '',

  // 2026-08-21
  '2026-08-21-ymtc-ipo-nand-margin': '',
};

async function main() {
  const raw = await readFile(INTEL_FILE, 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.records)) {
    console.error('Invalid JSON structure');
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;
  const stillMissing = [];

  for (const record of data.records) {
    if (record.url && record.url !== '') continue;

    const url = URL_MAP[record.id];
    if (url && url !== '') {
      record.url = url;
      updated++;
      console.log(`✅ ${record.id}`);
    } else {
      skipped++;
      stillMissing.push({id: record.id, date: record.date, title: record.title, source: record.source});
    }
  }

  await writeFile(INTEL_FILE, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`\n✅ Updated: ${updated}, ⏭️ Skipped: ${skipped}`);
  if (stillMissing.length > 0) {
    console.log('\nStill missing URLs:');
    stillMissing.forEach(r => console.log(`  [${r.date}] ${r.title} (${r.source})`));
  }
}

main().catch(console.error);
