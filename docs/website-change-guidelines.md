# 网站改动规范

本文件给 Codex、KimiWork、本地龙虾或其他维护代理使用。目标是：在不破坏数据管线和现有页面结构的前提下，继续修改 `memory-visualization-dashboard` 网站。

## 1. 先读顺序

接手修改前，按顺序读取：

```text
README.md
docs/website-change-guidelines.md
docs/clawbot-pr-protocol.md
docs/news-intel-schema.md
docs/local-clawbot-update-guide.md
clawbot.edb.config.json
```

如果任务只涉及页面样式，也至少读取 `README.md` 和本文件。

## 2. 目录分工

```text
src/main.tsx                 前端页面、组件、图表配置、搜索和本地情报交互
src/styles.css               全站样式
content/reports/*.md         深度报告源文件
content/intel/*.json         新闻情报库源文件
content/trackers/*.json      产业跟踪、长协、扩产、产业链图谱源文件
data/raw/prices/*            原始价格数据
edb_data/*.xlsx              Wind/EDB Excel 原始工作簿
scripts/generate-data.mjs    生成 data/processed 和 public/data/processed 的脚本
scripts/fetch-stocks.mjs     股票/ETF 日行情抓取
data/processed/*.json        脚本生成的中间数据
public/data/processed/*.json 页面实际读取的数据副本
docs/*.md                    给龙虾、维护者、接手代理看的说明文档
```

原则：页面展示改 `src/`，内容数据改 `content/` 或 `data/raw/`，不要手改 `data/processed/` 和 `public/data/processed/`，除非明确知道生成链路并同步运行过脚本。

## 3. 绝对禁止

- 禁止批量删除文件或目录。
- 不要使用 `Remove-Item -Recurse`、`rmdir /s`、`del /s`、`rm -rf` 等批量删除命令。
- 需要删除文件时，只能一次删除一个明确路径的文件。
- 不要回滚用户或龙虾已经修改的文件，除非用户明确要求。
- 不要把 `dist/` 当作源代码修改。
- 不要提交无来源的行业判断、新闻情报或报告结论。
- 不要把真实 API key、Cookie、Token、Wind 账号信息写进仓库。

## 4. 当前页面结构

网站是 `Vite + React + TypeScript + ECharts` 静态站点。

主要页面在 `src/main.tsx`：

```text
overview      概览
markets       市场图表
industry      产业跟踪
reports       报告库
intel         情报库
local-intel   本地情报管理
```

左侧导航、搜索、页面切换和大部分组件都在 `src/main.tsx`。样式集中在 `src/styles.css`。

改组件时优先复用已有结构：

```text
Panel
LineChart
StockCard
HbmContractBoard
ExpansionCapacityBoard
IndustryMap
IntelRadar
ReportsPage
```

不要轻易引入新状态管理库、UI 框架或路由库。

## 5. 设计规范

整体风格：浅色、简洁、信息密度高、适合经理快速扫读。

视觉优先级：

```text
1. 一眼看懂核心数据
2. 悬浮/点击再看细节
3. 文字说明尽量短，长内容放滚动框或详情页
4. 图表和卡片不要互相挤压
```

具体要求：

- 首屏和产业跟踪页尽量使用卡片、横条、时间轴、表格和小趋势图。
- 长文字不要直接撑高卡片，优先使用 `max-height + overflow:auto` 或两行省略。
- 不要使用大面积深色背景。
- 不要让图例、tooltip、筛选栏遮挡图表主体。
- 股票和价格图表优先保留 tooltip、单位、日期、来源。
- 概览卡片的涨跌幅胶囊颜色：涨绿色、跌红色、中性蓝色。
- 消息雷达、情报列表、扩产消息等内容较多模块必须限制高度，剩余内容用滚轮。
- 产业链图谱公司 logo 不要遮挡文字；如果 logo 取不到，显示文字 fallback，但官网链接必须正确。

## 6. HBM 长协模块维护规则

数据源：

```text
content/trackers/hbm_contracts.json
```

页面组件：

```text
src/main.tsx -> HbmContractBoard
src/styles.css -> .hbm-contract-*
```

当前展示逻辑：

