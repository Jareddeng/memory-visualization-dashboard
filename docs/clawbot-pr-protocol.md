# 龙虾接入与 PR 推送说明

本仓库是一个静态的存储行业看板。龙虾只通过 GitHub Pull Request 提交源文件，不直接改部署后的网页，也不提交构建产物。

网站在 PR 合并到 `main` 后，由 GitHub Actions 自动更新。浏览器刷新不会读取尚未合并的 PR 内容。

## 1. 总规则

- 每个 PR 尽量只做一件事：日报、EDB 数据、情报库、产业跟踪或产业链图谱分开提交。
- 只提交源文件。不要提交 `dist/`、`data/processed/`、`public/data/processed/`，除非维护者明确要求。
- 所有新增信息必须带来源。不能发布无来源判断。
- 不要随意改文件名、字段名、sheet 名或历史数据结构。
- 如果修正历史数据，必须在 PR body 说明修正日期范围、原因和来源。
- 合并后 Action 会自动运行；定时更新为北京时间 08:30 和 18:30。

## 2. 龙虾主要任务

龙虾当前需要负责五类内容：

```text
1. 每日深度报告
2. 报告思维导图
3. EDB 价格 Excel 更新
4. 新闻情报库结构化记录
5. 产业跟踪与产业链图谱
```

## 3. 每日深度报告

优先提交 Markdown：

```text
content/reports/YYYY-MM-DD.md
```

Frontmatter 必填：

```md
---
title: "2026-06-24 存储行业日报"
date: "2026-06-24"
rating: "中性"
risk_level: "中"
summary: "一句话说明当天最重要的行业判断。"
sources: ["WIND", "公司公告", "产业调研", "券商研报"]
---
```

字段取值：

```text
rating: 积极 / 中性 / 谨慎 / 风险上升
risk_level: 低 / 中 / 高
```

建议正文结构：

```md
## 核心结论

## 交易评价

## 价格与供需变化

## 公司与产业链跟踪

## 风险提示

## 来源说明
```

如果只有 Word 文件，也可以提交：

```text
reports/存储报告YYYYMMDD.docx
```

Action 会先运行 `npm run import:reports`，尝试把 `reports/*.docx` 转成 `content/reports/YYYY-MM-DD.md`。但 Markdown 仍然优先，因为标题、评级、风险等级、摘要和来源更可控。

## 4. 报告思维导图

思维导图源文件路径：

```text
reports/存储思维导图YYYYMMDD.txt
```

文件名日期必须和日报日期一致。网站会把 txt 编译成对应报告里的 `思维导图` 按钮。

支持 Markdown outline：

```md
## 一、核心结论
- 周期定位：AI 驱动存储行业进入强景气周期
- 核心驱动：HBM、DDR5、大容量 NAND 需求
### 子策略一：核心资产配置
- 策略逻辑：长协锁定业绩能见度
  1. 业绩确定性：长协增强能见度
  2. 价格高增：DRAM/NAND 合约价上行
```

尽量使用 UTF-8 编码。如果编码不确定，也可以提交，但要在 PR body 说明。

## 5. EDB 价格 Excel 更新

EDB 文件统一放在：

```text
edb_data/
```

固定文件名：

```text
edb_data/DRAM价格每日数据更新.xlsx
edb_data/DRAM合约平均价格.xlsx
edb_data/Nand Flash.xlsx
edb_data/NAND合约平均价格.xlsx
```

更新规则：

- 每次追加最新可用行。
- 不要改 sheet 名、列名和指标名。
- 不要重写历史行，除非是在修正错误。
- 价格单位当前按 `USD` 处理，来源显示为 `WIND`。
- `edb_data` 优先级高于根目录旧 Excel；同一日期、品类、规格重复时，`edb_data` 覆盖旧文件。
- Excel 中 `0`、`0.0` 或小于等于 0 的价格会被视作暂时无数据，生成脚本会跳过，不会画到图里。

当前图表识别口径：

```text
DRAM 现货：DDR4/DDR5 的 8Gb、16Gb、2Gx8、1Gx8、512Mx16 等已识别规格
DRAM 合约均价：DDR4/DDR5 8Gb、16Gb，以及 1Gx8、2Gx8
NAND 现货：当前 EDB 文件里实际只有 32Gb、64Gb 两列
NAND 合约均价：网站当前只展示 32Gb、64Gb
```

如果后续要新增 128Gb NAND 现货或其他规格，需要先确认 EDB 文件里有对应列，再由维护者扩展识别规则。

## 6. 新闻情报库

结构化情报文件：

```text
content/intel/clawbot_intel.json
```

Schema：

```json
{
  "records": [
    {
      "id": "2026-06-24-hbm-supply-tight",
      "date": "2026-06-24",
      "type": "行业分析",
      "impact": "bullish",
      "importance": "S",
      "reaction_type": "undervalued",
      "pricing_status": "partial",
      "horizon": "1m",
      "title": "HBM 供给仍偏紧",
      "product": "HBM",
      "source": "WIND; 公司公告; 产业调研",
      "summary": "一句话说明事实、影响方向和需要继续跟踪的变量。",
      "transmission_path": "海外 HBM 订单和封装产能约束可能继续传导至先进封装、材料和设备环节。",
      "confidence": "medium",
      "action": "deep_tracking",
      "review_date": "2026-06-30"
    }
  ]
}
```

### 6.1 字段说明

