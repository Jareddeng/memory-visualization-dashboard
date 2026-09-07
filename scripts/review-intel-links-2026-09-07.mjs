import fs from 'node:fs';
import { intelUrlKey, isArticleUrl, assertUniqueIntelUrls } from '../src/intel-quality.mjs';
import rules from '../src/intel-duplicate-rules.mjs';
const file = 'content/intel/clawbot_intel.json';
const archive = 'data/archive/intel/repair-2026-09-07';
const raw = JSON.parse(fs.readFileSync(file));
const pendingFile = `${archive}/pending.json`;
const pending = JSON.parse(fs.readFileSync(pendingFile));
const actions = [];
let records = raw.records;
function quarantine(id, reason) {
  const record = records.find(r => r.id === id);
  if (!record) return;
  pending.records.push({ ...record, review_reason: reason });
  records = records.filter(r => r.id !== id);
  actions.push({ action: 'pending', id, url: record.url, reason });
}
function combine(fragment, keepId, title, summary, date) {
  const group = records.filter(r => r.url.includes(fragment));
  const keep = group.find(r => r.id === keepId);
  if (!keep) throw new Error('Missing reviewed canonical record: ' + keepId);
  const duplicates = group.filter(r => r !== keep).map(r => r.id);
  rules.push({ keep: keep.id, duplicates, reason: '核对原文后，按一篇文章一条情报归并；各原始记录见 before.json' });
  records = records.filter(r => !duplicates.includes(r.id));
  Object.assign(keep, { title, summary, ...(date ? { date } : {}) });
  actions.push({ action: 'merge_article', keep: keepId, duplicates, url: keep.url, title, summary, date });
}

combine('samsung-and-sk-hynix-to-scale-up-memory-production', 'samsung-skhy-scale-production-20260709',
  '三星拟扩大2026年存储产能，SK海力士增加基础设施投资',
  'DCD于2026年1月5日报道：三星拟将2026年产能提高约50%，SK海力士拟将基础设施投资提高至此前计划的四倍以上。文中同时提及三星P5预计2028年运营、SK海力士M15X预计2027年中启用。原库将同一篇旧闻重复记为6月及7月新闻，现统一按原文发布日期归档。', '2026-01-05');
combine('cls.cn/detail/2412290', '2026-06-30-memory-class-action-lawsuit',
  '财联社6月30日早报：存储厂商诉讼、三星投资与存储ETF调仓',
  '该早报行业新闻分别报道三家存储原厂遭集体诉讼、三星宣布2655万亿韩元投资计划（其中半导体集群2030万亿韩元）、Roundhill Memory ETF将兆易创新纳入第八大重仓股。三条信息确实来自同一篇早报，合并为一条来源记录。');
for (const r of [...records].filter(r => /nextwavesinsight.com|seekingalpha.com\/article\/4910441|api.finexus.net\/api\/news\/events\/9c0bb5d0/.test(r.url))) quarantine(r.id, '重复链接对应页面本次未能读取，无法验证标题和正文匹配；不据此断言网址伪造');
quarantine('2026-06-27-nvidia-rubin-shortage-hbm4-delay', 'GlobX原文讨论元器件短缺，未找到量产目标从200万下调至150万的核心数字');
combine('abhs.in/blog/sk-hynix-q1-2026-718', '2026-06-12-sk-hynix-hbm-3yr-backlog',
  'ABHS研究文章讨论SK海力士HBM供给锁定与高利润率',
  'ABHS研究文章讨论HBM供给锁定至2028年及跨三年的需求能见度，并引用约71.8%的利润率。此条为研究文章观点，原财报利润率应以SK海力士官方披露的72%为准。', '2026-06-12');
combine('south-korea-chip-export-volume-falls-yet-revenue-surges-may-dram', '2026-06-11-korea-dram-exports-370pct',
  '韩国5月存储出口量价背离，DDR5涨价与HBM产能倾斜',
  'TrendForce援引KITA：韩国5月DRAM出口186亿美元，同比增369.8%；NAND出口17亿美元，同比增206.8%。同文援引服务器DDR5 16Gb合约价42美元，较一年前6美元上涨7倍，并列出HBM晶圆投入占比2025/2026/2027年底约18%/22%/30%。');
combine('semiconductor-market-surpasses-300bn', '2026-06-10-omdia-semiconductor-market-319b-q1',
  'Omdia：1Q26半导体营收3190亿美元，存储营收环比增长逾80%',
  'Omdia于6月10日披露，1Q26全球半导体营收达3190亿美元，环比增27%；存储营收环比增逾80%，DRAM和NAND合计占半导体营收超过40%。同一报告的两条情报合并。');
