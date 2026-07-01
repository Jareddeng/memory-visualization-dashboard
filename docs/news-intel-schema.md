# 新闻情报库字段规范

小龙虾通过 PR 更新：

```text
content/intel/clawbot_intel.json
```

`url` 为可选字段：没有原文链接时可以不填；如果有原新闻、公告或研报页面链接，必须填写。网站会在消息雷达中把该条情报做成可点击卡片，点击后跳转到原文页面。

## 示例

```json
{
  "records": [
    {
      "id": "2026-06-24-hbm-supply-tight",
      "date": "2026-06-24",
      "type": "市场消息",
      "impact": "bullish",
      "importance": "S",
      "reaction_type": "undervalued",
      "pricing_status": "partial",
      "horizon": "1m",
      "title": "HBM 供给仍偏紧",
      "product": "HBM / DRAM",
      "source": "公司公告",
      "url": "https://example.com/original-news",
      "summary": "一句话说明新闻事实、影响方向和需要继续跟踪的变量。",
      "transmission_path": "HBM 订单和封装产能约束可能继续传导至先进封装、材料和设备环节。",
      "confidence": "medium",
      "action": "deep_tracking",
      "review_date": "2026-06-30"
    }
  ]
}
```

## 枚举字段严格约束（冷启动必须遵守）

以下字段只能使用**明确列出的值**，不允许自行发明新值。写错会导致 GitHub Actions 构建失败。

| 字段 | 允许值（只能从中选一个） | 常见错误（会导致构建失败） |
|------|--------------------------|---------------------------|
| `impact` | `bullish` / `bearish` / `neutral` | `mixed` |
| `importance` | `S` / `A` / `B` / `C` | `SS`、`A+` |
| `reaction_type` | `instant` / `undervalued` / `sentiment` / `archive` | `watch`、`overvalued`、`neutral`、`underappreciated` |
| `pricing_status` | `unpriced` / `partial` / `priced` / `overpriced` / `failed` | `none` |
| `horizon` | `intraday` / `1d` / `1w` / `1m` / `1q` / `longer` | `1y`、`2q`、`6m` |
| `confidence` | `high` / `medium` / `low` | `medium-high` |
| `action` | `alert` / `watch` / `deep_tracking` / `archive` | `monitor`、`track`、`follow` |

**错误映射速查：**
- `watch` → `archive`
- `overvalued` → `sentiment`
- `neutral`（作为 reaction_type）→ `sentiment`
- `underappreciated` → `undervalued`
- `none`（作为 pricing_status）→ `unpriced`
- `mixed`（作为 impact）→ `neutral`
- `1y` / `2q` → `longer` / `1q`
- `monitor` → `watch`

**验证方法：** 写入 JSON 后，在本地运行 `node scripts/generate-data.mjs` 测试。如果报 `Error: 情报 xxx 无效`，立即修复对应字段。

## 自动修复（冷启动时执行）

每次写入新记录前，必须执行以下自动修复脚本，扫描并修复所有现有记录中的无效枚举值：

```javascript
const allowed = {
  impact: ['bullish', 'bearish', 'neutral'],
  reaction_type: ['instant', 'undervalued', 'sentiment', 'archive'],
  pricing_status: ['unpriced', 'partial', 'priced', 'overpriced', 'failed'],
  horizon: ['intraday', '1d', '1w', '1m', '1q', 'longer'],
  confidence: ['high', 'medium', 'low'],
  action: ['alert', 'watch', 'deep_tracking', 'archive']
};
const mappings = {
  reaction_type: { watch: 'archive', overvalued: 'sentiment', neutral: 'sentiment', underappreciated: 'undervalued' },
  pricing_status: { none: 'unpriced' },
  impact: { mixed: 'neutral' },
  action: { monitor: 'watch' },
  horizon: { '1y': 'longer', '2q': '1q', '6m': '1q', '3m': '1q' }
};

// 扫描并修复
data.records.forEach(r => {
  for (const [field, values] of Object.entries(allowed)) {
    const v = r[field];
    if (v && !values.includes(v)) {
      const mapped = mappings[field]?.[v];
      if (mapped) r[field] = mapped;
    }
  }
});
```

