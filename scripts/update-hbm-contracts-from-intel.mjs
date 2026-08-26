import fs from "node:fs";

const trackerPath = "content/trackers/hbm_contracts.json";
const tracker = JSON.parse(fs.readFileSync(trackerPath, "utf8"));
const byCompany = Object.fromEntries(tracker.companies.map((company) => [company.company, company]));

tracker.updated_at = "2026-08-21";
tracker.source = "Based on clawbot news library through 2026-08-21; HBM/DRAM sold-out and LTA/SCA tracker";

Object.assign(byCompany["SK Hynix"], {
  stance: "领先锁定",
  stage: "签约",
  stage_note: "2027 年 DRAM/HBM 产能分配已完成；2028-2030 仍按核心 AI 客户长期承诺/高锁定跟踪",
  stage_index: 4,
  locked_years: "2025-2030",
  locked_capacity: "2026-2027 DRAM/HBM 产能按新闻库口径已售罄；2028-2030 为 NVIDIA 等核心客户长期承诺和高比例锁定，不等同全部售罄",
  capacity_lock_segments: [
    {
      start: 2025,
      end: 2027,
      status: "soldout",
      label: "已售罄",
      note: "新闻库 2026-08-07/08 多条记录显示三巨头 DRAM/HBM 产能售罄至 2027 年底；SK 海力士 2026 年所有 DRAM/NAND/HBM 亦已售罄。",
    },
    {
      start: 2028,
      end: 2030,
      status: "full",
      label: "高锁定",
      note: "2030 以后短缺判断与长期协议提供订单能见度，但新闻库未显示 2028-2030 已全部售罄，因此按高锁定处理。",
    },
  ],
  negotiating: "2028-2030 HBM4 / HBM4E 供货价格、份额与共同投资条款；2027 年产能分配已完成，不再放入正在谈范围",
  expected_term: "3-5年",
  expected_capacity: "2027 年配货紧张且客户获配约初始需求 60-70%；Vera Rubin HBM4 份额仍按 60-70% 跟踪，2028-2030 为高锁定而非售罄",
  main_customers: ["NVIDIA", "AWS", "OpenAI/Stargate", "Google", "大型云厂商"],
  confidence: "高",
  risk: "长期协议可能限制短期涨价弹性；CoWoS/先进封装配套、HBM4 良率爬坡与龙仁集群建设进度仍需跟踪",
  summary: "SK 海力士 2026-2027 DRAM/HBM 产能按新闻库口径已售罄；2028-2030 维持 NVIDIA 等核心客户高锁定/长期承诺跟踪。",
  evidence: [
    {
      date: "2026-08-07",
      label: "三巨头 2027 年 DRAM/HBM 产能已售罄",
      detail: "新闻库记录称三星、SK海力士和美光已完成 2027 年全年产能分配谈判，DRAM 和 HBM 产能均已提前售罄，多数客户获配约初始请求的 60-70%。",
      source: "财联社",
      url: "https://www.cls.cn/detail/2448129",
    },
    {
      date: "2026-08-15",
      label: "SK 海力士称短缺或延续至 2030 年以后",
      detail: "新闻库记录称 SK 海力士 CEO 表示存储芯片供应紧张可能持续至 2030 年以后，且 2026 年所有 DRAM、NAND 和 HBM 产能已售罄。",
      source: "Tech-Insider / Bloomberg 摘要",
      url: "",
    },
    {
      date: "2026-08-14",
      label: "2027 年或为最严重存储荒",
      detail: "SK 集团会长表示核心客户需求接近原订单两倍，2027 年 AI 半导体需求预计较 2026 年增长 60%-100%，产能扩张需四到五年。",
      source: "财联社/快科技",
      url: "https://finance.sina.com.cn/roll/2026-08-14/doc-ininhait2949038.shtml",
    },
    {
      date: "2026-08-08",
      label: "3-5 年长期协议重塑周期",
      detail: "三巨头正与下游客户签订 3-5 年长期供应合同，约定保底价格和照付不议条款。",
      source: "新浪财经",
      url: "https://finance.sina.cn/stock/jdts/2026-08-08/detail-inimqptt9796775.d.html",
    },
  ],
  locked_until: 2030,
});

