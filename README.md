# Market Intel · 多资产研究中枢

一个由静态数据驱动的多资产研究网站，整合科技产业、A 股、美股和宏观经济的行情、指标、研报观点与新闻情报。从存储行业看板扩展而来，保留产业深度跟踪，并支持跨板块搜索和图表定位。

**在线访问：[多资产研究中枢](https://jareddeng.github.io/memory-visualization-dashboard/)**

## 研究板块

| 板块 | 主要内容 |
| --- | --- |
| 科技 | DRAM / NAND 价格、存储厂商股价、HBM 与扩产跟踪、机构图表、深度报告和新闻情报 |
| A 股 | 上证指数、沪深300、科创50、中证1000近一年走势；沪深300全收益与二级债基对比；期权报价、中证1000年化基差、前5% / 10%拥挤度及滚动三年分位数；研报观点归档与历史倾向 |
| 美股 | 纳指、标普500、道琼斯近一年走势；MOVE / VIX 股债波动率；10年期美债收益率与标普500表现对比（收益率轴反向） |
| 宏观 | CPI、非农等最新指标与 TMF 行情；美债与政策利率；按美国宏观 / 中国宏观分组的市场图表；按月归档的机构图表；宏观发布日历与券商点评 |

宏观数据点评按**数据发布日期**挂接日历，明确数据所属月份或季度，独立记录点评整理时间。正文以数据速览、核心观点中的共识与分歧、可点击的研报引用为主，支持后续补充和修订。

## 数据与内容更新

### EDB 总表

日常更新使用以下固定工作簿，覆盖源文件后重新生成数据，无需逐次修改网页：

| 文件 | 用途 |
| --- | --- |
| `edb_data/科技-总表.xlsx` | 存储价格等科技指标 |
| `edb_data/A股-总表.xlsx` | 期权报价、年化基差、拥挤度及股债对比等 A 股数据 |
| `edb_data/A股-每日拥挤度数据.xlsx` | 每日拥挤度历史数据 |
| `edb_data/宏观-总表.xlsx` | 美国就业、通胀、利率及中国社融、货币、贷款等宏观指标 |
| `edb_data/美股-总表.xlsx` | 美国股债波动率与股债表现 |

- 保持文件名、子表名、列名和指标口径稳定；工作簿公式应先在数据来源端刷新并保存缓存值。
- 更新完整历史序列时，以确认过的新版本为准；历史修订需说明日期范围和原因，不手工填补缺失行情。
- 存储价格中的非正数视为未更新，不覆盖有效价格；其他指标按各自规则处理，不能统一把所有 `0` 当作缺失。
- 原始价格也支持 `data/raw/prices/*.csv`，字段为 `date,category,market_type,spec,price,unit,source,note`。可选远程来源配置使用环境变量 `PRICE_SOURCE_URLS`，优先采用授权数据接口。
- 生成结果位于 `data/processed/` 和 `public/data/processed/`。自动化内容 PR 默认只提交源文件，不提交构建产物或自动生成的数据，除非维护者明确要求。

### 行情与部署

GitHub Actions 在推送到 `main`、手动触发，以及每天北京时间 **08:30、18:30** 时运行，拉取行情、生成数据、校验宏观点评、构建并发布到 GitHub Pages。

指数和股票趋势展示近一年已完成交易日的数据；接口不可用时按脚本规则回退到已有数据。网站不是实时行情终端，实际更新日期以页面标注为准。定时构建不会自动刷新本地 Wind 工作簿，EDB 仍需更新源文件并提交。

### 研究内容

| 内容 | 位置 / 维护规范 |
| --- | --- |
| 宏观日历 | `public/data/macro-calendar.json` |
| 宏观数据点评 | `content/macro-commentary/*.json`，见[宏观数据点评维护](docs/macro-calendar.md) |
| A 股研报观点 | 见[A 股研报观点规范](docs/a-share-research-views.md) |
| 深度报告 | `content/reports/YYYY-MM-DD.md` |
| 产业跟踪与机构图表 | `content/trackers/*.json` |
| 新闻情报 | 见[新闻情报字段规范](docs/news-intel-schema.md)和[任务指南](docs/news-intel-task-guide.md) |

引用应保留机构、原标题和日期；有核实过的原文链接时直接关联引用，不上传研报原件。

## 本地运行

使用 Node.js 24（与部署环境一致）：

```powershell
npm ci
npm run generate:data
npm run dev
```

浏览器访问终端输出的本地地址。仅预览已有数据时，可省略 `generate:data`。

校验与生产构建：

```powershell
npm run validate:data
node scripts/validate-macro-commentary.mjs
npm run build
```

预览构建后的静态站点：

```powershell
npm run preview:static
```

打开 `http://localhost:5173/`，预览期间保持该终端运行。

## 自动化协作

Clawbot 等自动化助手通过独立分支和 PR 提交，一次更新一类内容，不混入其他任务的修改。宏观点评补充到原事件文件，保留 `eventId`，更新整理日期并同步检查引用编号；合并后等待部署成功才算上线。

- [Clawbot PR 协议](docs/clawbot-pr-protocol.md)：分支、提交与 PR 要求。
- 自动化更新前读取 `clawbot.edb.config.json` 和[本地 Clawbot 更新指南](docs/local-clawbot-update-guide.md)；其中旧版分散 EDB 文件清单仅作历史参考，当前总表入口以上表及导入脚本为准。
- [宏观数据点评维护](docs/macro-calendar.md)：事件匹配、字段、修订与校验要求。
- [网站修改约定](docs/website-change-guidelines.md)：修改页面前必读。

技术栈：React、TypeScript、Vite、ECharts；Node.js 脚本导入 XLSX / CSV / JSON，GitHub Actions 构建，GitHub Pages 托管。

## 使用说明

本网站用于研究学习和信息整理，不构成投资建议。数据和机构观点具有时效性，可能存在延迟、遗漏或错误，请结合原始来源核实；引用内容的版权归原作者及机构所有。
