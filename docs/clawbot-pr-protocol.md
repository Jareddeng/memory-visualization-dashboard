# Clawbot PR Protocol

This repository is a static storage-industry dashboard. Clawbot should send changes by GitHub Pull Request only. Do not edit the deployed site directly.

## Golden Rules

- Submit source files only. Do not commit generated files under `data/processed/`, `public/data/processed/`, or `dist/` unless the maintainer explicitly asks.
- Keep each PR narrow: one daily report PR, one EDB data update PR, or one tracker update PR.
- Preserve existing filenames and schemas. If a source format changes, explain it in the PR body.
- Every report or data update must include source notes. Do not publish unsourced claims.
- The website updates after the PR is merged and GitHub Actions runs. It is not updated by browser refresh.

## Daily Deep Report PR

Preferred path:

```text
content/reports/YYYY-MM-DD.md
```

Required Markdown frontmatter:

```md
---
title: "2026-06-23 存储行业日报"
date: "2026-06-23"
rating: "积极"
risk_level: "中"
summary: "一句话摘要，说明当天最重要的行业判断。"
sources: ["TrendForce", "公司公告", "券商研报"]
---
```

Allowed values:

```text
rating: 积极 / 中性 / 谨慎 / 风险上升
risk_level: 低 / 中 / 高
```

Recommended body sections:

```md
## 核心结论

## 交易评价

## 价格与供需变化

## 公司与产业链跟踪

## 风险提示

## 来源说明
```

If clawbot only has a Word report, it may submit:

```text
reports/存储报告YYYYMMDD.docx
```

The GitHub Action runs `npm run import:reports` before data generation. This converts `reports/*.docx` into `content/reports/YYYY-MM-DD.md`. Markdown is still preferred because it gives better control over title, rating, risk level, summary, and sources.

### Optional Report Mind Map

Clawbot may also submit a Markdown-outline mind map source file:

```text
reports/存储思维导图YYYYMMDD.txt
```

The filename date must match the report date. The data script compiles the txt file into the matching report JSON, and the site shows a `思维导图` button beside that report title.

Supported outline syntax:

```md
## 一、核心结论
- 周期定位：AI驱动存储行业进入强景气周期
- 核心驱动：HBM、DDR5、大容量NAND需求
### 子策略一：核心资产配置
- 策略逻辑：长协锁定业绩能见度
  1. 业绩确定性：长协增强能见度
  2. 价格高增：DRAM/NAND 合约价上行
```

Keep the txt file UTF-8 encoded when possible. If the encoding is uncertain, still submit the file and note it in the PR body.

## Daily EDB Data Update PR

Use this folder for EDB Excel updates:

```text
edb_data/
```

Keep these filenames stable:

```text
edb_data/DRAM价格每日数据更新.xlsx
edb_data/DRAM合约平均价格.xlsx
edb_data/Nand Flash.xlsx
edb_data/NAND合约平均价格.xlsx
```

Update policy:

- Append the newest available EDB rows.
- Do not rename sheets or columns unless required by the data source.
- Do not rewrite historical rows unless correcting an error.
- If historical data is corrected, list the affected date range and reason in the PR body.
- Keep units consistent with the existing workbook. The dashboard currently treats workbook prices as `USD` and source as `WIND`.

The data script reads both root-level legacy Excel files and `edb_data/*.xlsx`. If the same date/category/spec appears in both places, `edb_data` wins.

## Tracker Update PR

Use JSON files under:

```text
content/trackers/
```

Current trackers:

```text
content/trackers/hbm4_negotiations.json
content/trackers/expansion_plans.json
content/trackers/industry_map.json
```

Keep JSON valid and include `source` for each event or row.

### Industry Map Schema

Use `content/trackers/industry_map.json` for the storage industry chain map.

```json
{
  "updated_at": "2026-06-23",
  "source": "clawbot research; sources listed in report PR",
  "layers": [
    {
      "name": "上游材料与设备",
      "description": "前驱体、气体、CMP、刻蚀/沉积等环节。",
      "nodes": [
        {
          "name": "雅克科技",
          "region": "中国",
          "role": "前驱体",
          "note": "长鑫/长存产业链跟踪"
        }
      ]
    }
  ]
}
```

Recommended layers:

```text
上游材料与设备 / DRAM 原厂 / NAND 原厂 / HBM 与先进封装 / 模组与控制器 / 下游应用
```

## Intel Library PR

Use this file for structured intelligence items that should appear on the dashboard `情报库` tab:

```text
content/intel/clawbot_intel.json
```

Schema:

```json
{
  "records": [
    {
      "id": "2026-06-23-hbm-supply-1",
      "date": "2026-06-23",
      "type": "行业分析",
      "impact": "bullish",
      "title": "HBM 供给仍偏紧",
      "product": "HBM",
      "source": "clawbot research; sources listed in report PR",
      "summary": "一句话说明事实、影响方向和需要继续跟踪的变量。"
    }
  ]
}
```

Rules:

- `impact` must be `bullish`, `bearish`, or `neutral`.
- Keep `id` stable after publishing. Use a date plus short topic slug.
- Append new records at the top or bottom; the build script sorts by `date`.
- Include source notes. If the item depends on a report, mention the report PR or source list.
- The dashboard updates after the PR is merged and GitHub Actions runs. Browser refresh alone will not fetch unpublished PR content.

## Local Validation Before PR

Run these commands before opening a PR:

```bash
npm ci
npm run import:reports
npm run generate:data
npm run build
```

Then check:

- The build succeeds.
- The latest report date is expected.
- EDB updates do not create duplicate-price errors.
- Do not include generated JSON changes in the PR unless asked.

## PR Title Format

Use one of:

```text
Report: 2026-06-23 storage daily
EDB: update prices through 2026-06-23
Tracker: update HBM4 negotiation timeline
```

## PR Body Template

```md
## What changed
- Added/updated:

## Date coverage
- Report date:
- EDB latest date:

## Sources
- 

## Validation
- [ ] npm run import:reports
- [ ] npm run generate:data
- [ ] npm run build

## Notes for reviewer
- Any historical corrections:
- Any schema/format changes:
- Any data gaps:
```

## Merge Behavior

After merge to `main`, GitHub Actions will:

1. Install dependencies.
2. Import Word reports from `reports/*.docx`.
3. Generate dashboard JSON from reports, trackers, prices, and stocks.
4. Build the static site.
5. Deploy to GitHub Pages.

Scheduled updates also run daily at Beijing time 08:30 and 18:30.
