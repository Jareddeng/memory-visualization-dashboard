# 情报库修复记录

基线：主分支提交 `8d4c338`。修复在独立目录完成，未覆盖旧工作目录的未提交改动。

651 条源记录逐条保留去向：472 条留在发布库，27 条归并，152 条待核实。发布库的 ID、规范化 URL 均唯一，无空链接及已识别的首页、栏目、标签、行情页链接。

## 原因与改动

旧清理脚本根据字符集合相似度删除记录，并将共用 URL 的其余记录链接清空；生成脚本还会静默忽略非法记录。本次删除清空 URL 的逻辑，统一输入校验，阻止未经核对的重复 URL 入库，错误明确报出。前端新增及编辑同样检查链接，旧本地编辑不再覆盖远端已有 URL。

先从历史归档恢复了 26 个候选链接，再补入 3 个官方链接；随后按用户要求重新核查，无法读取或正文不匹配的候选链接未留在发布库。因此“恢复29条”是中间处理数，不是最终全部验证通过的数目。

## 原文核查实例

- 三星 HBM4 良率记录实际指向[英伟达服务器涨价新闻](https://www.chinaflashmarket.com/a/184208)，已移入待核实，正确的英伟达条目按原文更正为超过15%。
- [DCD扩产报道](https://www.datacenterdynamics.com/en/news/samsung-and-sk-hynix-to-scale-up-memory-production-capacity-in-2026-to-meet-ai-demand/)发表于1月5日，原库多次以6月、7月日期收录，已合并并纠正日期。
- [财联社6月30日早报](https://www.cls.cn/detail/2412290)确实同时包含诉讼、三星投资和ETF调仓，合并为一条早报记录。
- [TrendForce韩国出口报道](https://www.trendforce.com/news/2026/06/11/news-south-korea-chip-export-volume-falls-yet-revenue-surges-may-dram-370-nand-207/)同时包含出口、DDR5价格、HBM投入占比，四条摘录合并。
- 新补链接来自[SK海力士官方](https://news.skhynix.com/en/groundbreaking-ceremony-in-indiana/)、[NVIDIA官方](https://blogs.nvidia.com/blog/nvlink-fusion-nvhbm-custom-high-bandwidth-memory/)和[Primemas官方](https://www.primemas.com/company/press.php?category=0&code=press&idx=103&page=1&ptype=view)。

## 追溯与范围

`data/archive/intel/repair-2026-09-07/` 下：

- `before.json`：651条修复前完整快照。
- `pending.json`：152条待核实记录，保留已有链接和问题原因（没有链接的记录等待补证）。
- `merged.json`：27条已归并的原始记录。
- `link-review.json`：最终链接核查、合并、更正及数量。
- `audit.json`：第一阶段历史链接恢复记录，须结合最终核查阅读。

本次核查覆盖重复 URL、历史恢复链接、明确重复事件及明显非文章链接，不等于对剩余472条的全部事实作出真实性背书。无法访问页面记为“待核实”，没有仅凭访问失败判定为伪造。待核实记录应查到匹配的原文后再重新收录。

## 验证

`node --test scripts/intel-quality.test.mjs`：8项回归检查，包括重复URL拦截、空链接保护、幂等性及651条原始记录去向完整性。另运行 `npm run validate:data`、`npm run generate:data`、`npm run build`。

本地修复需通过PR合并及GitHub Pages部署后，线上页面才会更新。
