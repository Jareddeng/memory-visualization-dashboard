# 产业跟踪模块维护任务指南

## 任务说明
维护网站产业跟踪模块的三个结构化 JSON 文件，只通过 PR 修改，不改前端代码。

## 目标文件
1. `content/trackers/hbm_contracts.json` — HBM 长协锁定状态
2. `content/trackers/expansion_capacity.json` — 三大厂扩产能力变化
3. `content/trackers/industry_map.json` — 产业链图谱

---

## 一、HBM 长协锁定状态

**文件：** `content/trackers/hbm_contracts.json`

**跟踪对象：** SK hynix、Samsung Electronics、Micron

**字段规范：**
- `company`: 公司名称
- `ticker`: 股票代码
- `stance`: 竞争定位（如"领先锁定""追赶放量""扩份额"）
- `stage`: 谈判阶段 — 必须是 `"验证"` / `"报价"` / `"锁量"` / `"签约"` / `"交付"` 之一
- `stage_index`: 阶段序号（1-5，对应上面5个阶段）
- `locked_years`: 锁定的年份范围，如 `"2025-2028+"`
- `locked_capacity`: 锁定产能描述
- `negotiating`: 正在谈判的内容
- `expected_term`: 预计协议年限
- `expected_capacity`: 预计锁定产能描述
- `main_customers`: 主要客户数组
- `confidence`: `"高"` / `"中高"` / `"中"` / `"低"` — 不要用其他值
- `risk`: 风险提示
- `summary`: 一句话总结
- `evidence`: 证据数组，每条包含 `date`（签约/披露日期，不是更新日期）、`label`、`detail`、`source`

**关键规则：**
- 不要把"今天更新日期"当成签约日期
- 签约日期必须是新闻、公告、研报或产业消息披露的日期
- 信息模糊时写"未披露""市场传闻""待验证"，不要编数字
- 每家公司至少保留 2-3 条 evidence
- 所有来源必须可追溯

---

## 二、三大厂扩产能力变化

**文件：** `content/trackers/expansion_capacity.json`

**跟踪对象：** SK hynix、Samsung Electronics、Micron，可扩展 Kioxia、SanDisk、YMTC、CXMT

**字段规范：**
- `company`: 公司名称
- `ticker`: 股票代码
- `region`: 地区
- `products`: 产品数组
- `capacity_metric`: 产能口径说明
- `current_capacity`: 当前产能对象
  - `label`: 标签
  - `value`: 数值（找不到时填 `null`，不要用百分比假装精确）
  - `unit`: 单位
  - `display`: 展示文本
- `target_capacity`: 扩产后产能对象（结构同上）
- `capex`: 资本开支描述（写清楚是年度 capex、项目投资额还是多年累计）
- `timeline`: 时间线
- `bottleneck`: 产能瓶颈
- `confidence`: `"高"` / `"中高"` / `"中"` / `"低"`
- `status`: 当前状态描述
- `evidence`: 证据数组

**关键规则：**
- 能找到 wafer/month 就填 wafer/month，找不到就填 `null`
- 当前产能和目标产能必须区分
- capex 要写清楚口径

---

## 三、产业链图谱

**文件：** `content/trackers/industry_map.json`

**三层结构：**
- 上游：设备、材料、硅片、电子气体、CMP、光刻胶、前驱体
- 中游：存储原厂、先进封装与测试、控制器、模组
- 下游：AI 云资本开支、服务器整机、PC/手机/汽车/工业终端

**每个 node 字段：**
- `name`: 公司名
- `homepage`: 公司介绍页（优先 About/Company Profile 页面）
- `logo_url`: logo 路径 — 优先 `./assets/logos/xxx.png`，没有时用 `https://logo.clearbit.com/domain.com`
- `region`: 地区
- `role`: 角色描述
- `ticker`: 股票代码（可选）
- `note`: 备注（可选）

**关键规则：**
- 官网优先跳到公司介绍页，不是普通首页
- 不要用非官方站点替代官网
- 不确定 logo 时不要乱抓，先用 favicon 或留给人工确认

---

## 搜索策略

### HBM 长协搜索
- `"SK hynix HBM contract NVIDIA long-term agreement 2026"`
- `"Samsung HBM supply agreement NVIDIA 2026"`
- `"Micron HBM contract 2026 2027"`
- `"HBM4 supply agreement negotiation 2026"`
- `"SK hynix HBM locked capacity 2026"`

### 扩产搜索
- `"SK hynix capacity expansion HBM 2026 capex"`
- `"Samsung semiconductor capex 2026 HBM"`
- `"Micron Idaho Japan expansion HBM 2026"`
- `"DRAM wafer capacity 2026 2027"`
- `"memory fab expansion Korea 2026"`

### 产业链搜索（需要新增公司时）
- 按细分领域搜索：设备商、材料商、封装厂、控制器厂商等

---

## PR 要求

每次 PR 必须说明：
- 更新了哪些文件
- 新增或修改了哪些公司
- 每条关键数据的来源
- 哪些是确认的，哪些是待验证的
- 是否有历史字段被修正
- 是否存在无法核实的内容

**提交前必须运行：**
```bash
npm run generate:data
npm run validate:data
npm run build
```

**禁止事项：**
- 不要改 `src/main.tsx` 或 `src/styles.css`
- 不要提交 `dist/`
- 不要提交 `public/data/processed/`（除非仓库规则明确要求）
- 不要编造产能、签约年份、客户名称
- 不要把新闻转载日期当成事件发生日期
- 不要把公司首页错填成相似域名

---

## 冷启动必须遵守的枚举值

- `stage`: `"验证"` / `"报价"` / `"锁量"` / `"签约"` / `"交付"`
- `confidence`: `"高"` / `"中高"` / `"中"` / `"低"` — 不要用 `medium`、`high` 等英文
- `impact`（情报库）：`bullish` / `bearish` / `neutral`
- `reaction_type`（情报库）：`instant` / `undervalued` / `sentiment` / `archive`

**写入 JSON 后，本地运行 `node scripts/generate-data.mjs` 验证通过后再 push。**