**修复后必须重新运行 `node scripts/generate-data.mjs` 验证。**

## 来源分级（冷启动必须遵守）

**核心规则：优先英文原文，无英文原文时需在白名单媒体中交叉验证。**

| 等级 | 来源类型 | 举例 | 收录规则 |
|------|---------|------|---------|
| **一级（90-100）** | 权威数据机构 / 官方披露 | TrendForce、DRAMeXchange、公司财报/IR、SEC/KRX披露、KITA出口数据、JEDEC标准 | 直接收录，confidence=high |
| | 国际权威通讯社 | Reuters、Bloomberg、WSJ、FT | 直接收录 |
| **二级（70-89）** | 半导体垂直媒体 | DIGITIMES、TechPowerUp、BenchGecko、Wccftech、TechTimes | 收录，confidence=medium/high |
| | 韩美本土主流财经 | Maeil Business、Seoul Economic Daily、Barron's、Yahoo Finance | 收录 |
| | 头部券商研报 | Goldman Sachs、BofA Merrill、Mirae Asset、Deutsche Bank | 收录 |
| **三级（40-69）** | 专家专栏、峰会纪要 | 行业分析师个人专栏、会议演讲摘要 | 仅线索池，需交叉验证 |
| | 聚合平台/转述 | Sina Tech、Naver News、IT之家（无原创采访时） | 需溯源到一级/二级来源 |
| **四级（0-39）** | 禁用 | 自媒体、匿名爆料、论坛帖、未经验证的社交媒体、AI生成内容 | **禁止收录** |

**国内媒体白名单（无英文原文时使用）：**
- 官方/权威：新华社、央视/央视财经、人民日报、经济日报、中国经营报、经济参考网
- 财经媒体：金十数据、21世纪经济网、财经网、财新网、第一财经、界面新闻、经济观察网、中新经纬、每日经济新闻、财联社、蓝鲸财经、中国经济周刊、证券日报、投资界、商界
- 科技/创投：36氪、创业邦、虎嗅

**操作规则：**
1. 搜索到中文新闻 → 优先找英文原文替代
2. 无英文原文 → 检查 source 是否在白名单内
3. 白名单内 → 保留，confidence=medium
4. 不在白名单 → 需要 2 个以上白名单媒体交叉验证，否则不收录
5. **严禁收录四级来源**（自媒体、匿名爆料、论坛）
6. `source` 字段必须填写具体媒体名称，不能写"互联网""网络""reportedly""传闻"等模糊来源

## 原文链接要求
- 可选，不强制每条都有。
- 如果有原新闻链接、公告链接、研报页面链接或数据来源页面，必须提交。
- 只允许 `http://` 或 `https://`。
- 不要填网盘、本地文件路径、聊天记录截图路径。
- 如果只有来源名称没有可打开页面，保留 `source`，不要伪造 `url`。

## 状态字段生命周期与冷启动维护（S/A 级事件跟踪）

**核心原则：情报的价值取决于"市场是否已反应"和"反应程度如何"。S/A 级未反应事件是情报库最有价值的部分，每次冷启动必须扫描并更新。**

### 状态字段定义

| 字段 | 定义 | 允许值 | 状态转换规则 |
|------|------|--------|-------------|
| `pricing_status` | 市场定价状态 | `unpriced` / `partial` / `priced` / `overpriced` / `failed` | `unpriced`→`partial`→`priced`（按市场反应程度递进） |
| `reaction_type` | 市场反应类型 | `instant` / `undervalued` / `sentiment` / `archive` | `undervalued`→`sentiment`→`instant`（市场从低估到反应） |
| `action` | 跟踪动作 | `alert` / `watch` / `deep_tracking` / `archive` | `deep_tracking`→`watch`→`archive`（按跟踪深度递减） |
| `review_date` | 下次复核日期 | ISO 日期（YYYY-MM-DD）| 根据事件进展动态顺延 |
| `review_note` | 复核说明 | 字符串 | 记录状态变更原因和市场反应证据 |

