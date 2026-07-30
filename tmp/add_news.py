import json
import sys
from datetime import datetime

# Read existing JSON
with open('/root/.openclaw/workspace/memory-visualization-dashboard/clawbot_intel.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# New entries to add
new_entries = [
    {
        "title": "三星电子Q2 2026财报：AI需求推动创纪录利润，利润率超52%",
        "source": "investing.com",
        "date": "2026-07-30",
        "url": "https://www.investing.com/news/company-news/samsung-q2-2026-slides-ai-demand-drives-record-profit-margins-top-52-93CH-4822297",
        "summary": "三星电子于7月30日发布2026年第二季度完整财报，营收达171.5万亿韩元，营业利润创历史新高达89.4万亿韩元，同比增长1810%。AI数据中心对HBM、高容量DRAM及企业级SSD的强劲需求是主要驱动力。公司已率先实现HBM4大规模量产，并计划扩大HBM4E供应。",
        "product": "HBM, DRAM, NAND, SSD",
        "impact": "bullish",
        "reaction_type": "instant",
        "pricing_status": "priced",
        "horizon": "1d",
        "confidence": "high",
        "action": "alert"
    },
    {
        "title": "三星电子Q2 2026财报电话会：AI需求 surge 推动创纪录季度利润",
        "source": "ca.investing.com",
        "date": "2026-07-30",
        "url": "https://ca.investing.com/news/transcripts/earnings-call-transcript-samsung-electronics-posts-record-q2-2026-profit-as-ai-demand-surges-93CH-4762248",
        "summary": "三星电子在7月30日的财报电话会上确认，第二季度营收环比增长28%至171.5万亿韩元，营业利润创历史新高。公司深化与谷歌合作，扩大对英伟达的HBM4和HBM4E供应，目标是2027年重夺HBM市场领导地位。",
        "product": "HBM4, HBM4E, DRAM",
        "impact": "bullish",
        "reaction_type": "instant",
        "pricing_status": "priced",
        "horizon": "1w",
        "confidence": "high",
        "action": "deep_tracking"
    },
    {
        "title": "SK海力士Q2 2026财报：营收79.3万亿韩元，营业利润60.5万亿韩元创历史新高",
        "source": "SK Hynix Official",
        "date": "2026-07-29",
        "url": "https://news.skhynix.com/2026-q2-earnings/",
        "summary": "SK海力士公布2026年第二季度财报，营收79.32万亿韩元，同比增长257%，环比增长51%；营业利润60.54万亿韩元，同比飙升557%，环比增长61%。当季营业利润已超过2025年全年总和。HBM4产品已于第二季度量产出货，下半年将提升产能。公司预计存储芯片短缺可能持续至2030年以后。",
        "product": "HBM, HBM4, DRAM, NAND",
        "impact": "bullish",
        "reaction_type": "sentiment",
        "pricing_status": "partial",
        "horizon": "1w",
        "confidence": "high",
        "action": "deep_tracking"
    },
    {
        "title": "SK海力士财报不及预期引发股价巨震，盘中一度跌近20%",
        "source": "财新网",
        "date": "2026-07-29",
        "url": "https://www.caixin.com/2026-07-29/102469076.html",
        "summary": "SK海力士7月29日发布Q2财报后，尽管业绩创历史新高，但因不及分析师预期（营收79万亿vs预期84万亿，营业利润60.5万亿vs预期64.2万亿韩元），股价一度下跌近20%，后跌幅收窄至11%。自6月下旬高点以来累计跌幅已超五成。公司表示未看到AI投资放缓迹象，预计下半年HBM4销售将推动盈利改善。",
        "product": "HBM, DRAM, NAND",
        "impact": "bearish",
        "reaction_type": "instant",
        "pricing_status": "priced",
        "horizon": "1d",
        "confidence": "high",
        "action": "alert"
    },
    {
        "title": "SK海力士下半年量产LPDDR6内存，小米有望首发搭载",
        "source": "gizmochina.com",
        "date": "2026-07-28",
        "url": "https://www.gizmochina.com/2026/07/28/sk-hynix-lpddr6-xiaomi/",
        "summary": "SK海力士计划2026年下半年开始量产下一代LPDDR6 RAM，小米可能成为首发客户。LPDDR6是面向移动设备和高性能计算的新一代低功耗内存标准，将进一步提升AI手机的内存带宽和能效表现。",
        "product": "LPDDR6, DRAM",
        "impact": "bullish",
        "reaction_type": "undervalued",
        "pricing_status": "unpriced",
        "horizon": "1m",
        "confidence": "medium",
        "action": "watch"
    }
]

# Deduplicate based on URL
existing_urls = {entry.get('url', '') for entry in data.get('news', [])}
added = 0
skipped = 0

for entry in new_entries:
    if entry['url'] in existing_urls:
        skipped += 1
        print(f"SKIP (duplicate URL): {entry['title']}")
    else:
        data['news'].append(entry)
        existing_urls.add(entry['url'])
        added += 1
        print(f"ADD: {entry['title']}")

# Update metadata
data['date'] = "2026-07-30"
data['generated_at'] = datetime.now().isoformat()

# Sort news by date (newest first)
data['news'].sort(key=lambda x: x.get('date', ''), reverse=True)

# Write back
with open('/root/.openclaw/workspace/memory-visualization-dashboard/clawbot_intel.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\nAdded: {added}, Skipped: {skipped}, Total: {len(data['news'])}")
