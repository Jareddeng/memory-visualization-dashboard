import React from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, CalendarClock, Database, FileText, RefreshCw, TrendingUp } from "lucide-react";
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
  metadata: Metadata;
};

type PageKey = "overview" | "markets" | "industry" | "reports";

type IntelRecord = {
  id: string;
  type: string;
  impact: "bullish" | "bearish" | "neutral";
  date: string;
  title: string;
  product: string;
  source: string;
  summary: string;
};

const INTEL_STORAGE_KEY = "storage-dashboard-intel-records-v1";

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
  const metadata = useJson<Metadata>("./data/processed/metadata.json");

  const error = prices.error || stocks.error || reports.error || trackers.error || metadata.error;
  const loading = !prices.data || !stocks.data || !reports.data || !trackers.data || !metadata.data;

  return {
    data:
      prices.data && stocks.data && reports.data && trackers.data && metadata.data
        ? {
            prices: prices.data,
            stocks: stocks.data,
            reports: reports.data.reports,
            trackers: trackers.data,
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

function App() {
  const { data, loading, error } = useDashboardData();
  const [activePage, setActivePage] = React.useState<PageKey>("overview");
  const [selectedReportSlug, setSelectedReportSlug] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [intelRecords, setIntelRecords] = useLocalIntelRecords();
  const [captureOpen, setCaptureOpen] = React.useState(false);

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
  const searchResults = query.trim() ? searchDashboard(data, intelRecords, query) : [];
  const nandSpotIndex = calculatePriceIndex(data.prices.NAND.spot);
  const dramContractIndex = calculatePriceIndex(data.prices.DRAM.contract_avg);
  const hbmPressure = getHbmPressure(data);

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
            <button className="ghost-button" type="button" onClick={() => exportIntelligence(data, intelRecords)}>导出情报</button>
            <button className="primary-button" type="button" onClick={() => setCaptureOpen(true)}>新增情报</button>
            <button className="primary-button" type="button" onClick={() => setActivePage("markets")}>市场图表</button>
          </div>
        </header>

        {query.trim() ? <SearchResults results={searchResults} onClear={() => setQuery("")} /> : null}

        <Hero data={data} latestReport={latestReport} />

        <section className="kpi-grid">
          <KpiCard icon={<TrendingUp />} label="NAND 现货指数" value={formatIndexValue(nandSpotIndex)} hint={formatIndexHint(nandSpotIndex, "基期为当前样本首日均值")} />
          <KpiCard icon={<TrendingUp />} label="DRAM 合约指数" value={formatIndexValue(dramContractIndex)} hint={formatIndexHint(dramContractIndex, "基期为当前样本首日均值")} />
          <KpiCard icon={<Database />} label="HBM 供给压力" value={hbmPressure.value} hint={hbmPressure.hint} />
          <KpiCard icon={<Database />} label="晶圆可用产能" value="待接入" hint="等待 EDB 或 clawbot 产能数据源" />
          <KpiCard icon={<FileText />} label="最新报告" value={latestReport?.date ?? "暂无"} hint={latestReport?.rating ?? "等待 clawbot 提交"} />
          <KpiCard icon={<CalendarClock />} label="本地情报记录" value={String(intelRecords.length)} hint="保存在当前浏览器，可导出 CSV" />
        </section>

        {activePage === "overview" ? <OverviewPage data={data} latestReport={latestReport} intelRecords={intelRecords} /> : null}
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

        <footer className="disclaimer">
          交易评价与风险提示仅用于行业跟踪和研究记录，不构成投资建议。请结合授权行情、公司公告和自身风险承受能力独立判断。
        </footer>
        {captureOpen ? (
          <IntelCaptureModal
            onClose={() => setCaptureOpen(false)}
            onSave={(record) => {
              setIntelRecords([record, ...intelRecords]);
              setCaptureOpen(false);
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
  const latestStocks = data.stocks.latest.slice(0, 3);
  const hbmEvents = data.trackers.hbm4_negotiations ?? [];
  return (
    <>
      <section className="dashboard-grid">
        <section className="panel text-panel">
          <div className="panel-header compact">
            <div>
              <p className="section-kicker">Overview</p>
              <h2>今日核心信号</h2>
            </div>
          </div>
          <div className="signal-list">
            {latestStocks.map((stock) => (
              <article className="signal-item" key={stock.ticker}>
                <strong>{stock.name}</strong>
                <p>
                  {stock.date} 收盘 {stock.close.toLocaleString()} {stock.currency}，
                  较 {stock.previous_date ?? "上一交易日"} {stock.change_pct >= 0 ? "上涨" : "下跌"} {Math.abs(stock.change_pct)}%。
                </p>
              </article>
            ))}
          </div>
        </section>
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
      </section>

      <section className="two-column">
        <section className="panel text-panel">
          <div className="panel-header compact">
            <div>
              <p className="section-kicker">Industry Watch</p>
              <h2>产业事件速览</h2>
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
        <section className="panel text-panel">
          <div className="panel-header compact">
            <div>
              <p className="section-kicker">Local Intel</p>
              <h2>本地新增情报</h2>
            </div>
          </div>
          <IntelFeed records={intelRecords} />
        </section>
      </section>
    </>
  );
}

function MarketsPage({ data }: { data: AppData }) {
  return (
    <>
      {data.stocks.warning ? <div className="warning"><AlertTriangle size={16} />{data.stocks.warning}</div> : null}

      <section className="section-heading">
        <div>
          <h2>三大存储厂商日收盘价</h2>
          <p>价格为各市场已完成交易日收盘价；若当天尚未收盘，则沿用上一交易日收盘价，涨跌幅相对再上一交易日收盘价计算。</p>
        </div>
      </section>

      <section className="stock-strip">
        {data.stocks.latest.map((stock) => (
          <article className="stock-card" key={stock.ticker}>
            <div>
              <strong>{stock.name}</strong>
              <span>{stock.ticker} · {stock.exchange}</span>
              <small>
                价格日期：{stock.date} · 涨跌幅对比：{stock.previous_date ?? "上一交易日"} 收盘 · Action生成 {formatDateTime(data.stocks.generated_at ?? data.metadata.generated_at)}
              </small>
            </div>
            <div className="stock-price">
              {stock.close.toLocaleString()} {stock.currency}
              <b className={stock.change_pct >= 0 ? "up" : "down"}>{stock.change_pct >= 0 ? "+" : ""}{stock.change_pct}%</b>
            </div>
          </article>
        ))}
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
  return (
    <div className={depth === 0 ? "mindmap-root" : "mindmap-node"}>
      <div className="mindmap-label">{node.title}</div>
      {children.length ? (
        <div className="mindmap-children">
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

function SearchResults({ results, onClear }: { results: Array<{ type: string; title: string; detail: string }>; onClear: () => void }) {
  return (
    <section className="panel search-results">
      <div className="panel-header compact">
        <div>
          <p className="section-kicker">Search</p>
          <h2>搜索结果</h2>
        </div>
        <button className="ghost-button" onClick={onClear} type="button">清除</button>
      </div>
      {results.length ? (
        <div className="feed-grid">
          {results.slice(0, 12).map((item, index) => (
            <article className="feed-item" key={`${item.type}-${item.title}-${index}`}>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <div className="meta-row"><span className="pill neutral">{item.type}</span></div>
            </article>
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

function IntelCaptureModal({ onClose, onSave }: { onClose: () => void; onSave: (record: IntelRecord) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      type: String(form.get("type") || "消息"),
      impact: String(form.get("impact") || "neutral") as IntelRecord["impact"],
      date: String(form.get("date") || today),
      title: String(form.get("title") || "").trim(),
      product: String(form.get("product") || "").trim(),
      source: String(form.get("source") || "本地录入").trim(),
      summary: String(form.get("summary") || "").trim(),
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="mindmap-modal capture-modal" role="dialog" aria-modal="true" aria-label="新增情报" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>Capture</span>
            <h2>新增情报</h2>
          </div>
          <button aria-label="关闭新增情报" onClick={onClose} type="button">关闭</button>
        </header>
        <form className="intel-form" onSubmit={handleSubmit}>
          <label>类型<select name="type"><option>产品数据</option><option>行业分析</option><option>重大事件</option><option>消息</option></select></label>
          <label>影响<select name="impact"><option value="bullish">利好</option><option value="bearish">利空</option><option value="neutral">中性</option></select></label>
          <label>日期<input name="date" type="date" defaultValue={today} required /></label>
          <label>标题<input name="title" type="text" maxLength={80} required /></label>
          <label>相关产品<input name="product" type="text" maxLength={80} placeholder="HBM / DDR5 / NAND" /></label>
          <label>来源<input name="source" type="text" maxLength={100} placeholder="公司公告 / 研报 / 调研" /></label>
          <label className="wide">摘要<textarea name="summary" rows={5} maxLength={500} required /></label>
          <div className="form-actions">
            <button className="primary-button" type="submit">保存情报</button>
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

function searchDashboard(data: AppData, records: IntelRecord[], query: string) {
  const needle = query.toLowerCase();
  const items: Array<{ type: string; title: string; detail: string; haystack: string }> = [];
  data.reports.forEach((report) => items.push({ type: "报告", title: report.title, detail: `${report.date} · ${report.summary}`, haystack: `${report.title} ${report.summary} ${report.body}` }));
  data.stocks.latest.forEach((stock) => items.push({ type: "股票", title: stock.name, detail: `${stock.ticker} ${stock.date} ${stock.close} ${stock.currency} ${stock.change_pct}%`, haystack: `${stock.name} ${stock.ticker} ${stock.exchange}` }));
  (data.trackers.hbm4_negotiations ?? []).forEach((item) => items.push({ type: "长协", title: item.title, detail: `${item.date} · ${item.detail}`, haystack: `${item.title} ${item.detail} ${item.status}` }));
  (data.trackers.expansion_plans ?? []).forEach((item) => items.push({ type: "扩产", title: item.company, detail: `${item.region} · ${item.plan} · ${item.timeline}`, haystack: `${item.company} ${item.region} ${item.plan} ${item.status}` }));
  records.forEach((record) => items.push({ type: "本地情报", title: record.title, detail: `${record.date} · ${record.summary}`, haystack: `${record.title} ${record.product} ${record.source} ${record.summary}` }));
  return items.filter((item) => item.haystack.toLowerCase().includes(needle));
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
    })),
    ...data.reports.map((report) => ({
      date: report.date,
      type: "报告",
      title: report.title,
      product: "存储行业",
      impact: report.rating,
      source: report.sources.join("、"),
      summary: report.summary,
    })),
  ];
  const headers = ["date", "type", "title", "product", "impact", "source", "summary"];
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

function impactLabel(value: IntelRecord["impact"]) {
  if (value === "bullish") return "利好";
  if (value === "bearish") return "利空";
  return "中性";
}

createRoot(document.getElementById("root")!).render(<App />);
