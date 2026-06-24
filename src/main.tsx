import React from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, Database, RefreshCw, Trash2 } from "lucide-react";
import * as echarts from "echarts/core";
import { DataZoomComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import "./styles.css";

echarts.use([DataZoomComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent, LineChart, CanvasRenderer]);

type PricePoint = {
  date: string;
  price: number;
  source: string;
  note?: string;
};

type PriceSeries = {
  spec: string;
  unit: string;
  points: PricePoint[];
};

type PricePayload = Record<"DRAM" | "NAND", Record<"spot" | "contract_avg", { series: PriceSeries[] }>>;

type StockPoint = {
  date: string;
  previous_date?: string | null;
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  price_basis?: string;
  close: number;
  change: number;
  change_pct: number;
};

type StockPayload = {
  latest: StockPoint[];
  history: StockPoint[];
  source: string;
  generated_at?: string;
  warning?: string;
};

type Report = {
  slug: string;
  title: string;
  date: string;
  rating: string;
  risk_level: string;
  summary: string;
  sources: string[];
  body: string;
  mindmap?: MindmapPayload | null;
};

type MindmapNode = {
  title: string;
  children?: MindmapNode[];
};

type MindmapPayload = {
  title: string;
  source_file: string;
  format: string;
  tree: MindmapNode;
};

type TrackerPayload = {
  hbm4_negotiations?: Array<{
    date: string;
    title: string;
    status: string;
    detail: string;
    source: string;
  }>;
  expansion_plans?: Array<{
    company: string;
    region: string;
    plan: string;
    timeline: string;
    status: string;
    source: string;
  }>;
  industry_map?: {
    updated_at?: string | null;
    source?: string;
    layers?: Array<{
      name: string;
      description?: string;
      nodes: Array<{
        name: string;
        region?: string;
        role?: string;
        note?: string;
      }>;
    }>;
  };
};

type Metadata = {
  generated_at: string;
  price_points: number;
  stock_points: number;
  latest_report_date: string | null;
  notes: string[];
};

type AppData = {
  prices: PricePayload;
  stocks: StockPayload;
  reports: Report[];
  trackers: TrackerPayload;
  intel: IntelRecord[];
  metadata: Metadata;
};

type PageKey = "overview" | "markets" | "industry" | "reports" | "intel";

type IntelRecord = {
  id: string;
  type: string;
  impact: "bullish" | "bearish" | "neutral";
  date: string;
  title: string;
  product: string;
  source: string;
  summary: string;
  importance?: "S" | "A" | "B" | "C";
  reaction_type?: "instant" | "undervalued" | "sentiment" | "archive";
  pricing_status?: "unpriced" | "partial" | "priced" | "overpriced" | "failed";
  horizon?: "intraday" | "1d" | "1w" | "1m" | "1q" | "longer";
  transmission_path?: string;
  confidence?: "high" | "medium" | "low";
  action?: "alert" | "watch" | "deep_tracking" | "archive";
  review_date?: string;
};

type ImpactFilter = "all" | IntelRecord["impact"];
type TimeRange = "all" | "7d" | "30d" | "90d";
type SearchItem = {
  type: string;
  title: string;
  detail: string;
  date?: string;
  haystack: string;
  target: {
    page: PageKey;
    reportSlug?: string;
  };
};

type PriceSnapshot = {
  label: string;
  spec: string;
  date: string;
  price: number;
  unit: string;
  change: number;
  changePct: number;
};

const INTEL_STORAGE_KEY = "storage-dashboard-intel-records-v1";

const directionOptions = [
  { value: "bullish", label: "利多", detail: "可能提升盈利预期、估值预期或市场情绪" },
  { value: "bearish", label: "利空", detail: "可能压制盈利预期、估值预期或市场情绪" },
  { value: "neutral", label: "中性", detail: "暂时没有明确方向、影响较弱，或对不同环节/周期影响方向不一致" },
] as const;

const importanceOptions = [
  { value: "S", label: "S级：核心基本面变化", detail: "可能改变盈利、订单、供需、价格、产能、政策或竞争格局" },
  { value: "A", label: "A级：强预期变化", detail: "不一定立即改变利润，但可能明显改变市场预期" },
  { value: "B", label: "B级：情绪或主题变化", detail: "主要影响短期情绪、市场热度或主题交易" },
  { value: "C", label: "C级：低相关信息", detail: "信息价值有限，对投资判断和交易跟踪帮助较小" },
] as const;

const reactionTypeOptions = [
  { value: "instant", label: "即时催化型", detail: "信息明确、影响直接，适合盘中提醒和快速跟踪" },
  { value: "undervalued", label: "重要未定价型", detail: "重要但尚未充分反应，重点跟踪预期差和传导滞后" },
  { value: "sentiment", label: "情绪交易型", detail: "基本面影响有限，但可能触发短期主题或资金关注" },
  { value: "archive", label: "普通归档型", detail: "信息价值较低，主要作数据库留存" },
] as const;

const pricingStatusOptions = [
  { value: "unpriced", label: "未反应", detail: "相关资产价格基本没有变化，新闻可能尚未被市场关注" },
  { value: "partial", label: "部分反应", detail: "部分市场或部分标的已经反应，但传导尚未完成" },
  { value: "priced", label: "已反应", detail: "主要相关资产已经出现较明显反应" },
  { value: "overpriced", label: "过度反应", detail: "市场反应可能超过新闻本身能够解释的范围" },
  { value: "failed", label: "反应失败", detail: "新闻理论上偏利多或利空，但市场并未按预期方向反应" },
] as const;

const horizonOptions = [
  { value: "intraday", label: "盘中" },
  { value: "1d", label: "1日" },
  { value: "1w", label: "1周" },
  { value: "1m", label: "1个月" },
  { value: "1q", label: "1季度" },
  { value: "longer", label: "更长" },
] as const;

const confidenceOptions = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
] as const;

const actionOptions = [
  { value: "alert", label: "盘中提醒" },
  { value: "watch", label: "加入观察池" },
  { value: "deep_tracking", label: "深度跟踪" },
  { value: "archive", label: "归档" },
] as const;

