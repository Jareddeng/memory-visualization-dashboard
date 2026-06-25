# 本地龙虾网站更新指南

本文件给本地龙虾执行。目标是通过 Pull Request 更新网站源数据，不直接修改部署后的网页。

## 1. 总原则

- 所有更新都走 PR，不直接推送到 `main`。
- 一个 PR 只做一类事情：EDB 价格、新闻情报、报告、产业跟踪不要混在一起。
- 只提交源文件，不提交构建产物。
- 不要提交 `dist/`、`data/processed/`、`public/data/processed/`。
- 不要删除历史数据、不要改文件名、不要改字段名，除非维护者明确要求。
- 如果修正历史数据，必须在 PR body 说明修正日期范围、原因和来源。
- 网站不是实时数据库。PR 合并后，要等 GitHub Actions 跑完，GitHub Pages 才会更新。

## 2. EDB 价格更新

本地龙虾只更新以下四个固定文件：

```text
edb_data/DRAM价格每日数据更新.xlsx
edb_data/DRAM合约平均价格.xlsx
edb_data/Nand Flash.xlsx
edb_data/NAND合约平均价格.xlsx
```

要求：

- 文件名必须完全一致。
- 不要改 sheet 名、列名、指标名、日期格式。
- 优先追加最新 EDB 数据；如果 EDB 导出是整表替换，也可以替换对应文件。
- `0`、`0.0`、空值、负数代表暂时无数据，脚本会跳过，不要手工伪造价格。
- EDB 价格来源在网站显示为 `WIND`。
- `edb_data/` 优先级高于根目录旧 Excel。

本地验证：

```powershell
npm ci
npm run validate:data
npm run build
```

可选完整生成：

```powershell
npm run generate:data
npm run build
```

注意：运行 `generate:data` 会改动 `data/processed/` 和 `public/data/processed/`，这些文件不要提交，除非维护者明确要求。

EDB PR 标题：

```text
EDB: update prices through 2026-06-25
```

EDB PR body：

```md
## What changed
- Updated EDB Excel files:

## Date coverage
- DRAM spot latest date:
- DRAM contract latest date:
- NAND spot latest date:
- NAND contract latest date:

## Data notes
- Missing / 0.0 values:
- Historical corrections:

## Validation
- [ ] npm run validate:data
- [ ] npm run build
```

## 3. 新闻情报更新

新闻情报文件：

```text
content/intel/clawbot_intel.json
```

字段规范见：

```text
docs/news-intel-schema.md
```

重点要求：

- `url` 可选，不是每条都强制。
- 如果有原新闻、公告、研报页面或数据来源页面，必须填写 `url`。
- `url` 只允许 `http://` 或 `https://`。
- 新增分类可以用 `市场消息`。
- 大类方向只用 `bullish`、`bearish`、`neutral`，不要使用“双向”；复杂影响归为 `neutral`，在 `transmission_path` 解释。
- 定价状态要维护：`unpriced`、`partial`、`priced`、`overpriced`、`failed`。
- 后续复核后可以通过 PR 修改旧情报的 `pricing_status`、`action`、`review_date` 和 `transmission_path`。

新闻情报 PR 标题：

```text
Intel: update 2026-06-25 intelligence records
```

## 4. 深度报告更新

优先提交 Markdown：

```text
content/reports/YYYY-MM-DD.md
```

如果只有 Word，可以先放：

```text
reports/存储报告YYYYMMDD.docx
```

但 Markdown 更优先，因为标题、评级、风险、摘要和来源更可控。

报告 frontmatter 必须包含：

```md
---
title: "2026-06-25 存储行业日报"
date: "2026-06-25"
rating: "中性"
risk_level: "中"
summary: "一句话摘要。"
sources: ["WIND", "公司公告", "券商研报"]
---
```

报告 PR 标题：

```text
Report: 2026-06-25 storage daily
```

## 5. 产业跟踪更新

固定目录：

```text
content/trackers/
```

当前文件：

```text
content/trackers/hbm4_negotiations.json
content/trackers/expansion_plans.json
content/trackers/industry_map.json
```

要求：

- JSON 必须合法。
- 每条事件都要有来源。
- 不要随意新增命名文件，优先维护现有三个文件。
- 产业链图谱放在 `industry_map.json`。

PR 标题示例：

```text
Tracker: update HBM4 negotiation timeline
Map: update storage supply-chain map
```

## 6. GitHub Actions 更新机制

触发方式：

- PR 合并到 `main`
- 手动 `workflow_dispatch`
- 定时任务：北京时间 08:30 和 18:30

Action 顺序：

```text
1. npm ci
2. npm run import:reports
3. npm run generate:data
4. npm run build
5. deploy to GitHub Pages
```

网页显示的是 Actions 生成后的静态文件。PR 没合并、Action 没跑完、Pages 没部署完成时，网页不会更新。

## 7. 给龙虾的执行口令

当维护者说“更新 EDB”时：

```text
读取 clawbot.edb.config.json。
只更新 edb_data/ 下四个 Excel。
运行 npm run validate:data 和 npm run build。
不要提交 data/processed、public/data/processed、dist。
开 PR，标题使用 EDB: update prices through YYYY-MM-DD。
```

当维护者说“更新情报”时：

```text
读取 docs/news-intel-schema.md。
更新 content/intel/clawbot_intel.json。
有原文链接就填 url，没有就留空。
维护 pricing_status 和 review_date。
开 PR，标题使用 Intel: update YYYY-MM-DD intelligence records。
```
