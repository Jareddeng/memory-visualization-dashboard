# 半导体新闻情报收集任务说明

## 任务
搜索半导体/存储行业新闻，写入 GitHub 仓库。

## 搜索策略（6轮，可自主拓展）

**时间过滤（硬性要求）：**
- 每次搜索必须附加时间过滤，只搜「搜索执行日期的前一天」及之后的信息
- 例如：6月29日执行 → 搜索关键词后加 `after:2026-06-28`
- 不支持 `after:` 的引擎，用「过去24小时」「今日」等时间筛选
- **无时间过滤的搜索结果视为无效，直接丢弃**
- 若某轮搜索因时间过滤导致结果为空，记为「当日无新信息」，不再放宽时间窗口去凑数

### 第1轮：广度（供需与价格）
- "memory semiconductor supply demand 2026 after:YYYY-MM-DD"
- "DRAM NAND contract price latest TrendForce after:YYYY-MM-DD"
- "DRAM NAND spot price latest DRAMeXchange after:YYYY-MM-DD"
- "server DRAM enterprise SSD price latest after:YYYY-MM-DD"
- "memory wafer capacity capex equipment 2026 after:YYYY-MM-DD"
- "AI server smartphone PC memory demand 2026 after:YYYY-MM-DD"

### 第2轮：深度（原厂与产品）
- "SK hynix Samsung Micron earnings guidance memory HBM after:YYYY-MM-DD"
- "SK hynix Samsung Micron capex memory HBM after:YYYY-MM-DD"
- "SK hynix Samsung Micron wafer capacity DRAM NAND HBM after:YYYY-MM-DD"
- "HBM3E HBM4 supply Nvidia SK hynix Samsung Micron after:YYYY-MM-DD"
- "Samsung HBM Nvidia qualification Micron SK hynix HBM supply agreement after:YYYY-MM-DD"

### 第3轮：事件驱动（订单与周期）
- "hyperscaler capex AI data center Microsoft Amazon Google Meta after:YYYY-MM-DD"
- "AI server demand HBM DRAM enterprise SSD after:YYYY-MM-DD"
- "Nvidia Blackwell Rubin HBM supply after:YYYY-MM-DD"
- "HBM supply demand pricing latest after:YYYY-MM-DD"
- "memory capex oversupply risk 2027 after:YYYY-MM-DD"

### 第4轮：渠道与区域（地缘与贸易）
- "TrendForce DRAM NAND HBM latest after:YYYY-MM-DD"
- "Reuters Bloomberg memory chip HBM SK hynix Samsung Micron after:YYYY-MM-DD"
- "Korea semiconductor exports memory 2026 after:YYYY-MM-DD"
- "CXMT DRAM YMTC NAND competition after:YYYY-MM-DD"
- "US export controls HBM China memory chips after:YYYY-MM-DD"

### 第5轮：政策与政府投资（新增）
- "US CHIPS Act funding disbursement memory semiconductor after:YYYY-MM-DD"
- "China IC fund investment semiconductor memory 2026 after:YYYY-MM-DD"
- "South Korea government semiconductor investment Samsung SK hynix after:YYYY-MM-DD"
- "Korea chip cluster Honam Chungcheong mega project after:YYYY-MM-DD"
- "US export controls China memory chips blacklist after:YYYY-MM-DD"
- "government data center AI computing infrastructure investment 2026 after:YYYY-MM-DD"
- "tariff trade war semiconductor memory chips after:YYYY-MM-DD"
- "EU Chips Act Japan semiconductor subsidy memory after:YYYY-MM-DD"
- "entity list blacklist China semiconductor after:YYYY-MM-DD"
- "antitrust semiconductor memory acquisition after:YYYY-MM-DD"

### 第6轮：跨市场信号（自主学习，基于已知传导链）
- "GPU compute rental price AI cloud 2026 after:YYYY-MM-DD" → 算力租赁 → 云厂商获利 → 采购
- "cryptocurrency price mining GPU demand 2026 after:YYYY-MM-DD" → 矿机 → 显存/HBM
- "Federal Reserve interest rate tech capex after:YYYY-MM-DD" → 融资 → 云厂商Capex
- "China real estate infrastructure server demand after:YYYY-MM-DD" → 基建 → 服务器 → 存储
- "EV electric vehicle ADAS memory content after:YYYY-MM-DD" → 新能源车 → 车规存储
- 任何观察到的上游信号，如果逻辑链可传导至存储价格，主动加入搜索

