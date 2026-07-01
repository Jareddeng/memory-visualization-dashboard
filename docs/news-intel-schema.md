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
