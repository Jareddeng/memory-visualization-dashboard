# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

## 项目配置：存储行业新闻收集

### GitHub
- 仓库：用户存储行业网站
- 推送方式：PR（用户保留审核权）
- 权限：Contents (Read and Write), Pull requests (Read and Write)
- 文件路径：`content/intel/clawbot_intel.json`
- 状态：✅ PAT 已验证，可读写仓库
- 目标仓库：`Jareddeng/memory-visualization-dashboard`

### 新闻收集任务
- 频率：每日 4 次
- 时间点：08:12, 12:13, 15:14, 22:14（Asia/Shanghai）
- 模式：isolated session（不影响主对话）
- 输出：GitHub PR（JSON 数据文件）
- 首次运行：需回溯补齐之前的新闻

### 来源分级
- 一级（90-100）：公司官方、监管披露、TrendForce/DRAMeXchange、客户上下游官方、官方统计
- 二级（70-89）：Reuters/Bloomberg/WSJ、韩美本土媒体、半导体垂直媒体、头部券商研报
- 三级（40-69）：专家专栏、峰会纪要、聚合平台（仅线索池）
- 四级（0-39）：禁用

### JSON 输出规范
**文件**：`content/intel/clawbot_intel.json`

**字段**（已更新，新增 `url`）：
- `id`: `YYYY-MM-DD-英文短描述`
- `date`: `YYYY-MM-DD`
- `type`: `市场消息`/`产品数据`/`行业分析`/`重大事件`/`公司公告`/`财报业绩`/`产业链跟踪`/`政策事件`
- `impact`: `bullish`/`bearish`/`neutral`
- `importance`: `S`/`A`/`B`/`C`
- `reaction_type`: `instant`/`undervalued`/`sentiment`/`archive`
- `pricing_status`: `unpriced`/`partial`/`priced`/`overpriced`/`failed`
- `horizon`: `intraday`/`1d`/`1w`/`1m`/`1q`/`longer`
- `title`: 短标题
- `product`: 产品/公司/主题
- `source`: 必须填写
- **`url`: 原文链接（可选，有则必填，仅 http/https）**
- `summary`: 事实摘要，非观点
- `transmission_path`: 影响传导路径
- `confidence`: `high`/`medium`/`low`
- `action`: `alert`/`watch`/`deep_tracking`/`archive`
- `review_date`: 复核日期

**判断原则**：
1. 是否改变基本面
2. 是否改变市场预期
3. 相关资产是否已反应
4. 反应发生在哪个市场/公司/产业链环节
5. 是否存在跨市场/产业链/时间周期的传导滞后
6. 应该 alert/watch/deep_tracking/archive

**PR 格式**：
- 标题：`Intel: update YYYY-MM-DD intelligence records`
- Body：包含 changed/date coverage/sources/notes

### 数据量管理（Codex 建议）
**当前性能限制（纯前端一次性加载）**：
- 100-500 条：轻松
- 1,000-3,000 条：仍可用，但情报库页面可能变慢
- 5,000-10,000 条：明显吃力
- 10,000+ 条：不建议继续当前模式

**第一阶段策略**：
- 活跃情报：最近 90 天，控制在 1,000-3,000 条以内
- 历史情报：归档但不默认展示

**首次回溯策略**：
- 从年初至今回溯（约 6 个月）
- 但分批提交，每批次 300-500 条，避免单次 PR 过大
- 优先 S/A 级重要新闻，B/C 级可选
- **重要原则：没有该层级信息宁可不添加，不硬凑。信息质量优先于数量。**

**中期升级方案**：
- 按月份拆文件：`content/intel/2026-06.json`、`content/intel/2026-07.json` 等
- 首页默认只加载最近 90 天
- 老新闻进入归档，需要时按月加载

**长期方案**：
- 超几万条后需接后端：Supabase、SQLite API、Airtable、Notion 或数据库

**清库存机制**：
- 已兑现（pricing_status: priced）且超过 review_date 的情报，移入归档
- 定期清理（建议每月一次）
- 归档文件：`content/intel/archive/YYYY-MM.json`

**质量优先原则**：
- 宁可少一条，不要加一条可疑的
- 没有足够来源确认的信息，不放入 JSON
- 无法判断 importance 时，默认不收录，而不是乱填
- 每日定时任务中，如果没找到有价值的信息，可以提交空更新或跳过

### 冷启动枚举约束（2026-06-30 教训）

**问题**：热启动有上下文记忆不会犯错，但冷启动（isolated session）缺少枚举值约束记忆，导致写入无效值，GitHub Actions 构建失败。

**根因**：cron 任务的 prompt 没有显式声明枚举值白名单，冷启动时 AI 会发明新值（如 `reaction_type: watch`、`pricing_status: none`）。

**修复**：
1. `docs/news-intel-schema.md` 已加入严格枚举值约束表 + 错误映射速查
2. `docs/news-intel-task-guide.md` 已加入"写入前必须校验"提醒
3. 4 个 cron 任务的 message 已嵌入 ENUM VALIDATION 块（`~/.openclaw/cron/jobs.json`）

**约束速查（冷启动必须遵守）**：

| 字段 | 允许值 | 常见错误 |
|------|--------|---------|
| `impact` | bullish / bearish / neutral | mixed |
| `reaction_type` | instant / undervalued / sentiment / archive | watch, overvalued, neutral, underappreciated |
| `pricing_status` | unpriced / partial / priced / overpriced / failed | none |
| `horizon` | intraday / 1d / 1w / 1m / 1q / longer | 1y, 2q, 6m |
| `confidence` | high / medium / low | medium-high |
| `action` | alert / watch / deep_tracking / archive | monitor |

**错误映射**：
- watch → archive | overvalued → sentiment | neutral（reaction_type）→ sentiment | underappreciated → undervalued | none → unpriced | mixed → neutral | 1y/2q → longer/1q | monitor → watch

**验证步骤**：写入 JSON 后，本地运行 `node scripts/generate-data.mjs`，通过后再 push。

### 待办
- [ ] 获取 GitHub Fine-grained PAT
- [x] 配置 cron 任务（4 个时间点：08:12, 12:13, 15:14, 22:14）— 2026-06-25 已配置，isolated session，全自动运行
- [ ] 首次运行：回溯年初至今新闻，分批提交（每批 300-500 条）
- [ ] 建立清库存机制（月度归档）
- [ ] 测试首次运行
