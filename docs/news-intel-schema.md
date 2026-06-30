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

- 字段名：`url`
- 可选，不强制每条都有。
- 如果有原新闻链接、公告链接、研报页面链接或数据来源页面，必须提交。
- 只允许 `http://` 或 `https://`。
- 不要填网盘、本地文件路径、聊天记录截图路径。
- 如果只有来源名称没有可打开页面，保留 `source`，不要伪造 `url`。