- 每家公司一张卡，三家公司同一行，便于横向比较。
- 时间轴只表达两件事：已经签约覆盖到哪一年、正在谈的可能覆盖到哪一年。
- 谈判进度不再画成时间柱，而是在阶段文字上方用箭头指向当前阶段。
- 产能锁定必须区分“已售罄”和“高锁定”：已售罄表示对应供给已被完全消化，高锁定表示高比例承诺但不等同于全部售完。
- 如果同一家公司不同年份区间状态不同，使用 `capacity_lock_segments` 分段维护，每段包含 `start`、`end`、`status`、`label`、`note`。`status` 取值：`soldout`、`full`、`partial`、`watch`。
- 阶段文字通常是：验证、报价、锁量、签约、交付。
- `stage_index` 必须和 `stages` 数组对应，从 `0` 开始。

修改要求：

- 不要把谈判进度重新塞回柱状图。
- 箭头应绑定到当前阶段文字正上方，而不是按整条宽度估算位置。
- 已锁定和正在谈的年份必须清楚表达是覆盖到年初、年末还是区间。
- 如果来源证据很长，放到数据字段中，页面只显示摘要。

## 7. 扩产能力模块维护规则

数据源：

```text
content/trackers/expansion_capacity.json
```

页面组件：

```text
src/main.tsx -> ExpansionCapacityBoard
src/styles.css -> .capacity-*
```

当前产品目标：经理只关心两件事：

```text
1. 现在能产多少
2. 未来扩产后能产多少
```

因此页面上方只展示两根核心横条：

```text
当前产能
扩产后产能
```

下方再列“未来扩产消息”，包括资本支出、瓶颈、落地窗口和证据来源。

维护要求：

- 优先补真实产能口径：wafer starts/month、HBM stacks/month、bit output 或公司披露的等效口径。
- 不要用百分比替代真实产能；实在没有真实数据时，`value` 用 `null`，`display` 写“待补充/待核实”。
- `current_capacity.unit` 和 `target_capacity.unit` 必须一致，除非页面明确标注不同口径。
- 若要画清楚“原有产能 vs 扩产后产能”，优先维护 `facilities` 数组：`stage: "base"` 表示已有大工厂，`stage: "expansion"` 表示新建工厂或原有工厂增产；页面会自动按工厂颜色画堆积柱并加总。
- 扩产能力图表必须使用全模块统一最大刻度，不能每家公司单独归一化，否则会误导横向比较。
- 扩产证据和来源只放该公司自身相关的扩产、工厂、资本开支、良率爬坡或产能节点；SEMI 全球设备投资、行业总 capex 等背景材料不要放进单个公司卡片。
- 扩产卡片底部优先展示 HBM、DDR4/DDR5、NAND 三类扩产的实际落地时间；维护 `facilities.timeline` 和 `facilities.display`，不要在页面底部堆长新闻正文。
- `facilities.value` 和 `facilities.unit` 同时用于柱状图和落地节点里的“落地多少”，龙虾应优先填真实增量产能，不能确认时才使用占位指数并在 `display` 标明。
- `evidence` 至少包含 `date`、`label`、`detail`、`source`。
- 如果有原文链接，后续可给 `evidence` 增加 `url` 字段，再在页面上做可点击来源。

## 8. 情报库维护规则

数据源：

```text
content/intel/clawbot_intel.json
```

字段规范：

```text
docs/news-intel-schema.md
```

核心原则：

- 大类方向只显示：利好、利空、中性。
- “双向”不要作为页面方向，归入中性，并在传导路径或备注里说明双向影响。
- 情报可以被后续复核和修改，尤其是定价状态：未反应、部分反应、已反应、过度反应、反应失败。
- 有原新闻链接时必须提交 `url`；没有 URL 时允许为空。
- 消息雷达点击卡片：有 `url` 跳原新闻，没有 `url` 跳到情报库对应词条并置顶/定位。
- 删除重复新闻可以做，但必须确认是同一事件、同一来源或无新增信息。

新增或修改情报后，应运行：

```powershell
npm run generate:data
npm run build
```

## 9. 报告库维护规则

报告源文件：

```text
content/reports/YYYY-MM-DD.md
```

报告规范：

```text
docs/clawbot-pr-protocol.md
```

要求：

- 报告必须有 frontmatter：`title`、`date`、`rating`、`risk_level`、`summary`、`sources`。
- 报告正文可以变格式，但必须能被 Markdown 渲染。
- 思维导图如果由龙虾提供，优先放结构化文本，不要截图代替结构。
- 报告标题锚点应定位到报告顶部，不要定位到页面中间。
- 不要由维护代理擅自重写报告观点，除非用户明确要求。