Object.assign(byCompany["Samsung Electronics"], {
  stance: "追赶锁量",
  stage: "签约",
  stage_note: "2027 年 DRAM/HBM 产能分配已完成；已与 AMD 签署 HBM4 MOU，并推进 NVIDIA/云厂商长协",
  stage_index: 4,
  locked_years: "2025-2030",
  locked_capacity: "2026-2027 DRAM/HBM 产能按新闻库口径已售罄；三星计划将 60%-70% 产能纳入长协，并与前五大数据中心运营商签署五年协议",
  capacity_lock_segments: [
    {
      start: 2025,
      end: 2027,
      status: "soldout",
      label: "已售罄",
      note: "新闻库 2026-08-07/08 记录显示三巨头 DRAM/HBM 售罄至 2027 年底。",
    },
    {
      start: 2028,
      end: 2030,
      status: "full",
      label: "高锁定",
      note: "三星五年长协和 60%-70% 产能纳入长协提供高锁定能见度，但不是全部售罄。",
    },
  ],
  negotiating: "2028-2030 NVIDIA / AMD / 云厂商 HBM4 份额、价格与交付节奏；AMD MI455X 已进入战略合作/主要供应资格",
  expected_term: "3-5年",
  expected_capacity: "2027 年 DRAM/HBM 已完成分配；五年协议覆盖 60%-70% 产能，AMD MI455X HBM4 供应资格提升锁量确定性",
  main_customers: ["NVIDIA", "AMD", "OpenAI", "全球前五大数据中心运营商", "云厂商"],
  confidence: "中高",
  risk: "HBM4 良率与交付稳定性、NVIDIA/AMD 份额兑现、长协覆盖比例与真实锁价条款仍需继续验证",
  summary: "Samsung 从单点 OpenAI/NVIDIA 验证更新为 2027 售罄 + 60%-70% 产能长协 + AMD MI455X HBM4 主要供应资格的追赶锁量状态。",
  evidence: [
    {
      date: "2026-08-07",
      label: "三巨头 2027 年 DRAM/HBM 产能已售罄",
      detail: "新闻库记录称三星、SK海力士和美光已完成 2027 年全年产能分配谈判，DRAM 和 HBM 产能均已提前售罄。",
      source: "财联社",
      url: "https://www.cls.cn/detail/2448129",
    },
    {
      date: "2026-08-08",
      label: "三星计划 60%-70% 产能纳入长协",
      detail: "新闻库记录称三星计划将 60%-70% 产能纳入长协，并已收到约定预付款总额约四分之一。",
      source: "经济观察网",
      url: "",
    },
    {
      date: "2026-08-08",
      label: "前五大数据中心运营商五年协议",
      detail: "新闻库记录称三星已与全球前五大数据中心运营商签署五年协议，覆盖其 60%-70% 产能。",
      source: "MarketWise",
      url: "https://marketwise.com/investing/why-micron-sk-hynix-samsung-stock-is-tumbling-during-memory-shortage/",
    },
    {
      date: "2026-08-15",
      label: "三星与 AMD 签署 HBM4 MOU",
      detail: "三星与 AMD 签署 HBM4 战略合作备忘录，将成为 AMD Instinct MI455X GPU 的主要 HBM4 供应商。",
      source: "Silicon Analysts",
      url: "",
    },
  ],
  locked_until: 2030,
});

Object.assign(byCompany["Micron Technology"], {
  stance: "SCA锁定",
  stage: "签约",
  stage_note: "2026 HBM 已售罄；2027 DRAM/HBM 分配完成；16 份五年期 SCA 已签，进入签约锁量阶段",
  stage_index: 4,
  locked_years: "2025-2030",
  locked_capacity: "2026-2027 DRAM/HBM 产能按新闻库口径已售罄；16 份五年期 SCA 合计约 1000 亿美元保底收入，为 2028-2030 提供高锁定能见度",
  capacity_lock_segments: [
    {
      start: 2025,
      end: 2027,
      status: "soldout",
      label: "已售罄",
      note: "美光 2026 HBM 已售罄；新闻库 2026-08-07/08 记录显示三巨头 DRAM/HBM 售罄至 2027 年底。",
    },
    {
      start: 2028,
      end: 2030,
      status: "full",
      label: "高锁定",
      note: "16 份五年期 SCA 提供高锁定能见度，但未等同为全部产能售罄。",
    },
  ],
  negotiating: "2028-2030 HBM4 / AI DRAM 份额、价格与 SCA 扩展；Google 等客户正在整合云业务和终端内存订单谈判",
  expected_term: "3-5年",
  expected_capacity: "2027 年产能完成分配；16 份五年期 SCA 约 1000 亿美元保底收入、约 220 亿美元现金存款和信用证",
  main_customers: ["NVIDIA", "Broadcom", "Google", "北美云厂商"],
  confidence: "高",
  risk: "HBM 份额仍低于韩厂；SCA 锁价可能限制现货涨价弹性；2027-2028 产能爬坡和先进封装交付仍需验证",
  summary: "Micron 从“2026 售罄/谈判中”更新为“2027 售罄 + 16 份五年 SCA 签约”的高锁定状态，2028-2030 作为高锁定而非售罄处理。",
  evidence: [
    {
      date: "2026-08-08",
      label: "美光 2026 年 HBM 产能全部售罄",
      detail: "美光管理层确认 2026 年全年 HBM 供应已全部售罄，价格和数量均已敲定。",
      source: "经济观察网",
      url: "http://www.eeo.com.cn/2026/0808/990475.shtml",
    },
    {
      date: "2026-08-07",
      label: "三巨头 2027 年 DRAM/HBM 产能已售罄",
      detail: "新闻库记录称三星、SK海力士和美光已完成 2027 年全年产能分配谈判，DRAM 和 HBM 产能均已提前售罄。",
      source: "财联社",
      url: "https://www.cls.cn/detail/2448129",
    },
    {
      date: "2026-08-08",
      label: "美光 16 份五年期 SCA",
      detail: "新闻库记录称美光已签 16 份五年期战略客户协议，按保底价计算合计约 1000 亿美元，将收到约 220 亿美元现金存款和信用证。",
      source: "经济观察网 / 新浪财经摘要",
      url: "https://finance.sina.cn/stock/jdts/2026-08-08/detail-inimqptt9796775.d.html",
    },
    {
      date: "2026-08-18",
      label: "Google 整合内存订单谈判",
      detail: "Google 正在与 Micron、三星和 SK 海力士谈判时合并其云业务和智能手机内存芯片订单，以增强采购议价能力。",
      source: "Mobile World Live",
      url: "https://www.mobileworldlive.com/google/google-to-pull-pixel-production-from-china/",
    },
  ],
  locked_until: 2030,
});

fs.writeFileSync(trackerPath, `${JSON.stringify(tracker, null, 2)}\n`, "utf8");