**执行原则**：
- 每轮搜索后评估：是否有新信息？质量如何？是否触发新的传导链？
- 如果某轮发现新信号（如"政府新建智算中心"），回溯检查是否已影响原厂订单或价格
- 如果某轮搜索结果重复或无增量，跳过后续同类搜索
- 每轮搜索取前 5-10 条结果，交叉验证来源可信度

## 环境变量要求（isolated session 必须能访问）
- `GITHUB_TOKEN` 必须设置为系统环境变量，或在 openclaw 配置中显式声明
- 写入 `~/.bashrc` 和 `~/.profile` 对 isolated session 可能不够
- 如不确定 token 可用性，先执行 `echo "Token: ${GITHUB_TOKEN:0:20}..."` 验证
- 若 token 不可用，**不要尝试 git push**，只写本地文件并报告问题

## 搜索维度（可自主拓展，不等待用户提示）

基于以下五个维度框架，主动识别可能的影响因素。用户未描述的类型，根据已知事实和逻辑推导自行补充搜索。

### 第1轮：广度（供需与价格）
- 内存/存储器供需、合约价/现货价、Wafer/设备/产能
- 智能手机/PC/服务器/AI终端需求

### 第2轮：深度（原厂与产品）
- SK Hynix、Samsung、Micron 财报、Capex、HBM、技术路线
- 长协、产能分配、良率、产品验证

### 第3轮：事件驱动（订单与周期）
- 超大规模云厂商Capex、AI服务器需求、GPU/ASIC平台
- 周期拐点信号、库存、价格战风险

### 第4轮：渠道与区域（地缘与贸易）
- TrendForce/Reuters/Bloomberg等渠道信息
- 韩国/中国/日本出口、贸易政策、出口管制

### 第5轮：政策与政府投资（新增，高频影响）
- 美国CHIPS法案拨款、补贴 disbursement、对华出口管制更新
- 中国大基金（国家集成电路产业投资基金）投资、地方晶圆厂补贴
- 各国半导体产业政策（日本、韩国、欧盟芯片法案）
- 政府主导的大型数据中心/算力中心项目（影响DRAM/NAND需求）
- 关税、贸易壁垒、实体清单变更
- 反垄断/国家安全审查（影响并购和供应格局）

### 第6轮：跨市场信号（自主识别，不等待提示）
基于已知事实主动推导：
- 算力租赁价格 → 云厂商获利 → 采购 → 芯片需求 → 存储需求
- 比特币/以太坊价格 → 矿机需求 → 显卡/ASIC → 显存/HBM
- 美联储利率 → 融资成本 → 云厂商Capex节奏 → 存储采购
- 中国房地产/基建 → 服务器需求 → 存储消耗
- 新能源汽车渗透率 → 车规存储需求
- 任何上游信号或下游需求变化，如果可能传导到存储价格，就纳入搜索

**自主学习原则**：
- 看到A影响B，B影响C，C影响DRAM价格 → 主动追踪A
- 不等待用户说"你也看看X"，看到相关信号就主动拓展
- 政策类信息优先度：对华出口管制 > CHIPS拨款 > 大基金 > 地方补贴 > 其他国家政策
- 政府投资类优先度：算力中心/智算中心 > 数据中心 > 晶圆厂补贴 > 终端补贴

## 周末规则
- 周六/周日搜索后，如无 S 级或 A 级信息，提交空更新（不硬凑）
- 美国时间滞后中国一天，周日-周一期间新闻天然偏少，属正常
- 周一执行时，时间锁为 `after:YYYY-MM-DD`（周日日期），但预期结果可能偏少

## 自主学习与拓展原则（不等待用户描述）

用户不可能描述完所有信息类型。以下机制用于自主识别新信号：

### 传导链推导
看到任何上游信号，问自己：这是否影响存储价格？
- 政府新建智算中心 → 服务器需求 → DRAM/NAND消耗
- 利率变化 → 融资成本 → 云厂商Capex节奏 → 存储采购
- 矿币价格 → 矿机需求 → GPU → 显存/HBM
- 汽车销量/ADAS渗透率 → 车规存储需求
- 房地产/基建 → 服务器/边缘计算 → 存储
- 任何原厂扩产、技术突破、客户变动 → 供需格局 → 价格