## 10. 市场图表维护规则

价格数据：

```text
data/raw/prices/*.csv
edb_data/*.xlsx
data/processed/prices.json
```

股票和 ETF：

```text
scripts/fetch-stocks.mjs
data/processed/stocks.json
```

页面组件通常在：

```text
src/main.tsx -> markets 页面、LineChart、StockCard
```

要求：

- 股票展示日收盘价，不做实时价。
- 收盘价日期必须清楚标注；涨跌幅对比上一个交易日。
- 韩国和美国市场收盘时间不同，不要在未收盘时伪装成当天收盘。
- DRAM/NAND 图表至少支持 2023 年至今的数据。
- 点太多时不要显示所有 symbol 点，保留线条和 tooltip 即可。
- 图表下方保留时间框选器，用于 zoom in 某一段时间。
- 来源显示优先：Wind、TrendForce/DRAMeXchange、Yahoo Finance 或实际数据源名。不要显示“本地 Excel”作为最终来源名，除非用户明确需要内部追溯。

## 11. 数据生成规则

前端不直接读取 `content/`，而是读取生成后的 JSON。

常用命令：

```powershell
npm run validate:data
npm run generate:data
npm run build
```

含义：

```text
validate:data   只校验，不写生成文件
generate:data   从 content/data/raw/Excel 生成 data/processed 和 public/data/processed
build           TypeScript 检查 + Vite 构建
```

如果只改 `src/main.tsx` 或 `src/styles.css`，通常只需要：

```powershell
npm run build
```

如果改了 `content/`、`data/raw/`、`edb_data/`，需要先运行：

```powershell
npm run generate:data
npm run build
```

## 12. Git 和提交规则

本仓库可能长期处于 dirty 状态，因为 EDB、数据生成和用户文件会频繁变化。

提交前必须检查：

```powershell
git status --short
git diff -- src/main.tsx src/styles.css
git diff --check
```

提交原则：

- 只提交本次任务相关文件。
- 不要把用户未要求的 EDB、Excel、`data/processed/`、`public/data/processed/` 混进 UI 提交。
- 如果工作区很脏，可以使用干净临时 worktree 只复制需要发布的文件，再提交推送。
- 提交信息写清楚具体改了什么，例如：

```text
Clarify HBM progress and capacity expansion cards
Add industry map logo links
Update intel radar filters
```

推送前最好确认远端：

```powershell
git ls-remote origin refs/heads/main
git rev-parse HEAD
```

## 13. 常见任务入口

改概览布局：

```text
src/main.tsx 搜索 Overview 或 overview
src/styles.css 搜索 .hero / .stock-card / .intel-radar / .kpi
```

改市场图表：

```text
src/main.tsx 搜索 markets、LineChart、stock
src/styles.css 搜索 .chart、.stock
```

改 HBM 长协：

```text
content/trackers/hbm_contracts.json
src/main.tsx 搜索 HbmContractBoard
src/styles.css 搜索 .hbm-contract
```

改扩产能力：

```text
content/trackers/expansion_capacity.json
src/main.tsx 搜索 ExpansionCapacityBoard
src/styles.css 搜索 .capacity
```

改产业链图谱：

```text
content/trackers/industry_map.json
public/assets/logos/
src/main.tsx 搜索 IndustryMap
src/styles.css 搜索 .industry-map
```

改情报库：

```text
content/intel/clawbot_intel.json
docs/news-intel-schema.md
src/main.tsx 搜索 intel、IntelRadar、LocalIntel
```

改报告库：

```text
content/reports/
reports/
src/main.tsx 搜索 ReportsPage、MindMap
```

## 14. 给 KimiWork 的最短执行清单

每次接任务时按这 8 步走：

```text
1. 读 docs/website-change-guidelines.md
2. git status --short，确认有哪些用户/数据改动
3. 找到对应组件和数据源，只改任务相关文件
4. 不批量删除，不回滚无关改动
5. 如改数据，运行 npm run generate:data
6. 始终运行 npm run build
7. git diff --check
8. 只提交/推送本次任务相关文件
```

如果额度或时间不够，至少完成到第 6 步，并在回复中说明哪些文件已改、哪些验证已做、哪些还没推送。
