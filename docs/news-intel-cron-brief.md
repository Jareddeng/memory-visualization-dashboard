# 半导体新闻采集 - Cron 精简指令

## 前置
```bash
export GITHUB_TOKEN=$(cat /root/.github_token) && git remote set-url origin https://${GITHUB_TOKEN}@github.com/Jareddeng/memory-visualization-dashboard.git
```

## 核心规则（冷启动必须遵守）

1. **时间窗口**：只收集上次更新日期之后的新闻。不要 older news。
2. **时区规则（关键）**：
   - 美股收盘 ET 16:00 = 北京时间次日 04:00-05:00
   - 韩股开盘 KST 09:00 = 北京时间 08:00
   - 北京时间早上 8 点的新闻说"7月3日"，实际事件日期可能是 7月2日（美股收盘）
   - `date` 字段写**实际事件发生日期**，不是新闻发布日期
3. **5条驱动搜索深度**：5条不是"跳过"门槛而是搜索深度驱动。第一轮没够→继续扩大搜索（更多维度、更多关键词）。搜完所有维度仍不足5条，就提交实际找到的（哪怕0条）。严禁没搜透就跳过。
4. **枚举值**（严禁自创）：
   - impact: bullish/bearish/neutral
   - reaction_type: instant/undervalued/sentiment/archive
   - pricing_status: unpriced/partial/priced/overpriced/failed
   - horizon: intraday/1d/1w/1m/1q/longer
   - confidence: high/medium/low
   - action: alert/watch/deep_tracking/archive
5. **来源分级**：
   - Tier 1（直接收录）：Reuters, Bloomberg, WSJ, FT, TrendForce, 公司 IR/SEC
   - Tier 2（收录）：DIGITIMES, TechPowerUp, Wccftech, Maeil Business, Barron's, Yahoo Finance
   - Tier 3（需 2+ 交叉验证）：分析师专栏、会议纪要
   - Tier 4（禁止）：自媒体、匿名爆料、论坛、AI 生成内容
   - 中文白名单：新华社,央视,人民日报,经济日报,金十数据,21世纪经济,财经网,财新,第一财经,界面,经济观察网,中新经纬,每日经济,财联社,蓝鲸,中国经济周刊,证券日报,投资界,商界,36氪,创业邦,虎嗅,中国经营报,经济参考网
6. **去重（严禁 read 工具读取 JSON 文件）**：文件已 308K/250 条，读入会触发上下文溢出。
   - **强制使用 exec + python3 单行脚本：**
     - 查最新日期：`python3 -c "import json; print(max(r['date'] for r in json.load(open('content/intel/clawbot_intel.json'))['records']))"`
     - 查ID是否存在：`python3 -c "import json; ids=[r['id'] for r in json.load(open('content/intel/clawbot_intel.json'))['records']]; print('EXISTS' if 'PLACEHOLDER' in ids else 'OK')"`（替换 PLACEHOLDER）
     - 查URL是否存在：`python3 -c "import json; urls=[r.get('url','') for r in json.load(open('content/intel/clawbot_intel.json'))['records']]; print('EXISTS' if 'PLACEHOLDER' in urls else 'OK')"`（替换 PLACEHOLDER）
   - 同日市场暴跌/暴涨只保留一条 anchor
7. **写入**：用 `edit` 工具追加记录到 JSON 数组末尾，不要读取整个文件再重写。
8. **写入后**：运行 `node scripts/generate-data.mjs` 验证
9. **推送后**：运行 `git log origin/main --oneline -3` + `git status` 验证
9. **语言**：title/summary/transmission_path 必须中文

## 搜索策略（至少3轮，不够5条就继续扩）

- Round 1: 英文关键词 semiconductor DRAM HBM NAND Samsung SK Hynix Micron NVIDIA AI chip memory storage SSD
- Round 2: 中文关键词 半导体 DRAM HBM 三星 SK海力士 美光 英伟达 AI芯片 存储 内存 NAND SSD 算力租赁
- Round 3: 政策/跨市场/设备/产能等补漏
- Round 4+: 如果仍<5条，继续扩大（不同来源、细分产品、上下游传导链）

## 输出

写入 `content/intel/clawbot_intel.json`，然后 push。