### 政策类信息自动识别
政府动作通常有公开窗口期，主动搜索：
- CHIPS法案拨款进度（每季度更新）
- 实体清单变更（不定期）
- 大基金投资（不定期）
- 地方晶圆厂补贴/土地/税收（持续）
- 政府招标/政府采购数据中心（持续）
- 关税更新（季度或事件驱动）

### 用户未提到的，但已知可能影响的
- 台积电/三星Foundry产能分配 → 可能影响存储原厂自有产能决策
- 光刻机/设备交付 → 影响扩产时间表
- 电力/能源政策 → 影响晶圆厂选址和运营成本
- 人才/移民政策 → 影响HBM工程师供给（如Micron在首尔挖角）
- 任何影响"供需"或"价格"的变量，无论多远，只要逻辑链成立，就纳入

### 执行规则
- 发现新传导链时，写入本文件记录，供后续任务复用
- 某类信息连续3天空跑，降低该维度搜索频率（从每轮必搜改为隔轮抽查）
- 某类信息出现高价值信号，提升频率并扩展到相关维度
- 宁可多搜一个维度，不要漏掉一个可能的价格驱动因素

## 去重规则（deduplication）

**核心原则：只自动删除 URL 或核心事实完全重复的新闻；凡是来源、数字、市场反应、时间进展有差异的，都不要删，改为合并或标记关联。**

### 可直接删除的情况（无需人工确认）

- `title` 基本相同，`url` 相同。
- 同一事件被同一来源重复推送，发布时间差在几分钟内。
- 标题不同但 `url` 完全相同，且正文摘要没有新增信息。
- 同一公告 / 同一公司新闻被重复抓入多次，只保留字段最完整、时间最早或来源最权威的一条。

**删除时必须写入 `dedupe_note`：**
```json
{
  "dedupe_note": "Deleted: exact duplicate of 2026-06-29-semi-memory-equipment-50b-2026 (same url, same title)"
}
```

### 不可自动删除、应合并/关联的情况

- **不同来源报道同一事件，但细节、数字、口径不同** → 不删除，将新增来源并入同一条情报的 `related_sources` 数组，并在 `summary` 中补充差异点。
- **同一事件后续有更新**（如"传闻"变"确认"）→ 不删除旧条，改为同一事件链：旧条保留，新条引用旧条 `id`，并更新 `pricing_status` / `review_note`。
- **一条是新闻，一条是公司公告或交易所公告** → 不删除，分别保留，用 `related_ids` 互相关联。
- **市场反应状态不同**（如一条"unpriced"，后续更新成"partial"）→ 不删除旧条，新条写更新，旧条保留作为历史快照。
- **时间进展不同**（如"计划投资" vs "正式宣布开工"）→ 视为事件链，旧条保留，新条追加。

### 合并格式示例

```json
{
  "id": "2026-06-29-semi-memory-equipment-50b-2026",
  "related_sources": [
    {
      "source": "DIGITIMES",
      "url": "https://www.digitimes.com/...",
      "note": "补充了设备细分品类数据"
    }
  ],
  "related_ids": ["2026-06-30-semi-memory-equipment-followup"],
  "review_note": "初始报道为SEMI官方口径，后续DIGITIMES补充了DRAM/NAND设备细分占比"
}
```

### 执行优先级

1. 新搜索到一条情报 → 先在现有 `records` 中查 `url` 是否已存在。
2. `url` 已存在 → 对比 `title`、`summary`、`source` 是否完全相同。
3. 完全相同 → 删除新条，写 `dedupe_note`。
4. 同一事件、不同来源/细节 → 合并到现有条目的 `related_sources`，不新增独立记录。
5. 同一事件、时间进展更新 → 新增记录，但 `related_ids` 互相关联，旧条不删。

### 一句话给执行者

**只自动删除 URL 或核心事实完全重复的新闻；凡是来源、数字、市场反应、时间进展有差异的，都不要删，改为合并或标记关联。**

## 输出
- 仓库：`Jareddeng/memory-visualization-dashboard`
- 文件：`content/intel/clawbot_intel.json`
- 使用仓库中的 `batch_restore.py` 脚本写入
- 遵循 `docs/news-intel-schema.md` 中的 schema
- **写入前必须校验枚举字段**：`impact` / `reaction_type` / `pricing_status` / `horizon` / `confidence` / `action` 只能用 schema 中明确列出的值，不允许发明新值
- 提交信息：`Intel: update YYYY-MM-DD intelligence records (N new)`
- **写入 JSON 后，本地运行 `node scripts/generate-data.mjs` 验证通过后再 push**，避免构建失败