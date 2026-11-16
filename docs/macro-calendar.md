# 宏观数据点评维护

数据文件是 `public/data/macro-calendar.json`，随现有 GitHub Pages 构建发布，不依赖 EDB 导出。

- `series`：只登记重点指标。按年份保存官方日程和来源；`days` 填北京时间下的月日。美联储决议按北京时间落日。
- `periodRule` 指定常规所属期为上月或当月；在 `periods` 里按发布月日覆盖特殊情况，如补发、合并月份和季度 GDP。议息决议不设统计所属期。
- `undated`：尚未确认具体发布日期的项目放在对应月份的「日期待确认」，核实后移入日历。
- `commentary`：通过 `eventId`（指标 key + 冒号 + 数据发布日期，例如 `us-cpi:2026-10-14`）挂回原数据。后补点评不改数据日期；若发布日更正，同时更新对应引用。
- 单家填写 `summary`。多家可填写 `consensus` 和 `differences`，每家来源在 `sources` 中单独记标题、可核实的研报日期和链接；不要用数据日期代替未知研报日期。
- 后续年份新增对应年份的日程序列，界面会自动列出该年的月份。

## Clawbot 点评提交流程

已定稿的内容按原文录入，只拆分展示字段；发现疑似数据、日期或措辞问题，另行反馈，不擅自修改。

1. 从最新的 `origin/main` 建任务分支（如 `codex/macro-us-cpi-2026-11-10`）。先从日历确认指标和北京时间发布日期，不按研报发布日期入历。找不到事件就报告，别自行改排期。
2. 一项事件一个文件：`content/macro-commentary/<指标key>_<YYYY-MM-DD>.json`。以 [CPI 样板](../content/macro-commentary/us-cpi_2026-11-10.json) 为模板。旧的日历内嵌点评仍能显示，同一事件有独立文件时以独立文件为准。
3. `eventId` 填 `指标key:YYYY-MM-DD`；`updatedAt` 填整理日期；`overview` 写本次更新和必要背景；`consensus` 只写真正的共同点，无共识可省略；`topics` 按议题写机构观点和依据，`views[].source` 是 `sources` 从 1 开始的序号。
4. 每条来源填 `institution`、`title`、`date`、`kind`（事后点评、发布前背景或背景研究）。有核实过的直达文章 URL 才填 `url`，不要填机构首页、搜索页或猜出的链接。官方公报单独填 `officialUrl`。不上传研报原件。
5. 修订时修改同一个文件和整理日期，保留 `eventId`；增删引用时同步检查编号。不新建重复条目，也不修改其他事件、排期或网页代码。
6. 运行 `node scripts/validate-macro-commentary.mjs`，只暂存该事件 JSON，提交并推送任务分支，开 PR 合入 `main`。部署工作流会再次校验；通过并合入后由现有 Pages 流程发布。遇到远端更新先同步并重跑校验，不强推 `main`。