function useJson<T>(url: string) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const separator = url.includes("?") ? "&" : "?";
    fetch(`${url}${separator}v=${Date.now()}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json() as Promise<T>;
      })
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [url]);

  return { data, error };
}

function useDashboardData() {
  const prices = useJson<PricePayload>("./data/processed/prices.json");
  const stocks = useJson<StockPayload>("./data/processed/stocks.json");
  const reports = useJson<{ reports: Report[] }>("./data/processed/reports.json");
  const trackers = useJson<TrackerPayload>("./data/processed/trackers.json");
  const intel = useJson<{ records: IntelRecord[] }>("./data/processed/intel.json");
  const metadata = useJson<Metadata>("./data/processed/metadata.json");

  const error = prices.error || stocks.error || reports.error || trackers.error || intel.error || metadata.error;
  const loading = !prices.data || !stocks.data || !reports.data || !trackers.data || !intel.data || !metadata.data;

  return {
    data:
      prices.data && stocks.data && reports.data && trackers.data && intel.data && metadata.data
        ? {
            prices: prices.data,
            stocks: stocks.data,
            reports: reports.data.reports,
            trackers: trackers.data,
            intel: intel.data.records,
            metadata: metadata.data,
          }
        : null,
    loading,
    error,
  };
}

function Chart({ option }: { option: echarts.EChartsCoreOption }) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!ref.current) return undefined;
    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chart.setOption(option);
    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [option]);

  return <div className="chart" ref={ref} />;
}

function makePriceOption(title: string, payload: { series: PriceSeries[] }): echarts.EChartsCoreOption {
  const series = payload.series.map((item) => ({
    name: item.spec,
    type: "line",
    smooth: true,
    showSymbol: item.points.length <= 120,
    symbolSize: item.points.length <= 120 ? 5 : 0,
    emphasis: { focus: "series" },
    data: item.points.map((point) => ({
      value: [point.date, point.price],
      source: point.source,
      unit: item.unit,
    })),
  }));

  return {
    color: ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#7c3aed"],
    title: { text: title, left: 8, top: 0, textStyle: { fontSize: 15, fontWeight: 700, color: "#172033" } },
    tooltip: {
      trigger: "axis",
      confine: true,
      formatter(params: unknown) {
        const rows = Array.isArray(params) ? params : [params];
        return rows
          .map((row: any, index) => {
            const date = row.value?.[0] ?? "";
            const price = row.value?.[1] ?? "";
            const unit = row.data?.unit ?? "";
            const source = row.data?.source ?? "";
            const head = index === 0 ? `<strong>${date}</strong><br/>` : "";
            return `${head}${row.marker}${row.seriesName}: ${price} ${unit}<br/>来源：${source}`;
          })
          .join("<br/>");
      },
    },
    legend: {
      top: 28,
      left: 8,
      right: 8,
      itemWidth: 12,
      itemHeight: 7,
      itemGap: 8,
      textStyle: { color: "#526071", fontSize: 11 },
    },
    grid: { left: 52, right: 22, top: 82, bottom: 78 },
    xAxis: { type: "time", axisLabel: { color: "#607086" }, axisLine: { lineStyle: { color: "#d8e0ea" } } },
    yAxis: {
      type: "value",
      scale: true,
      axisLabel: { color: "#607086" },
      splitLine: { lineStyle: { color: "#edf1f6" } },
    },
    dataZoom: [
      {
        type: "slider",
        xAxisIndex: 0,
        height: 26,
        bottom: 18,
        borderColor: "#d8e0ea",
        fillerColor: "rgba(37, 99, 235, 0.12)",
        handleStyle: { color: "#2563eb", borderColor: "#1d4ed8" },
        moveHandleStyle: { color: "#93c5fd" },
        selectedDataBackground: {
          lineStyle: { color: "#2563eb" },
          areaStyle: { color: "rgba(37, 99, 235, 0.14)" },
        },
        textStyle: { color: "#607086" },
      },
      {
        type: "inside",
        xAxisIndex: 0,
        filterMode: "none",
      },
    ],
    series,
  };
}

function makeStockTrendOption(stock: StockPoint, history: StockPoint[]): echarts.EChartsCoreOption {
  const points = history.filter((point) => point.ticker === stock.ticker);
  return {
    color: ["#2563eb"],
    title: {
      text: `${stock.name} 近一年日收盘价`,
      left: 8,
      top: 0,
      textStyle: { fontSize: 15, fontWeight: 700, color: "#172033" },
    },
    tooltip: {
      trigger: "axis",
      confine: true,
      formatter(params: unknown) {
        const row = Array.isArray(params) ? (params[0] as any) : (params as any);
        const date = row.value?.[0] ?? "";
        const close = row.value?.[1] ?? "";
        const previousDate = row.data?.previous_date ?? "上一交易日";
        const change = row.data?.change ?? 0;
        const changePct = row.data?.change_pct ?? 0;
        const sign = changePct >= 0 ? "+" : "";
        return `<strong>${date}</strong><br/>${row.marker}${stock.name}: ${close} ${stock.currency}<br/>口径：已完成交易日收盘价<br/>涨跌幅：${sign}${changePct}% (${sign}${change} ${stock.currency})<br/>对比：${previousDate} 收盘<br/>来源：${dataSourceLabel(stock.exchange)}`;
      },
    },
    grid: { left: 54, right: 22, top: 52, bottom: 68 },
    xAxis: { type: "time", axisLabel: { color: "#607086" }, axisLine: { lineStyle: { color: "#d8e0ea" } } },
    yAxis: {
      type: "value",
      scale: true,
      axisLabel: { color: "#607086" },
      splitLine: { lineStyle: { color: "#edf1f6" } },
    },
    dataZoom: [
      {
        type: "slider",
        xAxisIndex: 0,
        height: 24,
        bottom: 16,
        borderColor: "#d8e0ea",
        fillerColor: "rgba(37, 99, 235, 0.12)",
        handleStyle: { color: "#2563eb", borderColor: "#1d4ed8" },
        moveHandleStyle: { color: "#93c5fd" },
        selectedDataBackground: {
          lineStyle: { color: "#2563eb" },
          areaStyle: { color: "rgba(37, 99, 235, 0.14)" },
        },
        textStyle: { color: "#607086" },
      },
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
    ],
    series: [
      {
        name: stock.name,
        type: "line",
        smooth: true,
        showSymbol: false,
        emphasis: { focus: "series" },
        data: points.map((point) => ({
          value: [point.date, point.close],
          previous_date: point.previous_date,
          change: point.change,
          change_pct: point.change_pct,
        })),
      },
    ],
  };
}

function makeOverviewStockOption(stock: StockPoint, history: StockPoint[]): echarts.EChartsCoreOption {
  const points = history.filter((point) => point.ticker === stock.ticker);
  return {
    color: [stock.change_pct >= 0 ? "#16805a" : "#c53d3d"],
    tooltip: {
      trigger: "axis",
      confine: true,
      formatter(params: unknown) {
        const row = Array.isArray(params) ? (params[0] as any) : (params as any);
        const date = row.value?.[0] ?? "";
        const close = row.value?.[1] ?? "";
        const changePct = row.data?.change_pct ?? 0;
        const sign = changePct >= 0 ? "+" : "";
        return `<strong>${date}</strong><br/>${stock.name}: ${close} ${stock.currency}<br/>涨跌幅：${sign}${changePct}%`;
      },
    },
    grid: { left: 8, right: 8, top: 8, bottom: 22 },
    xAxis: { type: "time", axisLabel: { show: false }, axisTick: { show: false }, axisLine: { show: false } },
    yAxis: { type: "value", scale: true, axisLabel: { show: false }, axisTick: { show: false }, axisLine: { show: false }, splitLine: { show: false } },
    series: [
      {
        name: stock.name,
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2.4 },
        areaStyle: { opacity: 0.08 },
        emphasis: { focus: "series" },
        data: points.map((point) => ({
          value: [point.date, point.close],
          change_pct: point.change_pct,
        })),
      },
    ],
  };
}

function App() {
  const { data, loading, error } = useDashboardData();
  const [activePage, setActivePage] = React.useState<PageKey>("overview");
  const [selectedReportSlug, setSelectedReportSlug] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [timeRange, setTimeRange] = React.useState<TimeRange>("all");
  const [intelRecords, setIntelRecords] = useLocalIntelRecords();
  const [captureOpen, setCaptureOpen] = React.useState(false);
  const [editingIntelRecord, setEditingIntelRecord] = React.useState<IntelRecord | null>(null);

  if (error) {
    return (
      <main className="shell">
        <section className="state-panel">
          <AlertTriangle />
          <h1>数据加载失败</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (loading || !data) {
    return (
      <main className="shell">
        <section className="state-panel">
          <RefreshCw className="spin" />
          <h1>正在加载存储行业看板</h1>
        </section>
      </main>
    );
  }

  const latestReport = data.reports[0];
  const selectedReport = data.reports.find((report) => report.slug === selectedReportSlug) ?? latestReport;
  const allIntelRecords = [...data.intel, ...intelRecords];
  const searchResults = query.trim() ? searchDashboard(data, allIntelRecords, query, timeRange) : [];
  const hbmPressure = getHbmPressure(data);
  const priceSnapshots = getPriceSnapshots(data.prices);
  const openSearchResult = (item: SearchItem) => {
    if (item.target.reportSlug) setSelectedReportSlug(item.target.reportSlug);
    setActivePage(item.target.page);
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="主导航">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"></span>
          <div>
            <strong>Storage Intel</strong>
            <span>存储行业数据舱</span>
          </div>
        </div>
        <PageNav activePage={activePage} onChange={setActivePage} />
        <div className="source-status">
          <span className="status-dot"></span>
          <div>
            <strong>Action 生成</strong>
            <span>{formatDateTime(data.metadata.generated_at)}</span>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <label className="time-filter">
            <span>周期</span>
            <select value={timeRange} onChange={(event) => setTimeRange(event.target.value as TimeRange)}>
              <option value="all">全部周期</option>
              <option value="7d">最近7天</option>
              <option value="30d">最近30天</option>
              <option value="90d">最近90天</option>
            </select>
          </label>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索 DRAM、NAND、HBM、报告、产业链、情报"
              type="search"
            />
          </label>
          <div className="topbar-actions">
            <button className="ghost-button" type="button" onClick={() => exportIntelligence(data, allIntelRecords)}>导出情报</button>
            <button className="primary-button" type="button" onClick={() => setCaptureOpen(true)}>新增情报</button>
          </div>
        </header>

        {query.trim() ? <SearchResults results={searchResults} timeRange={timeRange} onOpen={openSearchResult} onClear={() => setQuery("")} /> : null}

        <Hero data={data} latestReport={latestReport} />

        <section className="kpi-grid">
          {priceSnapshots.map((snapshot) => (
            <PriceKpiCard snapshot={snapshot} key={snapshot.label} />
          ))}
          <KpiCard icon={<Database />} label="HBM 供给压力" value={hbmPressure.value} hint={hbmPressure.hint} />
          <KpiCard icon={<Database />} label="晶圆可用产能" value="待接入" hint="等待 EDB 或 clawbot 产能数据源" />
        </section>

        {activePage === "overview" ? <OverviewPage data={data} latestReport={latestReport} intelRecords={allIntelRecords} /> : null}
        {activePage === "markets" ? <MarketsPage data={data} /> : null}
        {activePage === "industry" ? <IndustryPage data={data} /> : null}
        {activePage === "reports" ? (
          <ReportsPage
            latestReport={latestReport}
            reports={data.reports}
            selectedReport={selectedReport}
            onSelectReport={setSelectedReportSlug}
          />
        ) : null}
        {activePage === "intel" ? (
          <IntelPage
            remoteRecords={data.intel}
            localRecords={intelRecords}
            onAdd={() => setCaptureOpen(true)}
            onEdit={(record) => {
              setEditingIntelRecord(record);
              setCaptureOpen(true);
            }}
            onDelete={(id) => setIntelRecords(intelRecords.filter((record) => record.id !== id))}
            onExport={() => exportIntelligence(data, allIntelRecords)}
          />
        ) : null}

        <footer className="disclaimer">
          交易评价与风险提示仅用于行业跟踪和研究记录，不构成投资建议。请结合授权行情、公司公告和自身风险承受能力独立判断。
        </footer>
        {captureOpen ? (
          <IntelCaptureModal
            record={editingIntelRecord}
            onClose={() => {
              setCaptureOpen(false);
              setEditingIntelRecord(null);
            }}
            onSave={(record) => {
              setIntelRecords((current) => (editingIntelRecord ? current.map((item) => (item.id === record.id ? record : item)) : [record, ...current]));
              setCaptureOpen(false);
              setEditingIntelRecord(null);
            }}
          />
        ) : null}
      </main>
    </div>
  );
}

function PageNav({ activePage, onChange }: { activePage: PageKey; onChange: (page: PageKey) => void }) {
  const pages: Array<{ key: PageKey; label: string; detail: string }> = [
    { key: "overview", label: "概览", detail: "关键指标 / 情报" },
    { key: "markets", label: "市场图表", detail: "价格与股价" },
    { key: "industry", label: "产业跟踪", detail: "长协 / 扩产 / 图谱" },
    { key: "reports", label: "报告库", detail: "日报 / 归档 / 导图" },
    { key: "intel", label: "情报库", detail: "新增 / 删除 / 推送" },
  ];
  return (
    <nav className="nav-list" aria-label="看板分区导航">
      {pages.map((page) => (
        <button
          className={activePage === page.key ? "nav-item active" : "nav-item"}
          key={page.key}
          onClick={() => onChange(page.key)}
          type="button"
        >
          <strong>{page.label}</strong>
          <span>{page.detail}</span>
        </button>
      ))}
    </nav>
  );
}

function Hero({ data, latestReport }: { data: AppData; latestReport?: Report }) {
  return (
    <section className="intel-hero">
      <img src="./assets/storage-supply-chain.png" alt="存储产业链视觉图" />
      <div className="hero-overlay">
        <div>
          <p className="eyebrow">DRAM / NAND / HBM / EQUITY / REPORT</p>
          <h1>存储行业可视化看板</h1>
          <p>跟踪价格、股票、长协谈判、扩产计划、产业链图谱和每日深度报告。</p>
        </div>
        <div className="hero-signal">
          <span>最新报告</span>
          <strong>{latestReport?.rating ?? "待更新"}</strong>
          <small>{latestReport?.date ?? formatDateTime(data.metadata.generated_at)}</small>
        </div>
      </div>
    </section>
  );
}

function OverviewPage({
  data,
  latestReport,
  intelRecords,
}: {
  data: AppData;
  latestReport?: Report;
  intelRecords: IntelRecord[];
}) {
  const latestStocks = data.stocks.latest.slice(0, 4);
  const hbmEvents = data.trackers.hbm4_negotiations ?? [];
  return (
    <>
      <section className="overview-market-grid">
        {latestStocks.map((stock) => (
          <OverviewStockCard stock={stock} history={data.stocks.history} key={stock.ticker} />
        ))}
        <section className="panel text-panel overview-radar-panel">
          <div className="panel-header compact">
            <div>
              <p className="section-kicker">Message Radar</p>
              <h2>消息雷达</h2>
            </div>
          </div>
          <MessageRadar records={intelRecords} />
        </section>
      </section>

      <section className="dashboard-grid">
        <section className="panel text-panel">
          <div className="panel-header compact">
            <div>
              <p className="section-kicker">Latest Report</p>
              <h2>最新深度报告</h2>
            </div>
          </div>
          {latestReport ? (
            <article className="analysis-item">
              <strong>{latestReport.title}</strong>
              <p>{latestReport.summary}</p>
              <div className="meta-row">
                <span className="pill neutral">{latestReport.rating}</span>
                <span>{latestReport.date}</span>
                <span>{latestReport.risk_level}风险</span>
              </div>
            </article>
          ) : (
            <div className="empty-state">暂无报告</div>
          )}
        </section>
        <section className="panel text-panel">
          <div className="panel-header compact">
            <div>
              <p className="section-kicker">Signals / Industry Watch</p>
              <h2>核心信号与产业事件</h2>
            </div>
          </div>
          <div className="timeline">
            {hbmEvents.slice(0, 3).map((item) => (
              <article className="timeline-item neutral" key={`${item.date}-${item.title}`}>
                <span className="timeline-date">{item.date} · {item.status}</span>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
            {!hbmEvents.length ? <div className="empty-state">等待产业事件更新</div> : null}
          </div>
        </section>
      </section>
    </>
  );
}

function OverviewStockCard({ stock, history }: { stock: StockPoint; history: StockPoint[] }) {
  return (
    <article className="panel overview-stock-card">
      <div className="overview-stock-head">
        <div>
          <strong>{stock.name}</strong>
          <span>{stock.ticker} · {stock.exchange}</span>
          <small>价格日期：{stock.date} · 对比：{stock.previous_date ?? "上一交易日"} 收盘</small>
        </div>
        <div className="overview-stock-price">
          {stock.close.toLocaleString()} {stock.currency}
          <b className={stock.change_pct >= 0 ? "up" : "down"}>{stock.change_pct >= 0 ? "+" : ""}{stock.change_pct}%</b>
        </div>
      </div>
      <div className="overview-stock-chart">
        <Chart option={makeOverviewStockOption(stock, history)} />
      </div>
    </article>
  );
}

function MarketsPage({ data }: { data: AppData }) {
  return (
    <>
      {data.stocks.warning ? <div className="warning"><AlertTriangle size={16} />{data.stocks.warning}</div> : null}

      <section className="section-heading">
        <div>
          <h2>股票与 ETF 趋势图</h2>
          <p>展示各市场已完成交易日收盘价走势；若当天尚未收盘，则沿用上一交易日收盘价，涨跌幅相对再上一交易日收盘价计算。</p>
        </div>
      </section>

      <section className="stock-trend-grid">
        {data.stocks.latest.map((stock) => (
          <Panel key={`${stock.ticker}-trend`}>
            <Chart option={makeStockTrendOption(stock, data.stocks.history)} />
          </Panel>
        ))}
      </section>

      <section className="chart-grid">
        <Panel><Chart option={makePriceOption("DRAM 现货价格走势", data.prices.DRAM.spot)} /></Panel>
        <Panel><Chart option={makePriceOption("DRAM 合约平均价走势", data.prices.DRAM.contract_avg)} /></Panel>
        <Panel><Chart option={makePriceOption("NAND Flash 现货价格走势", data.prices.NAND.spot)} /></Panel>
        <Panel><Chart option={makePriceOption("NAND 合约平均价走势", data.prices.NAND.contract_avg)} /></Panel>
      </section>
    </>
  );
}

function IndustryPage({ data }: { data: AppData }) {
  return (
    <>
      <section className="section-heading">
        <div>
          <h2>产业内容跟踪</h2>
          <p>集中查看 HBM4 长协谈判进度、三大厂商扩产计划和后续可扩展的产业事件。</p>
        </div>
      </section>
      <section className="detail-grid">
        <Timeline items={data.trackers.hbm4_negotiations ?? []} />
        <ExpansionTable rows={data.trackers.expansion_plans ?? []} />
      </section>
      <IndustryMap map={data.trackers.industry_map} />
    </>
  );
}

function ReportsPage({
  latestReport,
  reports,
  selectedReport,
  onSelectReport,
}: {
  latestReport?: Report;
  reports: Report[];
  selectedReport?: Report;
  onSelectReport: (slug: string) => void;
}) {
  return (
    <>
      <section className="section-heading">
        <div>
          <h2>深度报告跟踪</h2>
          <p>报告由 clawbot 或人工通过 PR 进入仓库，合并后由 GitHub Actions 生成归档。</p>
        </div>
      </section>
      <section className="report-grid">
        <LatestReport report={selectedReport} isLatest={selectedReport?.slug === latestReport?.slug} />
        <ReportArchive reports={reports} selectedSlug={selectedReport?.slug} onSelect={onSelectReport} />
      </section>
    </>
  );
}

function Header({ data }: { data: AppData }) {
  return (
    <header className="hero">
      <div>
        <p className="eyebrow">Memory Industry Monitor</p>
        <h1>存储行业可视化看板</h1>
        <p>跟踪 DRAM、NAND、HBM4 谈判、扩产计划和每日深度报告，保持数据、图表、观点在同一个工作流里更新。</p>
      </div>
      <div className="freshness">
        <span>Action生成</span>
        <strong>{formatDateTime(data.metadata.generated_at)}</strong>
        <small>GitHub Actions 定时更新</small>
      </div>
    </header>
  );
}

function KpiCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <article className="kpi-card">
      <div className="icon-box">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}

function PriceKpiCard({ snapshot }: { snapshot: PriceSnapshot }) {
  const sign = snapshot.changePct >= 0 ? "+" : "";
  return (
    <article className="kpi-card price-kpi-card">
      <div className="icon-box"><Database /></div>
      <span>{snapshot.label}</span>
      <strong>{formatPrice(snapshot.price)} {snapshot.unit}</strong>
      <p>{snapshot.date} · {snapshot.spec}</p>
      <b className={snapshot.changePct >= 0 ? "up" : "down"}>
        {sign}{snapshot.changePct.toFixed(2)}% / {sign}{formatPrice(snapshot.change)} {snapshot.unit}
      </b>
    </article>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="panel">{children}</section>;
}

function Timeline({ items }: { items: NonNullable<TrackerPayload["hbm4_negotiations"]> }) {
  return (
    <section className="panel text-panel">
      <h2>HBM4 长协谈判跟踪</h2>
      <div className="timeline">
        {items.map((item) => (
          <article key={`${item.date}-${item.title}`}>
            <time>{item.date}</time>
            <div>
              <strong>{item.title}</strong>
              <span>{item.status}</span>
              <p>{item.detail}</p>
              <small>{item.source}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExpansionTable({ rows }: { rows: NonNullable<TrackerPayload["expansion_plans"]> }) {
  return (
    <section className="panel text-panel">
      <h2>三家公司扩产计划</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>公司</th>
              <th>区域</th>
              <th>计划</th>
              <th>时间</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.company}-${row.region}-${row.plan}`}>
                <td>{row.company}</td>
                <td>{row.region}</td>
                <td>{row.plan}</td>
                <td>{row.timeline}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function IndustryMap({ map }: { map?: TrackerPayload["industry_map"] }) {
  const layers = map?.layers ?? [];
  return (
    <section className="panel text-panel industry-map">
      <div className="industry-map-head">
        <div>
          <h2>产业链图谱</h2>
          <p>预留给 clawbot 更新存储产业链环节、公司角色和上下游变化。</p>
        </div>
        <small>{map?.updated_at ? `更新：${map.updated_at}` : "等待 clawbot 更新"}</small>
      </div>
      {layers.length ? (
        <div className="industry-map-grid">
          {layers.map((layer) => (
            <article className="industry-layer" key={layer.name}>
              <div>
                <strong>{layer.name}</strong>
                {layer.description ? <p>{layer.description}</p> : null}
              </div>
              <div className="industry-node-list">
                {layer.nodes.map((node) => (
                  <span key={`${layer.name}-${node.name}`}>
                    <b>{node.name}</b>
                    {node.role ? <em>{node.role}</em> : null}
                    {node.region ? <small>{node.region}</small> : null}
                    {node.note ? <small>{node.note}</small> : null}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-map">
          clawbot 后续可通过 PR 更新 `content/trackers/industry_map.json`，合并后这里会显示产业链图谱。
        </div>
      )}
      {map?.source ? <small>来源：{map.source}</small> : null}
    </section>
  );
}

function LatestReport({ report, isLatest }: { report?: Report; isLatest: boolean }) {
  const [mindmapOpen, setMindmapOpen] = React.useState(false);

  React.useEffect(() => {
    setMindmapOpen(false);
  }, [report?.slug]);

  return (
    <section className="panel text-panel report-main">
      <h2>{isLatest ? "最新深度报告" : "历史深度报告"}</h2>
      {report ? (
        <>
          <div className="report-head">
            <div>
              <strong>{report.title}</strong>
              <span>{report.date}</span>
            </div>
            <div className="report-actions">
              {report.mindmap ? (
                <button className="mindmap-button" onClick={() => setMindmapOpen(true)} type="button">
                  思维导图
                </button>
              ) : null}
              <div className="badges">
                <b>{report.rating}</b>
                <b>{report.risk_level}风险</b>
              </div>
            </div>
          </div>
          <p>{report.summary}</p>
          <MarkdownBody body={report.body} />
          {report.sources.length ? <small>来源：{report.sources.join("、")}</small> : null}
          {report.mindmap && mindmapOpen ? (
            <MindmapModal mindmap={report.mindmap} onClose={() => setMindmapOpen(false)} />
          ) : null}
        </>
      ) : (
        <p>暂无报告。clawbot 可通过 PR 新增 `content/reports/YYYY-MM-DD.md`，合并后自动进入这里。</p>
      )}
    </section>
  );
}

function MindmapModal({ mindmap, onClose }: { mindmap: MindmapPayload; onClose: () => void }) {
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="mindmap-modal" role="dialog" aria-modal="true" aria-label={mindmap.title} onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>Mind Map</span>
            <h2>{mindmap.title}</h2>
          </div>
          <button aria-label="关闭思维导图" onClick={onClose} type="button">关闭</button>
        </header>
        <div className="mindmap-canvas">
          <MindmapTree node={mindmap.tree} depth={0} />
        </div>
        <small>来源文件：{mindmap.source_file}</small>
      </section>
    </div>
  );
}

function MindmapTree({ node, depth }: { node: MindmapNode; depth: number }) {
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = React.useState(depth < 2);
  return (
    <div className={`${depth === 0 ? "mindmap-root" : "mindmap-node"} ${expanded ? "expanded" : "collapsed"}`} style={{ ["--depth" as string]: depth }}>
      <button
        className={hasChildren ? "mindmap-label expandable" : "mindmap-label"}
        onClick={() => hasChildren && setExpanded((value) => !value)}
        type="button"
        aria-expanded={hasChildren ? expanded : undefined}
      >
        {node.title}
        {hasChildren ? <span>{expanded ? "−" : "+"}</span> : null}
      </button>
      {hasChildren ? (
        <div className="mindmap-children" aria-hidden={!expanded}>
          {children.map((child, index) => (
            <MindmapTree node={child} depth={depth + 1} key={`${child.title}-${index}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ReportArchive({
  reports,
  selectedSlug,
  onSelect,
}: {
  reports: Report[];
  selectedSlug?: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <section className="panel text-panel">
      <h2>报告归档</h2>
      <div className="archive-list">
        {reports.length ? reports.map((report) => (
          <button
            className={report.slug === selectedSlug ? "archive-item active" : "archive-item"}
            key={report.slug}
            onClick={() => onSelect(report.slug)}
            type="button"
          >
            <time>{report.date}</time>
            <strong>{report.title}</strong>
            <span>{report.rating} · {report.risk_level}风险</span>
          </button>
        )) : <p>更多历史报告会在每日提交后自动归档。</p>}
      </div>
    </section>
  );
}

function MarkdownBody({ body }: { body: string }) {
  return (
    <div className="markdown-body">
      {body
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => {
          if (block.startsWith("## ")) return <h3 key={block}>{block.replace(/^##\s+/, "")}</h3>;
          if (block.startsWith("### ")) return <h4 key={block}>{block.replace(/^###\s+/, "")}</h4>;
          if (block.startsWith("> ")) return <blockquote key={block}>{block.replace(/^>\s+/, "")}</blockquote>;
          if (block.startsWith("- ")) {
            return (
              <ul key={block}>
                {block.split(/\n/).map((line) => <li key={line}>{line.replace(/^-\s+/, "")}</li>)}
              </ul>
            );
          }
          return <p key={block}>{block}</p>;
        })}
    </div>
  );
}

function SearchResults({
  results,
  timeRange,
  onOpen,
  onClear,
}: {
  results: SearchItem[];
  timeRange: TimeRange;
  onOpen: (item: SearchItem) => void;
  onClear: () => void;
}) {
  return (
    <section className="panel search-results">
      <div className="panel-header compact">
        <div>
          <p className="section-kicker">Search</p>
          <h2>搜索结果</h2>
          <small className="search-scope">{timeRangeLabel(timeRange)}</small>
        </div>
        <button className="ghost-button" onClick={onClear} type="button">清除</button>
      </div>
      {results.length ? (
        <div className="feed-grid">
          {results.slice(0, 12).map((item, index) => (
            <button className="feed-item search-hit" key={`${item.type}-${item.title}-${index}`} onClick={() => onOpen(item)} type="button">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <div className="meta-row"><span className="pill neutral">{item.type}</span></div>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">没有匹配结果</div>
      )}
    </section>
  );
}

function IntelFeed({ records }: { records: IntelRecord[] }) {
  if (!records.length) return <div className="empty-state">还没有本地情报，点击右上角“新增情报”录入。</div>;
  return (
    <div className="feed-grid single">
      {records.slice(0, 6).map((record) => (
        <article className="feed-item" key={record.id}>
          <strong>{record.title}</strong>
          <p>{record.summary}</p>
          <div className="meta-row">
            <span className={`pill ${record.impact}`}>{impactLabel(record.impact)}</span>
            <span>{record.type}</span>
            <span>{record.date}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function MessageRadar({ records }: { records: IntelRecord[] }) {
  const [filter, setFilter] = React.useState<ImpactFilter>("all");
  const filters: Array<{ key: ImpactFilter; label: string }> = [
    { key: "all", label: "全部" },
    { key: "bullish", label: "利多" },
    { key: "bearish", label: "利空" },
    { key: "neutral", label: "中性" },
  ];
  const filtered = filter === "all" ? records : records.filter((record) => normalizedImpact(record.impact) === filter);
  const total = records.length || 1;
  const distribution: Array<{ key: IntelRecord["impact"]; label: string }> = [
    { key: "bullish", label: "利多" },
    { key: "bearish", label: "利空" },
    { key: "neutral", label: "中性" },
  ];

  return (
    <div className="message-radar">
      <div className="radar-distribution" aria-label="利好利空分布">
        {distribution.map((item) => {
          const count = records.filter((record) => normalizedImpact(record.impact) === item.key).length;
          const percent = records.length ? Math.round((count / total) * 100) : 0;
          return (
            <div className={`distribution-row ${item.key}`} key={item.key}>
              <div className="distribution-fill" style={{ width: `${percent}%` }} />
              <span>{item.label}</span>
              <strong>{count} / {percent}%</strong>
            </div>
          );
        })}
      </div>
      <div className="segmented-control" aria-label="消息影响筛选">
        {filters.map((item) => (
          <button
            className={filter === item.key ? "active" : ""}
            key={item.key}
            onClick={() => setFilter(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {filtered.length ? (
        <div className="radar-list">
          {filtered.slice(0, 12).map((record) => (
            <article className="radar-item" key={record.id}>
              <div>
                <span className={`pill ${record.impact}`}>{impactLabel(record.impact)}</span>
                <time>{record.date}</time>
              </div>
              <strong>{record.title}</strong>
              <p>{record.summary}</p>
              <small>{record.product || record.type} · {importanceLabel(record.importance)} · {reactionTypeLabel(record.reaction_type)} · {pricingStatusLabel(record.pricing_status)}</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">当前筛选下暂无消息。</div>
      )}
    </div>
  );
}

function IntelPage({
  remoteRecords,
  localRecords,
  onAdd,
  onEdit,
  onDelete,
  onExport,
}: {
  remoteRecords: IntelRecord[];
  localRecords: IntelRecord[];
  onAdd: () => void;
  onEdit: (record: IntelRecord) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}) {
  return (
    <>
      <section className="section-heading">
        <div>
          <h2>情报库管理</h2>
          <p>本页用于管理你在浏览器里临时记录的情报，也预留给龙虾通过 PR 推送结构化情报。</p>
        </div>
        <div className="section-actions">
          <button className="primary-button" type="button" onClick={onAdd}>新增情报</button>
          <button className="ghost-button" type="button" onClick={onExport}>导出情报</button>
        </div>
      </section>

      <section className="dashboard-grid">
        <section className="panel text-panel">
          <div className="panel-header compact">
            <div>
              <p className="section-kicker">Clawbot Slot</p>
              <h2>龙虾推送位置</h2>
            </div>
          </div>
          <div className="handoff-box">
            <strong>content/intel/clawbot_intel.json</strong>
            <p>龙虾后续可以通过 PR 更新这个文件。合并后 GitHub Actions 会在下一次构建时生成网站可读的情报数据。</p>
            <small>字段：date、type、impact、importance、reaction_type、pricing_status、horizon、confidence、action、review_date、title、product、source、summary、transmission_path。</small>
          </div>
        </section>

        <section className="panel text-panel">
          <div className="panel-header compact">
            <div>
              <p className="section-kicker">Stats</p>
              <h2>当前情报数量</h2>
            </div>
          </div>
          <div className="intel-stats">
            <div><strong>{remoteRecords.length}</strong><span>龙虾推送</span></div>
            <div><strong>{localRecords.length}</strong><span>本地记录</span></div>
            <div><strong>{remoteRecords.length + localRecords.length}</strong><span>合计可导出</span></div>
          </div>
        </section>
      </section>

      <IntelRulesPanel />

      <section className="panel text-panel">
        <div className="panel-header compact">
          <div>
            <p className="section-kicker">Clawbot Intel</p>
            <h2>龙虾推送情报</h2>
          </div>
        </div>
        <IntelTable records={remoteRecords} sourceLabel="PR 文件" />
      </section>

      <section className="panel text-panel">
        <div className="panel-header compact">
          <div>
            <p className="section-kicker">Local Intel</p>
            <h2>本地情报记录</h2>
          </div>
        </div>
        <IntelTable records={localRecords} sourceLabel="浏览器本地" onEdit={onEdit} onDelete={onDelete} />
      </section>
    </>
  );
}

function IntelRulesPanel() {
  return (
    <section className="panel text-panel">
      <div className="panel-header compact">
        <div>
          <p className="section-kicker">Classification Rules</p>
          <h2>新闻情报库分类规则</h2>
        </div>
      </div>
      <p className="rule-intro">情报库不只判断新闻利多、利空或中性，也跟踪新闻是否已被市场反映、是否存在滞后传导，以及是否值得继续研究和交易跟踪。</p>
      <div className="rules-grid">
        <RuleGroup title="方向分类" options={directionOptions} />
        <RuleGroup title="重要性分类" options={importanceOptions} />
        <RuleGroup title="市场反应类型" options={reactionTypeOptions} />
        <RuleGroup title="定价状态" options={pricingStatusOptions} />
      </div>
      <div className="rule-matrix">
        <strong>核心分类矩阵</strong>
        <p>重要性高且市场可能快速反应：即时催化型；重要性高但暂未充分反应：重要未定价型；重要性低但可能快速交易：情绪交易型；重要性低且未充分反应：普通归档型。</p>
      </div>
    </section>
  );
}

function RuleGroup({ title, options }: { title: string; options: ReadonlyArray<{ label: string; detail: string }> }) {
  return (
    <div className="rule-group">
      <h3>{title}</h3>
      {options.map((option) => (
        <article key={option.label}>
          <strong>{option.label}</strong>
          <p>{option.detail}</p>
        </article>
      ))}
    </div>
  );
}

function IntelTable({
  records,
  sourceLabel,
  onEdit,
  onDelete,
}: {
  records: IntelRecord[];
  sourceLabel: string;
  onEdit?: (record: IntelRecord) => void;
  onDelete?: (id: string) => void;
}) {
  if (!records.length) return <div className="empty-state">暂无{sourceLabel}情报。</div>;
  return (
    <div className="table-wrap intel-table-wrap">
      <table>
        <thead>
          <tr>
            <th>日期</th>
            <th>标题</th>
            <th>类型</th>
            <th>方向</th>
            <th>重要性</th>
            <th>反应类型</th>
            <th>定价状态</th>
            <th>来源</th>
            <th>摘要</th>
            <th>跟踪</th>
            {onEdit || onDelete ? <th>操作</th> : null}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>{record.date}</td>
              <td><strong>{record.title}</strong><br /><small>{record.product || "存储行业"}</small></td>
              <td>{record.type}</td>
              <td><span className={`pill ${record.impact}`}>{impactLabel(record.impact)}</span></td>
              <td>{importanceLabel(record.importance)}</td>
              <td>{reactionTypeLabel(record.reaction_type)}</td>
              <td>{pricingStatusLabel(record.pricing_status)}</td>
              <td>{record.source}</td>
              <td>{record.summary}</td>
              <td>
                <small>{horizonLabel(record.horizon)} · {confidenceLabel(record.confidence)}置信度 · {actionLabel(record.action)}</small>
                {record.review_date ? <><br /><small>复核：{record.review_date}</small></> : null}
              </td>
              {onEdit || onDelete ? (
                <td>
                  <div className="row-actions">
                    {onEdit ? (
                      <button className="icon-button" type="button" aria-label={`编辑 ${record.title}`} onClick={() => onEdit(record)}>
                        编辑
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button className="icon-button danger" type="button" aria-label={`删除 ${record.title}`} onClick={() => onDelete(record.id)}>
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IntelCaptureModal({ record, onClose, onSave }: { record?: IntelRecord | null; onClose: () => void; onSave: (record: IntelRecord) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const isEditing = Boolean(record);
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      id: record?.id ?? (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      type: String(form.get("type") || "消息"),
      impact: String(form.get("impact") || "neutral") as IntelRecord["impact"],
      date: String(form.get("date") || today),
      title: String(form.get("title") || "").trim(),
      product: String(form.get("product") || "").trim(),
      source: String(form.get("source") || "本地录入").trim(),
      summary: String(form.get("summary") || "").trim(),
      importance: String(form.get("importance") || "B") as IntelRecord["importance"],
      reaction_type: String(form.get("reaction_type") || "archive") as IntelRecord["reaction_type"],
      pricing_status: String(form.get("pricing_status") || "unpriced") as IntelRecord["pricing_status"],
      horizon: String(form.get("horizon") || "1w") as IntelRecord["horizon"],
      transmission_path: String(form.get("transmission_path") || "").trim(),
      confidence: String(form.get("confidence") || "medium") as IntelRecord["confidence"],
      action: String(form.get("action") || "watch") as IntelRecord["action"],
      review_date: String(form.get("review_date") || "").trim(),
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="mindmap-modal capture-modal" role="dialog" aria-modal="true" aria-label={isEditing ? "编辑情报" : "新增情报"} onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>Capture</span>
            <h2>{isEditing ? "编辑情报" : "新增情报"}</h2>
          </div>
          <button aria-label="关闭情报弹窗" onClick={onClose} type="button">关闭</button>
        </header>
        <form className="intel-form" onSubmit={handleSubmit}>
          <label>类型<select name="type" defaultValue={record?.type ?? "消息"}><option>产品数据</option><option>行业分析</option><option>重大事件</option><option>消息</option></select></label>
          <label>方向<select name="impact" defaultValue={record?.impact ?? "neutral"}><option value="bullish">利多</option><option value="bearish">利空</option><option value="neutral">中性</option></select></label>
          <label>重要性<select name="importance" defaultValue={record?.importance ?? "B"}><option value="S">S级：核心基本面变化</option><option value="A">A级：强预期变化</option><option value="B">B级：情绪或主题变化</option><option value="C">C级：低相关信息</option></select></label>
          <label>市场反应类型<select name="reaction_type" defaultValue={record?.reaction_type ?? "archive"}><option value="instant">即时催化型</option><option value="undervalued">重要未定价型</option><option value="sentiment">情绪交易型</option><option value="archive">普通归档型</option></select></label>
          <label>定价状态<select name="pricing_status" defaultValue={record?.pricing_status ?? "unpriced"}><option value="unpriced">未反应</option><option value="partial">部分反应</option><option value="priced">已反应</option><option value="overpriced">过度反应</option><option value="failed">反应失败</option></select></label>
          <label>影响周期<select name="horizon" defaultValue={record?.horizon ?? "1w"}><option value="intraday">盘中</option><option value="1d">1日</option><option value="1w">1周</option><option value="1m">1个月</option><option value="1q">1季度</option><option value="longer">更长</option></select></label>
          <label>置信度<select name="confidence" defaultValue={record?.confidence ?? "medium"}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
          <label>建议动作<select name="action" defaultValue={record?.action ?? "watch"}><option value="alert">盘中提醒</option><option value="watch">加入观察池</option><option value="deep_tracking">深度跟踪</option><option value="archive">归档</option></select></label>
          <label>日期<input name="date" type="date" defaultValue={record?.date ?? today} required /></label>
          <label>复核时间<input name="review_date" type="date" defaultValue={record?.review_date ?? ""} /></label>
          <label>标题<input name="title" type="text" maxLength={80} defaultValue={record?.title ?? ""} required /></label>
          <label>相关产品<input name="product" type="text" maxLength={80} placeholder="HBM / DDR5 / NAND" defaultValue={record?.product ?? ""} /></label>
          <label>来源<input name="source" type="text" maxLength={100} placeholder="公司公告 / 研报 / 调研" defaultValue={record?.source ?? ""} /></label>
          <label className="wide">传导路径<textarea name="transmission_path" rows={3} maxLength={400} placeholder="新闻如何影响公司、行业、产业链或资产价格" defaultValue={record?.transmission_path ?? ""} /></label>
          <label className="wide">摘要<textarea name="summary" rows={5} maxLength={500} defaultValue={record?.summary ?? ""} required /></label>
          <div className="form-actions">
            <button className="primary-button" type="submit">{isEditing ? "保存修改" : "保存情报"}</button>
            <button className="ghost-button" type="reset">重置</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(value));
}

function dataSourceLabel(exchange: string) {
  return exchange === "KRX" || exchange === "NASDAQ" ? "Yahoo Finance" : "公开行情源";
}

function getPriceSnapshots(prices: PricePayload): PriceSnapshot[] {
  const configs = [
    { label: "DRAM DDR5 16GB现货", payload: prices.DRAM.spot, matcher: (spec: string) => /DDR5/i.test(spec) && (/16Gb/i.test(spec) || /x2/i.test(spec)) },
    { label: "DRAM DDR4 16GB现货", payload: prices.DRAM.spot, matcher: (spec: string) => /DDR4/i.test(spec) && /16Gb/i.test(spec) },
    { label: "NAND 64GB现货", payload: prices.NAND.spot, matcher: (spec: string) => /64GB/i.test(spec) },
    { label: "NAND 32GB现货", payload: prices.NAND.spot, matcher: (spec: string) => /32GB/i.test(spec) },
  ];
  return configs
    .map((config) => makePriceSnapshot(config.label, config.payload.series.find((series) => config.matcher(series.spec))))
    .filter((snapshot): snapshot is PriceSnapshot => Boolean(snapshot));
}

function makePriceSnapshot(label: string, series?: PriceSeries): PriceSnapshot | null {
  const points = (series?.points ?? []).filter((point) => Number.isFinite(point.price) && point.price > 0);
  if (!series || !points.length) return null;
  const latest = points[points.length - 1];
  const previous = points[points.length - 2] ?? latest;
  const change = latest.price - previous.price;
  const changePct = previous.price ? (change / previous.price) * 100 : 0;
  return {
    label,
    spec: series.spec,
    date: latest.date,
    price: latest.price,
    unit: series.unit,
    change: Math.round(change * 1000) / 1000,
    changePct: Math.round(changePct * 100) / 100,
  };
}

function formatPrice(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function calculatePriceIndex(payload: { series: PriceSeries[] }) {
  const values = payload.series
    .map((series) => {
      const points = [...series.points].sort((a, b) => a.date.localeCompare(b.date));
      const first = points[0]?.price;
      const latest = points[points.length - 1]?.price;
      if (!first || !latest) return null;
      return (latest / first) * 100;
    })
    .filter((value): value is number => Number.isFinite(value));
  if (!values.length) return null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(average * 10) / 10;
}

function formatIndexValue(value: number | null) {
  return value === null ? "暂无" : value.toFixed(1);
}

function formatIndexHint(value: number | null, suffix: string) {
  if (value === null) return "等待价格数据更新";
  const direction = value >= 100 ? "高于" : "低于";
  return `${direction}基期 ${Math.abs(value - 100).toFixed(1)} 点 · ${suffix}`;
}

function getHbmPressure(data: AppData) {
  const hbmItems = data.reports
    .flatMap((report) => [report.title, report.summary, report.body])
    .join(" ");
  const trackerCount = data.trackers.hbm4_negotiations?.length ?? 0;
  if (/供需紧张|紧缺|长协|HBM|高景气/.test(hbmItems) || trackerCount > 0) {
    return { value: "高", hint: `跟踪 ${trackerCount} 条 HBM4/长协事件` };
  }
  return { value: "观察", hint: "等待 clawbot 更新 HBM 供给事件" };
}

function useLocalIntelRecords(): [IntelRecord[], React.Dispatch<React.SetStateAction<IntelRecord[]>>] {
  const [records, setRecords] = React.useState<IntelRecord[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(INTEL_STORAGE_KEY) || "[]") as IntelRecord[];
    } catch {
      return [];
    }
  });
  React.useEffect(() => {
    localStorage.setItem(INTEL_STORAGE_KEY, JSON.stringify(records));
  }, [records]);
  return [records, setRecords];
}

function searchDashboard(data: AppData, records: IntelRecord[], query: string, timeRange: TimeRange) {
  const needle = query.toLowerCase();
  const items: SearchItem[] = [];
  data.reports.forEach((report) => items.push({ type: "报告", title: report.title, date: report.date, detail: `${report.date} · ${report.summary}`, haystack: `${report.title} ${report.summary} ${report.body}`, target: { page: "reports", reportSlug: report.slug } }));
  data.stocks.latest.forEach((stock) => items.push({ type: "股票", title: stock.name, date: stock.date, detail: `${stock.ticker} ${stock.date} ${stock.close} ${stock.currency} ${stock.change_pct}%`, haystack: `${stock.name} ${stock.ticker} ${stock.exchange}`, target: { page: "markets" } }));
  (data.trackers.hbm4_negotiations ?? []).forEach((item) => items.push({ type: "长协", title: item.title, date: item.date, detail: `${item.date} · ${item.detail}`, haystack: `${item.title} ${item.detail} ${item.status}`, target: { page: "industry" } }));
  (data.trackers.expansion_plans ?? []).forEach((item) => items.push({ type: "扩产", title: item.company, date: dateFromText(item.timeline), detail: `${item.region} · ${item.plan} · ${item.timeline}`, haystack: `${item.company} ${item.region} ${item.plan} ${item.status}`, target: { page: "industry" } }));
  records.forEach((record) => items.push({ type: "情报", title: record.title, date: record.date, detail: `${record.date} · ${record.summary}`, haystack: `${record.title} ${record.product} ${record.source} ${record.summary} ${importanceLabel(record.importance)} ${reactionTypeLabel(record.reaction_type)} ${pricingStatusLabel(record.pricing_status)} ${record.transmission_path ?? ""}`, target: { page: "intel" } }));
  return items
    .filter((item) => isWithinTimeRange(item.date, timeRange, data.metadata.generated_at))
    .filter((item) => item.haystack.toLowerCase().includes(needle));
}

function isWithinTimeRange(date: string | undefined, range: TimeRange, anchor: string) {
  if (range === "all") return true;
  if (!date) return false;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const anchorTime = new Date(anchor).getTime();
  const itemTime = new Date(`${date}T00:00:00`).getTime();
  if (!Number.isFinite(anchorTime) || !Number.isFinite(itemTime)) return false;
  const diffDays = Math.floor((startOfDay(anchorTime) - startOfDay(itemTime)) / 86400000);
  return diffDays >= 0 && diffDays <= days;
}

function startOfDay(time: number) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function dateFromText(value: string) {
  const match = String(value || "").match(/20\d{2}-\d{2}-\d{2}/);
  return match?.[0];
}

function timeRangeLabel(range: TimeRange) {
  if (range === "7d") return "范围：最近7天";
  if (range === "30d") return "范围：最近30天";
  if (range === "90d") return "范围：最近90天";
  return "范围：全部周期";
}

function exportIntelligence(data: AppData, records: IntelRecord[]) {
  const rows = [
    ...records.map((record) => ({
      date: record.date,
      type: record.type,
      title: record.title,
      product: record.product,
      impact: impactLabel(record.impact),
      source: record.source,
      summary: record.summary,
      importance: importanceLabel(record.importance),
      reaction_type: reactionTypeLabel(record.reaction_type),
      pricing_status: pricingStatusLabel(record.pricing_status),
      horizon: horizonLabel(record.horizon),
      transmission_path: record.transmission_path ?? "",
      confidence: confidenceLabel(record.confidence),
      action: actionLabel(record.action),
      review_date: record.review_date ?? "",
    })),
    ...data.reports.map((report) => ({
      date: report.date,
      type: "报告",
      title: report.title,
      product: "存储行业",
      impact: report.rating,
      source: report.sources.join("、"),
      summary: report.summary,
      importance: "",
      reaction_type: "",
      pricing_status: "",
      horizon: "",
      transmission_path: "",
      confidence: "",
      action: "",
      review_date: "",
    })),
  ];
  const headers = ["date", "type", "title", "product", "impact", "importance", "reaction_type", "pricing_status", "horizon", "transmission_path", "confidence", "action", "review_date", "source", "summary"];
  const csv = [headers.join(","), ...rows.map((row) => headers.map((key) => csvCell(row[key as keyof typeof row])).join(","))].join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `storage-intel-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function normalizedImpact(value: unknown): IntelRecord["impact"] {
  if (value === "bullish" || value === "bearish") return value;
  return "neutral";
}

function impactLabel(value: unknown) {
  const normalized = normalizedImpact(value);
  if (normalized === "bullish") return "利多";
  if (normalized === "bearish") return "利空";
  return "中性";
}

function optionLabel<T extends string>(options: ReadonlyArray<{ value: T; label: string }>, value?: T) {
  return options.find((option) => option.value === value)?.label ?? "未分类";
}

function importanceLabel(value?: IntelRecord["importance"]) {
  return optionLabel(importanceOptions, value);
}

function reactionTypeLabel(value?: IntelRecord["reaction_type"]) {
  return optionLabel(reactionTypeOptions, value);
}

function pricingStatusLabel(value?: IntelRecord["pricing_status"]) {
  return optionLabel(pricingStatusOptions, value);
}

function horizonLabel(value?: IntelRecord["horizon"]) {
  return optionLabel(horizonOptions, value);
}

function confidenceLabel(value?: IntelRecord["confidence"]) {
  return optionLabel(confidenceOptions, value);
}

function actionLabel(value?: IntelRecord["action"]) {
  return optionLabel(actionOptions, value);
}

createRoot(document.getElementById("root")!).render(<App />);
