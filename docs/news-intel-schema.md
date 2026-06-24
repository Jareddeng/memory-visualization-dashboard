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

## 类型建议

`type` 可以使用：

```text
市场消息
产品数据
行业分析
重大事件
公司公告
财报业绩
产业链跟踪
政策事件
```

## 原文链接要求

- 字段名：`url`
- 可选，不强制每条都有。
- 如果有原新闻链接、公告链接、研报页面链接或数据来源页面，必须提交。
- 只允许 `http://` 或 `https://`。
- 不要填网盘、本地文件路径、聊天记录截图路径。
- 如果只有来源名称没有可打开页面，保留 `source`，不要伪造 `url`。