```text
id: 稳定唯一 ID，发布后不要改
date: 新闻首次出现或收集日期，YYYY-MM-DD
type: 产品数据 / 行业分析 / 重大事件 / 消息 / 其他自定义分类
title: 新闻标题
product: 涉及产品、行业、标的或主题
source: 信息来源
summary: 简要摘要
transmission_path: 传导路径，说明如何影响公司、产业链或资产价格
review_date: 未来复核定价状态的日期
```

### 6.2 方向分类

`impact` 只允许三类：

```text
bullish: 利多
bearish: 利空
neutral: 中性
```

含义：

```text
利多：可能提升相关资产、行业或公司的盈利预期、估值预期或市场情绪
利空：可能压制相关资产、行业或公司的盈利预期、估值预期或市场情绪
中性：暂时没有明确方向、影响较弱，或对不同环节/周期影响方向不一致
```

不要使用单独的“双向”。如果影响方向复杂，统一填 `neutral`，并在 `transmission_path` 里解释不同资产、产业链环节或时间周期的差异。

### 6.3 重要性分类

`importance` 只允许：

```text
S: S级：核心基本面变化，可能改变盈利、订单、供需、价格、产能、政策或竞争格局
A: A级：强预期变化，不一定立即改变利润，但可能明显改变市场预期
B: B级：情绪或主题变化，主要影响短期情绪、市场热度或主题交易
C: C级：低相关信息，信息价值有限，对投资判断和交易跟踪帮助较小
```

### 6.4 市场反应类型

`reaction_type` 只允许：

```text
instant: 即时催化型
undervalued: 重要未定价型
sentiment: 情绪交易型
archive: 普通归档型
```

分类标准：

```text
即时催化型：新闻明确、直接、市场认知充分，相关资产大概率快速反应，进入盘中即时催化池
重要未定价型：新闻重要但尚未充分反应，可能存在预期差、传导滞后或产业链扩散机会，进入重点跟踪池
情绪交易型：基本面影响有限，但可能引发短期主题、热度或资金关注
普通归档型：信息价值较低，短期大概率不会明显影响市场，仅作留存
```

### 6.5 定价状态

`pricing_status` 只允许：

```text
unpriced: 未反应，相关资产价格基本没有变化，新闻可能尚未被市场关注
partial: 部分反应，部分市场或部分标的已经反应，但传导尚未完成
priced: 已反应，主要相关资产已经出现较明显反应
overpriced: 过度反应，市场反应可能超过新闻本身能够解释的范围
failed: 反应失败，新闻理论上偏利多或利空，但市场并未按预期方向反应
```

### 6.6 影响周期、置信度和建议动作

```text
horizon: intraday / 1d / 1w / 1m / 1q / longer
confidence: high / medium / low
action: alert / watch / deep_tracking / archive
```

对应中文：

```text
horizon: 盘中 / 1日 / 1周 / 1个月 / 1季度 / 更长
confidence: 高 / 中 / 低
action: 盘中提醒 / 加入观察池 / 深度跟踪 / 归档
```

### 6.7 情报库使用原则

每条新闻都要回答：

```text
1. 是否改变基本面
2. 是否改变市场预期
3. 相关资产是否已经反应
4. 反应发生在哪个市场或哪个产业链环节
5. 是否存在跨市场、跨行业、跨产业链或跨时间周期的传导滞后
6. 应该盘中提醒、加入观察池、深度跟踪，还是归档
```

情报库重点不是堆新闻，而是把新闻变成可跟踪、可复核、可研究的投资线索。

## 7. 产业跟踪

产业跟踪文件路径：

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
- 每条事件或节点都要有来源字段。
- 更新 HBM4 长协、厂商扩产计划、产业链图谱时，优先在现有文件追加或修正，不要新建任意命名文件。

### 7.1 产业链图谱

路径：

```text
content/trackers/industry_map.json
```

Schema：

```json
{
  "updated_at": "2026-06-24",
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

推荐层级：

```text
上游材料与设备 / DRAM 原厂 / NAND 原厂 / HBM 与先进封装 / 模组与控制器 / 下游应用
```

## 8. 本地验证

提交 PR 前建议运行：

```bash
npm ci
npm run import:reports
npm run generate:data
npm run build
```

检查：

```text
1. 构建成功
2. 最新报告日期符合预期
3. EDB 没有重复价格错误
4. Excel 中 0.0 不会进入价格 JSON
5. 情报 JSON 字段没有非法枚举值
6. 不要提交 generated JSON，除非维护者要求
```

## 9. PR 标题

使用以下格式之一：

```text
Report: 2026-06-24 storage daily
EDB: update prices through 2026-06-24
Intel: update 2026-06-24 intelligence records
Tracker: update HBM4 negotiation timeline
Map: update storage supply-chain map
```

## 10. PR Body 模板

```md
## What changed
- Added/updated:

## Date coverage
- Report date:
- EDB latest date:
- Intel record dates:

## Sources
- 

## Validation
- [ ] npm run import:reports
- [ ] npm run generate:data
- [ ] npm run build

## Notes for reviewer
- Historical corrections:
- Schema/format changes:
- Data gaps:
- Items needing follow-up review:
```

## 11. 合并后的行为

PR 合并到 `main` 后，GitHub Actions 会：

```text
1. 安装依赖
2. 导入 Word 报告
3. 读取 EDB Excel、报告、情报库和产业跟踪 JSON
4. 抓取股票/ETF 日收盘价
5. 生成前端 JSON
6. 构建静态网站
7. 部署到 GitHub Pages
```

如果合并后网页没有立刻变化，先查看 GitHub Actions 是否已跑完。网页不是实时数据库，只有 Action 生成并部署后才会更新。
