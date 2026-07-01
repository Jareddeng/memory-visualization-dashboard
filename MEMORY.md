# MEMORY.md

## 用户信息

- 行业：半导体市场情报/交易，专注 DRAM、NAND、HBM 定价动态
- 工具：使用 Wind（万德）终端获取专业数据
- 姓名/公司：未明确提供

## 工作风格

- 激进自动化偏好：已开启 GitHub auto-merge，无需手动 PR 审核
- 决策模式：简短二元审批（"全自动吧""改吧""推吧"）
- 不耐烦：挑战中间步骤必要性，要求直接执行
- 对 cron 任务要求：运行前 export GITHUB_TOKEN（历史认证失败遗留）
- 状态检查：常用"跑完了没""为什么运行失败了"

## 沟通偏好

- 极其直接、简短，技术黑话（"万德""龙虾"）
- 烦躁时会勉强给更多时间（"如果还需要更多时间那你也可以改更长"）
- 强调因果链，拒绝孤立事实
- 要求明确传导机制（如 算力租赁价格下跌 → 云厂商获利下降 → 采购数据下跌 → 芯片需求下降 → 存储需求下降 → 价格影响）
- 核心诉求：7×24 可用性优于桌面工具

## 项目

- 半导体/存储行业新闻情报网站
- GitHub 自动数据流：Jareddeng/memory-visualization-dashboard
- 每日 4 次 cron 新闻收集（早中晚+夜）
- 回溯补录：2024 年 10 月至今

## 来源质量要求

- 25 家国内新闻 outlets 交叉验证：新华社、央视、人民日报、金十数据、21世纪经济网、财经网、财新网、第一财经、界面新闻、经济观察网、经济日报、央视财经、中新经纬、每日经济新闻、财联社、36氪、创业邦、虎嗅、中国经营报、蓝鲸财经、中国经济周刊、投资界、证券日报、商界、经济参考网
- 优先原文英文，无原文则国内交叉验证
- 拒绝"硬找"，必须有清晰传导路径

## 约束与教训

- GITHUB_TOKEN 必须每次 cron 中显式 export
- 周末新闻可能较少（美国时间滞后一天）
- 新闻框架时间锁：每次更新当天用前一天的时间锁
- 批量回溯时：S/A 优先，B/C 可选，不硬凑

## 归档规则（已生效）

- cron-only 记录（无用户交互的模板化任务）超过 2 天自动归档到 `memory/archive/stm/YYYY-MM-DD_cron.md`
- USER.md 只保留最近 2 天有实质对话的会话
- 重要决策/变更直接写入本文件

## 数据质量控制（2026-07-01 确立，2026-07-01 完善）

### 重复检查机制（4 步查重流程）
每次新增记录前必须执行：
1. **ID 查重**：检查 `id` 是否已存在（精确匹配）
2. **URL 查重**：检查 `url` 是否已存在，相同则对比内容
3. **内容查重**：同一日期+主题的相似标题，区分政府/企业主体
4. **Enum 自动修复**：扫描所有现有记录，自动映射无效枚举值

**已发现的重复模式：**
- Micron 财报：同一财报被不同来源报道，产生重复记录（如 `2026-06-24-micron-fy26-q3-earnings` 与 `2026-06-24-micron-q3-fy26-record-earnings`）
- 政府投资计划：中央政府和企业的投资计划需区分主体（如韩国政府 800 万亿 vs 三星 2655 万亿）

### Schema 校验与自动修复
- 写入前必须运行 `node scripts/generate-data.mjs` 验证
- 枚举值自动映射已写入冷启动文件（cron message + docs）：
  - `watch→archive`, `overvalued→sentiment`, `neutral(reaction_type)→sentiment`
  - `underappreciated→undervalued`, `none→unpriced`, `mixed→neutral`
  - `monitor→watch`, `1y/2q/6m→longer/1q`

### 推送状态核实（2026-07-01 教训后确立）
- **禁止只报告 "push 成功"**，必须执行 `git log origin/main --oneline -3` 核实
- 必须确认 `git status` 为 clean
- 本地有未 commit 修改时，isolated session 会误判推送状态

### 冷启动文件更新（已推送 f177daf）
- `docs/news-intel-task-guide.md`：查重流程 + 推送验证
- `docs/news-intel-schema.md`：自动修复脚本
- `~/.openclaw/cron/jobs.json`：4 个 cron 任务 message 嵌入新规则