### 状态转换触发条件

**`pricing_status` 转换：**
- `unpriced` → `partial`：市场开始讨论，股价/价格有轻微反应（如财报后首日涨 5%）
- `partial` → `priced`：市场充分反应，价格已反映预期（如财报后一周涨 30%，分析师上调目标价）
- `priced` → `overpriced`：市场过度反应，存在回调风险（如股价涨 200%+，基本面不支持）
- 任何状态 → `failed`：事件被证伪或预期落空（如投资计划取消、财报不及预期）

**`reaction_type` 转换：**
- `undervalued` → `sentiment`：市场开始关注，情绪面有变化但价格未动
- `sentiment` → `instant`：市场突然意识到重要性，价格快速反应（如出口管制消息发布后暴涨）
- `instant` → `archive`：事件已完全兑现，无后续催化剂

**`action` 转换：**
- `deep_tracking` → `watch`：事件已部分兑现，需继续观察（如投资计划宣布后股价已涨，但项目未开工）
- `watch` → `archive`：事件已完全兑现或无后续（如财报季结束，无新催化剂）
- `alert` → `watch`：紧急事件已得到市场初步反应，进入持续观察期

### 冷启动扫描规则（必须执行）

**Step 1: 筛选待跟踪记录**
```javascript
const trackRecords = data.records.filter(r => 
  (r.importance === 'S' || r.importance === 'A') &&
  (r.pricing_status === 'unpriced' || r.pricing_status === 'partial') &&
  (r.action === 'alert' || r.action === 'watch' || r.action === 'deep_tracking')
);
```

**Step 2: 搜索市场反应更新**
- 对这些记录的主题进行定向搜索，检查是否有新的市场反应：
  - 股价变动（相关公司股价是否已反映该事件）
  - 行业确认（是否有后续报道、分析师报告、公司公告确认）
  - 价格变动（DRAM/NAND/HBM 现货/合约价是否受影响）
  - 订单/产能变化（是否有新的订单、扩产、长协签署）

**Step 3: 更新状态字段**
- 如果发现市场已开始反应，更新对应字段并添加 `review_note`
- `review_date` 顺延到新的复核日期（通常 +7 天或 +30 天）

**Step 4: 添加后续记录（如需要）**
- 如果事件有重要进展，新增一条记录：
  - 新记录 `id` 加后缀（如 `-update`、`-confirmed`）
  - `related_ids` 指向原记录
  - 原记录保留作为历史快照

### 重点跟踪类型（必须维护）

| 类型 | 跟踪指标 | 状态更新触发 |
|------|---------|-------------|
| 财报业绩 | 股价反应、分析师评级调整 | 财报后 1-7 天 |
| 重大投资/扩产 | 实际开工、设备订单、产能释放 | 宣布后 30-90 天 |
| 出口管制/政策 | 后续执行细节、企业应对、市场反应 | 政策发布后 7-30 天 |
| HBM 供应紧张 | 价格变动、客户订单、产能释放 | 持续跟踪 |
| 云厂商 Capex | 后续季度指引、实际支出、服务器出货量 | 季度财报期 |

### 维护示例

原记录：
```json
{
  "id": "2026-06-29-south-korea-mega-chip-cluster",
  "date": "2026-06-29",
  "importance": "S",
  "pricing_status": "unpriced",
  "reaction_type": "undervalued",
  "action": "deep_tracking",
  "review_date": "2026-07-06"
}
```

一周后搜索发现：韩国存储股因该计划上涨 12%，设备商订单增加 → 更新为：
```json
{
  "pricing_status": "partial",
  "reaction_type": "instant",
  "action": "watch",
  "review_date": "2026-07-13",
  "review_note": "7/1 韩国存储股涨 12%，AMAT/Lam 设备订单增加，市场开始反应但项目未实际开工"
}
```
