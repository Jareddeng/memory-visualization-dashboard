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

type PageKey = "markets" | "industry" | "reports";

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
  const [activePage, setActivePage] = React.useState<PageKey>("markets");
  const [selectedReportSlug, setSelectedReportSlug] = React.useState<string | null>(null);

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

  return (
    <main className="shell">
      <Header data={data} />
      <section className="kpi-grid">
        <KpiCard icon={<Database />} label="价格数据点" value={String(data.metadata.price_points)} hint="DRAM / NAND CSV 与 XLSX 汇总" />
        <KpiCard icon={<TrendingUp />} label="股票数据点" value={String(data.metadata.stock_points)} hint={data.stocks.source} />
        <KpiCard icon={<FileText />} label="最新报告" value={latestReport?.date ?? "暂无"} hint={latestReport?.rating ?? "等待 clawbot 提交"} />
        <KpiCard icon={<CalendarClock />} label="更新频率" value="每日两次" hint="北京时间 08:30 / 18:30" />
      </section>

      <PageNav activePage={activePage} onChange={setActivePage} />

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
    </main>
  );
}

function PageNav({ activePage, onChange }: { activePage: PageKey; onChange: (page: PageKey) => void }) {
  const pages: Array<{ key: PageKey; label: string; detail: string }> = [
    { key: "markets", label: "市场图表", detail: "价格与股价" },
    { key: "industry", label: "产业跟踪", detail: "长协与扩产" },
    { key: "reports", label: "报告库", detail: "日报与归档" },
  ];
  return (
    <nav className="page-nav" aria-label="看板分区导航">
      {pages.map((page) => (
        <button
          className={activePage === page.key ? "page-nav-item active" : "page-nav-item"}
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
            <div className="badges">
              <b>{report.rating}</b>
              <b>{report.risk_level}风险</b>
            </div>
          </div>
          <p>{report.summary}</p>
          <MarkdownBody body={report.body} />
          {report.sources.length ? <small>来源：{report.sources.join("、")}</small> : null}
        </>
      ) : (
        <p>暂无报告。clawbot 可通过 PR 新增 `content/reports/YYYY-MM-DD.md`，合并后自动进入这里。</p>
      )}
    </section>
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

createRoot(document.getElementById("root")!).render(<App />);
