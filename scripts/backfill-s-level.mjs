#!/usr/bin/env node
// Batch backfill S-level missing URLs

import { readFileSync, writeFileSync } from 'fs';

const file = '/root/.openclaw/workspace/content/intel/clawbot_intel.json';
const data = JSON.parse(readFileSync(file, 'utf8'));
const records = data.records;

// S-level URL mappings found via search
const sUpdates = {
  '2026-08-14-sk-hynix-chairman-shortage-warning': {
    url: 'https://www.cls.cn/detail/2454270',
    source: '财联社'  // Original was 财闻网, but 财联社 is more authoritative with same content
  },
  '2026-07-02-ase-advanced-packaging-price-hike-20pct': {
    url: 'https://www.trendforce.cn/industry-news/semiconductors/20260702-6066.html',
    source: 'TrendForce'
  },
  '2026-06-24-micron-fy26-q3-earnings': {
    url: 'https://www.sec.gov/Archives/edgar/data/723125/000072312526000013/a2026q3ex991-pressrelease.htm',
    source: 'SEC (Micron Official)'
  },
  '2026-06-15-nvidia-rubin-hbm4-drain': {
    url: 'https://globx.eu/blog/supply-chain-insight/nvidia-rubin-component-shortage-2026',
    source: 'GlobX Supply Chain'
  },
  '2026-06-05-nvidia-vera-rubin-hbm4-certification': {
    url: 'https://hk.finance.yahoo.com/news/%E8%8B%B1%E5%81%89%E9%81%94%E8%AA%8D%E8%AD%89%E4%B8%89%E6%98%9F-sk%E6%B5%B7%E5%8A%9B%E5%A3%AB%E5%8F%8A%E7%BE%8E%E5%85%89%E4%BE%9B%E6%87%89vera-rubin-hbm4%E8%A8%98%E6%86%B6%E9%AB%94-140001714.html',
    source: 'Yahoo Finance / Bloomberg'
  },
  '2026-06-01-nvidia-vera-rubin-full-production': {
    url: 'https://nvidianews.nvidia.com/news/vera-rubin-full-production-agentic-ai-factory',
    source: 'NVIDIA Official'
  },
  '2026-04-23-sk-hynix-q1-record-profit-72pct-margin': {
    url: 'https://finance.yahoo.com/quote/HY9H.MU/earnings/HY9H.MU-Q1-2026-earnings_call-547968.html',
    source: 'Yahoo Finance / SK Hynix Official'
  },
  '2026-04-23-skhynix-earnings-q1-record': {
    url: 'https://ninescrolls.com/news/sk-hynix-q1-2026-record-52-6-trillion-won-revenue-72-operating-margin-m15x-fab',
    source: 'NineScrolls / SK Hynix Official'
  }
};

let updated = 0;
for (const item of records) {
  const mapping = sUpdates[item.id];
  if (mapping && !item.url) {
    item.url = mapping.url;
    // Optionally update source to be more precise
    // item.source = mapping.source;
    updated++;
    console.log(`S-LEVEL FIXED: ${item.id}`);
    console.log(`  URL: ${mapping.url}`);
    console.log(`  Source: ${item.source} -> ${mapping.source}`);
  }
}

writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log(`\nTotal S-level records updated: ${updated}`);
