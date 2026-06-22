# 存储行业可视化看板

一个由静态数据驱动的存储行业看板，覆盖 DRAM/NAND 价格、三大存储厂商股价、HBM4 长协谈判、扩产计划和每日深度报告。

## 本地运行

```powershell
npm install
npm run generate:data
npm run dev
```

## 数据更新

- 价格数据放在 `data/raw/prices/*.csv`，字段为 `date,category,market_type,spec,price,unit,source,note`。
- 当前仓库里的 Excel 文件会被脚本尝试读取；若表内没有可识别日期/价格列，则跳过。
- 深度报告放在 `content/reports/YYYY-MM-DD.md`，clawbot 可通过 PR 新增报告。
- HBM4 和扩产计划放在 `content/trackers/*.json`。

GitHub Actions 每天北京时间 08:30 和 18:30 运行，生成 `data/processed/*.json` 并部署到 GitHub Pages。