combine('20260601-13070', '2026-06-01-trendforce-1q26-dram-97b',
  'TrendForce：1Q26 DRAM行业营收环比增长81%',
  'TrendForce于6月1日发布1Q26 DRAM市场报告，行业营收约970亿美元，环比增长81%，传统DRAM合约价格上涨93%—98%。原库5月6日条目引用了同一篇6月报告，现归并至原文日期。');
combine('digitaltoday.co.kr/en/view/58429', '2026-06-29-computex-2026-memory-shortage-hbm4',
  'Computex 2026存储展望：HBM4竞争与需求超过供给',
  'Digital Today讨论Computex 2026的存储短缺和HBM4供应竞赛，同文援引Shinhan预计2026年DRAM与NAND需求分别增长23.6%与18.1%，高于供给增速2.1及4.7个百分点。');
quarantine('2026-05-19-trendforce-memory-market-551.6b-2026', 'Ampheo正文未找到5516亿/8427亿美元预测，链接不能支撑核心数字');
quarantine('2026-05-15-sk-hynix-hbm-share-54pct', '官方展望正文给出62%出货份额及57%收入份额，不能支持标题54%及NVIDIA订单70%的口径');
quarantine('2026-02-13-sk-hynix-2026-profit-forecast-100t', '链接为1月5日市场展望，未找到所称2月券商利润共识');
quarantine('2026-04-22-sk-hynix-capex-50t-krw-2026', '官方财报只说明投资将显著增加，未披露此条所称50万亿及20%—30%增幅');
quarantine('2026-01-19-samsung-sk-combined-profit-200t', 'Digital Today正文支持Hana/Kiwoom对SK海力士的预测，未找到两家公司合计200万亿的数字');
quarantine('2026-08-14-samsung-hbm4-yield-80', '链接184208的标题和正文实际为英伟达AI服务器涨价，非三星HBM4良率');
const nvidia = records.find(r => r.id === '2026-08-24-nvidia-server-prices-rise-memory');
nvidia.title = '英伟达AI服务器价格因内存成本飙升将上涨超15%';
nvidia.summary = 'CFM于8月24日报道，英伟达已通知部分大型客户，Grace Blackwell和Vera Rubin服务器系统将在明年初出货时涨价，多数情况下超过15%，具体取决于芯片代数和内存配置。';
const outlook = records.find(r => r.id === '2026-04-24-skhynix-market-outlook-hbm4-supercycle');
outlook.date = '2026-01-05';
outlook.summary = 'SK海力士1月5日发布2026年市场展望，引用分析师预计HBM3E约占全年HBM出货量三分之二，HBM4份额逐步增加；公司预计自身HBM份额继续超过50%。';
const earnings = records.find(r => r.id === '2026-04-27-sk-hynix-q1-margin-718');
earnings.date = '2026-04-23'; earnings.title = 'SK海力士1Q26营业利润率72%，季度营收突破50万亿韩元';
earnings.summary = '官方披露1Q26营收52.5763万亿韩元，营业利润37.6103万亿韩元，营业利润率72%，为历史新高。';
for (const id of ['2026-06-30-trendforce-3q26-memory-price-forecast', '2026-06-27-trendforce-smartphone-3q26-muted-peak', '2026-06-05-hbm4-combined-30b-gigabits-target', '2026-05-10-nand-revenue-q1-83.7pct-qoq', '2025-12-01-dram-nand-price-surge-q4']) quarantine(id, '从历史归档恢复的网址本次未能读取；未验证正文，不作为已修复记录发布');
for (const r of [...records]) if (!isArticleUrl(r.url)) quarantine(r.id, '链接为首页、标签/栏目页、行情页或明显占位路径，不能定位新闻原文');
assertUniqueIntelUrls(records);
const initial = JSON.parse(fs.readFileSync(`${archive}/before.json`));
const retained = new Set(records.map(r => r.id));
const pendingIds = new Set(pending.records.map(r => r.id));
const merged = initial.records.filter(r => !retained.has(r.id) && !pendingIds.has(r.id));
fs.writeFileSync(`${archive}/merged.json`, JSON.stringify({ reason: '合并的原始记录，可按ID回溯', records: merged }, null, 2) + '\n');
fs.writeFileSync(`${archive}/link-review.json`, JSON.stringify({ scope: '全部重复URL、历史恢复URL与明显非文章链接；不是全库每条事实审计', actions, corrected: [nvidia, outlook, earnings], totals: { before: initial.records.length, published: records.length, pending: pending.records.length, merged: merged.length } }, null, 2) + '\n');
fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2) + '\n');
fs.writeFileSync(file, JSON.stringify({ ...raw, records }, null, 2) + '\n');
fs.writeFileSync('src/intel-duplicate-rules.mjs', '// Reviewed event identities; do not infer duplicates from title similarity alone.\nexport default ' + JSON.stringify(rules, null, 2) + ';\n');
console.log({ before: initial.records.length, published: records.length, pending: pending.records.length, merged: merged.length });
