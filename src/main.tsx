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
  insights?: ReportInsights;
};

type ReportInsights = {
  leading_indicators?: Array<{
    indicator: string;
    usage: string;
    transmission_path: string;
    source: string;
    reference: string;
  }>;
  novel_views?: Array<{
    view: string;
    evidence: string;
    date: string;
    source: string;
    validation: string;
  }>;
};

type ReportTab = "body" | "indicators" | "views";

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
  hbm_contracts?: {
    updated_at?: string;
    source?: string;
    stages?: string[];
    companies?: Array<{
      company: string;
      ticker?: string;
      stance: string;
      stage: string;
      stage_note?: string;
      stage_index: number;
      locked_years: string;
      locked_until?: number | null;
      locked_capacity: string;
      capacity_lock_segments?: Array<{
        start: number;
        end: number;
        status: "soldout" | "full" | "partial" | "watch";
        label?: string;
        note?: string;
      }>;
      negotiating: string;
      expected_term: string;
      expected_capacity: string;
      main_customers: string[];
      confidence: string;
      risk: string;
      summary: string;
      evidence?: Array<{
        date: string;
        label: string;
        detail: string;
        source: string;
        url?: string;
      }>;
    }>;
  };
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
  expansion_capacity?: {
    updated_at?: string;
    source?: string;
    companies?: Array<{
      company: string;
      ticker?: string;
      products: string[];
      capacity_metric: string;
      current_capacity: {
        label: string;
        value: number | null;
        unit: string;
        display: string;
      };
      capex: string;
      target_capacity: {
        label: string;
        value: number | null;
        unit: string;
        display: string;
      };
      timeline: string;
      region: string;
      bottleneck: string;
      confidence: string;
      status: string;
      facilities?: Array<{
        name: string;
        stage: "base" | "expansion";
        products: string[];
        value: number | null;
        unit: string;
        display: string;
        timeline?: string;
        note?: string;
      }>;
      evidence?: Array<{
        date: string;
        label: string;
        detail: string;
        source: string;
      }>;
    }>;
  };
  institutional_charts?: {
    updated_at?: string;
    source?: string;
    source_url?: string;
    note?: string;
    items?: Array<{
      chart_no: string;
      title: string;
      topic: string;
      status: string;
      source_url?: string;
      image_url?: string | null;
      note?: string;
    }>;
  };
  industry_map?: {
    updated_at?: string | null;
    source?: string;
    layers?: Array<{
      name: string;
      description?: string;
      groups?: Array<{
        name: string;
        note?: string;
        nodes: Array<{
          name: string;
          homepage?: string;
          logo_url?: string;
          region?: string;
          role?: string;
          note?: string;
          ticker?: string;
        }>;
      }>;
      nodes?: Array<{
        name: string;
        homepage?: string;
        logo_url?: string;
        region?: string;
        role?: string;
        note?: string;
        ticker?: string;
      }>;
    }>;
  };
};

type IndustryNode = {
  name: string;
  homepage?: string;
  logo_url?: string;
  region?: string;
  role?: string;
  note?: string;
  ticker?: string;
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
  url?: string;
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
type RadarTimeRange = "all" | "7d" | "30d";
type PricingFilter = "all" | NonNullable<IntelRecord["pricing_status"]>;
type SearchItem = {
  type: string;
  title: string;
  detail: string;
  date?: string;
  haystack: string;
  target: {
    page: PageKey;
    reportSlug?: string;
    url?: string;
    recordId?: string;
    anchorId?: string;
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
const INTEL_DELETED_REMOTE_KEY = "storage-dashboard-deleted-remote-intel-v1";

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

const IntelTableContext = React.createContext<{
  onEdit?: (record: IntelRecord) => void;
  onDelete?: (id: string) => void;
  pinnedIntelId?: string | null;
}>({});

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

const Chart = React.memo(function Chart({ option }: { option: echarts.EChartsCoreOption }) {
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
}, areChartOptionsEqual);

function areChartOptionsEqual(prev: { option: echarts.EChartsCoreOption }, next: { option: echarts.EChartsCoreOption }) {
  return chartOptionSignature(prev.option) === chartOptionSignature(next.option);
}

function chartOptionSignature(option: echarts.EChartsCoreOption) {
  const rawTitle = (option as any).title;
  const rawSeries = (option as any).series;
  const title = Array.isArray(rawTitle) ? rawTitle.map((item) => item?.text).join("|") : rawTitle?.text;
  const series = Array.isArray(rawSeries) ? rawSeries : [];
  return JSON.stringify({
    title,
    series: series.map((item) => ({
      name: item?.name,
      count: Array.isArray(item?.data) ? item.data.length : 0,
      first: Array.isArray(item?.data) ? item.data[0] : undefined,
      last: Array.isArray(item?.data) ? item.data[item.data.length - 1] : undefined,
    })),
  });
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

const reportRatingScale: Record<string, number> = {
  "看空": 1,
  "中性偏空": 2,
  "中性": 3,
  "中性偏多": 4,
  "看多": 5,
};

const reportRiskScale: Record<string, number> = {
  "低": 1,
  "中": 2,
  "中高": 3,
  "高": 4,
};

function makeReportTrendOption(reports: Report[]): echarts.EChartsCoreOption {
  const points = [...reports].sort((a, b) => a.date.localeCompare(b.date));
  const ratingData = points.map((report) => {
    const rating = normalizeReportRating(report.rating);
    return {
      value: [report.date, reportRatingScale[rating] ?? reportRatingScale["中性"]],
      label: rating,
      title: report.title,
    };
  });
  const riskData = points.map((report) => {
    const risk = normalizeRiskLevel(report.risk_level);
    return {
      value: [report.date, reportRiskScale[risk] ?? reportRiskScale["中"]],
      label: risk,
      title: report.title,
    };
  });

  return {
    color: ["#147c72", "#d4943b"],
    tooltip: {
      trigger: "axis",
      confine: true,
      formatter(params: unknown) {
        const rows = Array.isArray(params) ? params : [params];
        const date = (rows[0] as any)?.value?.[0] ?? "";
        const body = rows.map((row: any) => `${row.marker}${row.seriesName}: ${row.data?.label ?? ""}`).join("<br/>");
        return `<strong>${date}</strong><br/>${body}`;
      },
    },
    legend: {
      top: 0,
      right: 4,
      itemWidth: 12,
      itemHeight: 7,
      textStyle: { color: "#63716b", fontSize: 11 },
    },
    grid: { left: 42, right: 42, top: 34, bottom: 32 },
    xAxis: {
      type: "time",
      axisLabel: { color: "#87918d", fontSize: 11 },
      axisLine: { lineStyle: { color: "#d9e1dd" } },
    },
    yAxis: [
      {
        type: "value",
        min: 1,
        max: 5,
        interval: 1,
        axisLabel: {
          color: "#63716b",
          formatter(value: number) {
            return ["", "看空", "偏空", "中性", "偏多", "看多"][value] ?? "";
          },
        },
        splitLine: { lineStyle: { color: "#edf1f6" } },
      },
      {
        type: "value",
        min: 1,
        max: 4,
        interval: 1,
        axisLabel: {
          color: "#8a6426",
          formatter(value: number) {
            return ["", "低", "中", "中高", "高"][value] ?? "";
          },
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "观点",
        type: "line",
        smooth: true,
        showSymbol: true,
        symbolSize: 6,
        data: ratingData,
      },
      {
        name: "风险",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        showSymbol: true,
        symbolSize: 6,
        data: riskData,
      },
    ],
  };
}

function App() {
  const { data, loading, error } = useDashboardData();
  const [activePage, setActivePage] = React.useState<PageKey>("overview");
  const [pendingAnchor, setPendingAnchor] = React.useState<string | null>(null);
  const [selectedReportSlug, setSelectedReportSlug] = React.useState<string | null>(null);
  const [activeReportTab, setActiveReportTab] = React.useState<ReportTab>("body");
  const [query, setQuery] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [timeRange, setTimeRange] = React.useState<TimeRange>("all");
  const [intelRecords, setIntelRecords] = useLocalIntelRecords();
  const [deletedRemoteIntelIds, setDeletedRemoteIntelIds] = useDeletedRemoteIntelIds();
  const [captureOpen, setCaptureOpen] = React.useState(false);
  const [editingIntelRecord, setEditingIntelRecord] = React.useState<IntelRecord | null>(null);
  const [pinnedIntelId, setPinnedIntelId] = React.useState<string | null>(null);
  const topbarRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const closeSearch = (event: MouseEvent) => {
      if (!topbarRef.current || topbarRef.current.contains(event.target as Node)) return;
      setSearchOpen(false);
    };
    document.addEventListener("mousedown", closeSearch);
    return () => document.removeEventListener("mousedown", closeSearch);
  }, []);

  React.useEffect(() => {
    if (!pendingAnchor) return;
    const timer = window.setTimeout(() => {
      document.getElementById(pendingAnchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingAnchor(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activePage, pendingAnchor]);

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
  const deletedRemoteIntelSet = new Set(deletedRemoteIntelIds);
  const visibleBaseRemoteIntelRecords = data.intel.filter((record) => !deletedRemoteIntelSet.has(record.id));
  const remoteIntelRecords = mergeRemoteIntelRecords(visibleBaseRemoteIntelRecords, intelRecords);
  const localOnlyIntelRecords = intelRecords.filter((record) => !data.intel.some((remoteRecord) => remoteRecord.id === record.id));
  const allIntelRecords = [...remoteIntelRecords, ...localOnlyIntelRecords];
  const handleDeleteIntel = (id: string) => {
    setIntelRecords((current) => current.filter((record) => record.id !== id));
    if (data.intel.some((record) => record.id === id)) {
      setDeletedRemoteIntelIds((current) => current.includes(id) ? current : [...current, id]);
    }
  };
  const searchResults = query.trim() ? searchDashboard(data, allIntelRecords, query, timeRange) : [];
  const hbmPressure = getHbmPressure(data);
  const priceSnapshots = getPriceSnapshots(data.prices);
  const navigatePage = (page: PageKey, anchorId?: string, reportTab?: ReportTab) => {
    setActivePage(page);
    if (reportTab) setActiveReportTab(reportTab);
    setPendingAnchor(anchorId ?? null);
    if (!anchorId) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const openSearchResult = (item: SearchItem) => {
    if (item.target.url) {
      window.open(item.target.url, "_blank", "noopener,noreferrer");
      setSearchOpen(false);
      return;
    }
    if (item.target.page === "intel" && item.target.recordId) {
      setPinnedIntelId(item.target.recordId);
    }
    if (item.target.reportSlug) setSelectedReportSlug(item.target.reportSlug);
    setActivePage(item.target.page);
    setSearchOpen(false);
    window.setTimeout(() => {
      const targetId = item.target.anchorId ?? (item.target.recordId ? `intel-${item.target.recordId}` : "");
      if (targetId) {
        window.history.replaceState(null, "", `#${targetId}`);
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
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
        <PageNav activePage={activePage} onNavigate={navigatePage} />
        <div className="source-status">
          <span className="status-dot"></span>
          <div>
            <strong>Action 生成</strong>
            <span>{formatDateTime(data.metadata.generated_at)}</span>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar" ref={topbarRef}>
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
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="搜索 DRAM、NAND、HBM、报告、产业链、情报"
              type="search"
            />
          </label>
          <div className="topbar-actions">
            <button className="ghost-button" type="button" onClick={() => exportIntelligence(data, allIntelRecords)}>导出情报</button>
            <button className="primary-button" type="button" onClick={() => setCaptureOpen(true)}>新增情报</button>
          </div>
          {query.trim() && searchOpen ? <SearchResults results={searchResults} timeRange={timeRange} onOpen={openSearchResult} onClear={() => { setQuery(""); setSearchOpen(false); }} /> : null}
        </header>

        <Hero data={data} latestReport={latestReport} />

        <section className="kpi-grid">
          {priceSnapshots.map((snapshot) => (
            <PriceKpiCard snapshot={snapshot} key={snapshot.label} />
          ))}
          <KpiCard icon={<Database />} label="DRAM 供给压力" value={hbmPressure.value} hint={hbmPressure.hint} />
        </section>

        {activePage === "overview" ? <OverviewPage data={data} intelRecords={allIntelRecords} /> : null}
        {activePage === "markets" ? <MarketsPage data={data} /> : null}
        {activePage === "industry" ? <IndustryPage data={data} /> : null}
        {activePage === "reports" ? (
          <ReportsPage
            latestReport={latestReport}
            reports={data.reports}
            selectedReport={selectedReport}
            activeTab={activeReportTab}
            onTabChange={setActiveReportTab}
            onSelectReport={(slug) => {
              setSelectedReportSlug(slug);
              setActiveReportTab("body");
            }}
          />
        ) : null}
        {activePage === "intel" ? (
          <IntelPage
            remoteRecords={remoteIntelRecords}
            localRecords={localOnlyIntelRecords}
            pinnedIntelId={pinnedIntelId}
            onAdd={() => setCaptureOpen(true)}
            onEdit={(record) => {
              setEditingIntelRecord(record);
              setCaptureOpen(true);
            }}
            onDelete={handleDeleteIntel}
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
              setIntelRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]);
              setCaptureOpen(false);
              setEditingIntelRecord(null);
            }}
          />
        ) : null}
      </main>
    </div>
  );
}

type NavSubItem = {
  label: string;
  anchorId: string;
  reportTab?: ReportTab;
};

function PageNav({ activePage, onNavigate }: { activePage: PageKey; onNavigate: (page: PageKey, anchorId?: string, reportTab?: ReportTab) => void }) {
  const pages: Array<{ key: PageKey; label: string; detail: string; subItems?: NavSubItem[] }> = [
    { key: "overview", label: "\u6982\u89c8", detail: "\u5173\u952e\u6307\u6807 / \u60c5\u62a5" },
    {
      key: "markets",
      label: "\u5e02\u573a\u56fe\u8868",
      detail: "\u4ef7\u683c\u4e0e\u80a1\u4ef7",
      subItems: [
        { label: "\u5b58\u50a8\u4ef7\u683c\u8d8b\u52bf\u56fe", anchorId: "markets-storage-prices" },
        { label: "\u673a\u6784\u56fe\u8868\u8ddf\u8e2a", anchorId: "markets-institutional-charts" },
        { label: "\u80a1\u7968\u4e0e ETF \u8d8b\u52bf\u56fe", anchorId: "markets-stock-trends" },
      ],
    },
    {
      key: "industry",
      label: "\u4ea7\u4e1a\u8ddf\u8e2a",
      detail: "\u957f\u534f / \u6269\u4ea7 / \u56fe\u8c31",
      subItems: [
        { label: "\u957f\u534f\u9501\u5b9a\u72b6\u6001", anchorId: "hbm-contract-board" },
        { label: "\u4e09\u5927\u5382\u6269\u4ea7\u80fd\u529b\u53d8\u5316", anchorId: "expansion-capacity-board" },
        { label: "\u4ea7\u4e1a\u94fe\u56fe\u8c31", anchorId: "industry-map" },
      ],
    },
    {
      key: "reports",
      label: "\u62a5\u544a\u5e93",
      detail: "\u65e5\u62a5 / \u5f52\u6863 / \u5bfc\u56fe",
      subItems: [
        { label: "\u62a5\u544a\u6b63\u6587", anchorId: "reports-top", reportTab: "body" },
        { label: "\u9886\u5148\u6307\u6807", anchorId: "reports-top", reportTab: "indicators" },
        { label: "\u65b0\u9896\u89c2\u70b9", anchorId: "reports-top", reportTab: "views" },
      ],
    },
    { key: "intel", label: "\u60c5\u62a5\u5e93", detail: "\u65b0\u589e / \u5220\u9664 / \u63a8\u9001" },
  ];
  return (
    <nav className="nav-list" aria-label="\u770b\u677f\u5206\u533a\u5bfc\u822a">
      {pages.map((page) => {
        const expanded = activePage === page.key && Boolean(page.subItems?.length);
        return (
          <div className={expanded ? "nav-group expanded" : "nav-group"} key={page.key}>
            <button
              className={activePage === page.key ? "nav-item active" : "nav-item"}
              onClick={() => onNavigate(page.key)}
              type="button"
            >
              <strong>{page.label}</strong>
              <span>{page.detail}</span>
            </button>
            {expanded ? (
              <div className="nav-sub-list" aria-label={page.label}>
                {page.subItems?.map((item) => (
                  <button className="nav-sub-item" key={`${item.anchorId}-${item.reportTab ?? item.label}`} onClick={() => onNavigate(page.key, item.anchorId, item.reportTab)} type="button">
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
function Hero({ data, latestReport }: { data: AppData; latestReport?: Report }) {
  const latestRating = splitRatingNote(latestReport?.rating ?? "");
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
          <strong>{latestRating.main || "待更新"}</strong>
          {latestRating.note ? <em>{latestRating.note}</em> : null}
          <small>
            {latestReport?.risk_level ? `${latestReport.risk_level}风险 · ` : ""}
            {latestReport?.date ?? formatDateTime(data.metadata.generated_at)}
          </small>
        </div>
      </div>
    </section>
  );
}

function OverviewPage({
  data,
  intelRecords,
}: {
  data: AppData;
  intelRecords: IntelRecord[];
}) {
  const latestStocks = data.stocks.latest.slice(0, 4);
  return (
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
      <section className="panel text-panel overview-events-panel">
        <div className="panel-header compact">
          <div>
            <p className="section-kicker">Major Timeline</p>
            <h2>重大事件时间线</h2>
          </div>
        </div>
        <MajorEventTimeline records={intelRecords} />
      </section>
      <section className="panel text-panel overview-theme-panel">
        <div className="panel-header compact">
          <div>
            <p className="section-kicker">Theme Watch</p>
            <h2>行业分析主题观察</h2>
          </div>
        </div>
        <IndustryThemeWatch records={intelRecords} />
      </section>
    </section>
  );
}

function MajorEventTimeline({ records }: { records: IntelRecord[] }) {
  const [pricingFilter, setPricingFilter] = React.useState<PricingFilter>("all");
  const pricingFilters: Array<{ key: PricingFilter; label: string }> = [
    { key: "all", label: "全部" },
    { key: "overpriced", label: "过度反应" },
    { key: "priced", label: "完全反应" },
    { key: "partial", label: "部分反应" },
    { key: "unpriced", label: "未反应" },
    { key: "failed", label: "反应失败" },
  ];
  const timelineKeywords = ["产能", "扩产", "投产", "量产", "晶圆", "长协", "谈判", "交付", "订单", "供给", "HBM", "HBM4", "capacity", "capex", "wafer", "fab", "supply"];
  const isTimelineRecord = (record: IntelRecord) => {
    const text = `${record.title} ${record.product} ${record.summary} ${record.transmission_path ?? ""}`.toLowerCase();
    return record.importance === "S" && timelineKeywords.some((keyword) => text.includes(keyword.toLowerCase()));
  };
  const majorRecords = records
    .filter(isTimelineRecord)
    .filter((record) => pricingFilter === "all" || record.pricing_status === pricingFilter)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  return (
    <>
      <div className="segmented-control filter-control" aria-label="股价反应状态筛选">
        {pricingFilters.map((item) => (
          <button className={pricingFilter === item.key ? "active" : ""} key={item.key} onClick={() => setPricingFilter(item.key)} type="button">
            {item.label}
          </button>
        ))}
      </div>
      {majorRecords.length ? (
        <div className="major-event-timeline">
          {majorRecords.map((record) => (
            <article
              className={`major-event-item ${record.url ? "clickable" : ""}`}
              key={record.id}
              role={record.url ? "link" : undefined}
              tabIndex={record.url ? 0 : undefined}
              onClick={() => openIntelUrl(record.url)}
              onKeyDown={(event) => handleIntelUrlKeyDown(event, record.url)}
            >
              <time>{record.date}</time>
              <div>
                <strong>{record.title}</strong>
                <p>{record.summary}</p>
                <small>{record.product || record.type} · {reactionTypeLabel(record.reaction_type)} · {pricingStatusLabel(record.pricing_status)}</small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">当前筛选下暂无 S 级产能、长协或关键时间线情报。</div>
      )}
    </>
  );
}

function IndustryThemeWatch({ records }: { records: IntelRecord[] }) {
  const focusRecords = records
    .filter((record) => ["S", "A"].includes(record.importance ?? ""))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);
  const themes = summarizeIndustryThemes(focusRecords).slice(0, 4);

  if (!themes.length) {
    return <div className="empty-state">等待小龙虾补充行业分析情报，用于归纳受益环节和地域。</div>;
  }

  return (
    <div className="theme-watch-list">
      {themes.map((theme) => (
        <article className="theme-watch-item" key={`${theme.segment}-${theme.region}`}>
          <div>
            <strong>{theme.segment}</strong>
            <span>{theme.region}</span>
          </div>
          <p>{theme.description}</p>
          <small>{theme.count} 条情报 · {theme.latestDate}</small>
        </article>
      ))}
    </div>
  );
}

function summarizeIndustryThemes(records: IntelRecord[]) {
  const buckets = new Map<string, { segment: string; region: string; count: number; latestDate: string; samples: string[] }>();
  records.forEach((record) => {
    const text = `${record.title} ${record.product} ${record.summary} ${record.transmission_path ?? ""}`.toLowerCase();
    const segment = inferIndustrySegment(text);
    const region = inferIndustryRegion(text);
    const key = `${segment}-${region}`;
    const current = buckets.get(key) ?? { segment, region, count: 0, latestDate: record.date, samples: [] };
    current.count += 1;
    current.latestDate = current.latestDate > record.date ? current.latestDate : record.date;
    if (current.samples.length < 2) current.samples.push(record.title);
    buckets.set(key, current);
  });
  return [...buckets.values()]
    .sort((a, b) => b.count - a.count || b.latestDate.localeCompare(a.latestDate))
    .map((bucket) => ({
      ...bucket,
      description: bucket.samples.join("；"),
    }));
}

function inferIndustrySegment(text: string) {
  if (/(equipment|tool|wafer|fab|material|substrate|packag|封装|设备|材料|晶圆|衬底|基板|上游)/i.test(text)) return "上游：设备 / 材料 / 封装";
  if (/(dram|nand|hbm|memory|原厂|三星|海力士|美光|中游)/i.test(text)) return "中游：存储原厂 / HBM";
  if (/(server|ai|gpu|手机|pc|消费|云|数据中心|下游)/i.test(text)) return "下游：AI 服务器 / 终端需求";
  return "产业链：综合影响";
}

function inferIndustryRegion(text: string) {
  if (/(中国|国内|长鑫|长存|a股|china|cxmt|ymtc)/i.test(text)) return "国内";
  if (/(海外|韩国|美国|日本|三星|海力士|美光|sk hynix|samsung|micron|nvidia|global)/i.test(text)) return "海外";
  return "全球";
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
          <b className={`stock-change-text ${stock.change_pct > 0 ? "up" : stock.change_pct < 0 ? "down" : "neutral"}`}>{stock.change_pct > 0 ? "+" : ""}{stock.change_pct}%</b>
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

      <section className="section-heading" id="markets-storage-prices">
        <div>
          <h2>存储价格</h2>
          <p>DRAM 和 NAND 现货价格、合约均价趋势，支持图例筛选和时间框选。</p>
        </div>
      </section>

      <section className="chart-grid">
        <Panel><Chart option={makePriceOption("DRAM 现货价格走势", data.prices.DRAM.spot)} /></Panel>
        <Panel><Chart option={makePriceOption("DRAM 合约平均价走势", data.prices.DRAM.contract_avg)} /></Panel>
        <Panel><Chart option={makePriceOption("NAND Flash 现货价格走势", data.prices.NAND.spot)} /></Panel>
        <Panel><Chart option={makePriceOption("NAND 合约平均价走势", data.prices.NAND.contract_avg)} /></Panel>
      </section>

      <InstitutionalChartTracker tracker={data.trackers.institutional_charts} />

      <section className="section-heading section-subheading" id="markets-stock-trends">
        <div>
          <h2>股票与 ETF 趋势图</h2>
          <p>SK海力士、三星电子、美光科技与 Roundhill Memory ETF 的近一年日收盘价走势。</p>
        </div>
      </section>

      <section className="stock-trend-grid">
        {data.stocks.latest.map((stock) => (
          <Panel id={`stock-${slugifyId(stock.ticker)}`} key={`${stock.ticker}-trend`}>
            <Chart option={makeStockTrendOption(stock, data.stocks.history)} />
          </Panel>
        ))}
      </section>
    </>
  );
}

function InstitutionalChartTracker({ tracker }: { tracker?: TrackerPayload["institutional_charts"] }) {
  const items = tracker?.items ?? [];
  const [preview, setPreview] = React.useState<(typeof items)[number] | null>(null);
  React.useEffect(() => {
    if (!preview) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [preview]);
  if (!items.length) return null;
  return (
    <>
      <section className="section-heading section-subheading" id="markets-institutional-charts">
        <div>
          <p className="section-kicker">Institutional Chart Watch</p>
          <h2>机构图表跟踪</h2>
          <p>跟踪研报、公众号和机构材料中的关键图表。</p>
        </div>
      </section>
      <section className="panel institutional-chart-panel">
        <div className="institutional-chart-panel-head">
          <p>{tracker?.note ?? tracker?.source ?? "机构图表资料"}</p>
          {tracker?.source_url ? (
            <a className="institutional-source-link" href={tracker.source_url} rel="noreferrer" target="_blank">打开原文</a>
          ) : null}
        </div>
        <div className="institutional-chart-grid">
          {items.map((item) => (
            <article className="institutional-chart-card" key={`${item.chart_no}-${item.title}`}>
              <div className="institutional-chart-title">
                <span>{item.chart_no}</span>
                <strong>{item.title}</strong>
              </div>
              <div className="institutional-chart-media">
                {item.image_url ? (
                  <button onClick={() => setPreview(item)} type="button">
                    <img alt={`${item.chart_no} ${item.title}`} src={item.image_url} />
                  </button>
                ) : (
                  <div>
                    <span>等待图表上传</span>
                    <small>{item.status}</small>
                  </div>
                )}
              </div>
              <div className="institutional-chart-foot">
                <span>{item.topic}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      {preview?.image_url ? (
        <div className="chart-preview-modal" role="dialog" aria-modal="true" aria-label={`${preview.chart_no} ${preview.title}`}>
          <button className="chart-preview-backdrop" onClick={() => setPreview(null)} type="button" aria-label="关闭预览" />
          <div className="chart-preview-frame">
            <div className="chart-preview-head">
              <strong>{preview.chart_no} · {preview.title}</strong>
              <button onClick={() => setPreview(null)} type="button">关闭</button>
            </div>
            <img alt={`${preview.chart_no} ${preview.title}`} src={preview.image_url} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function IndustryPage({ data }: { data: AppData }) {
  return (
    <>
      <section className="section-heading">
        <div>
          <h2>产业内容跟踪</h2>
          <p>HBM 长协锁定状态、DRAM 扩产能力变化与存储产业链图谱。</p>
        </div>
      </section>
      <HbmContractBoard tracker={data.trackers.hbm_contracts} />
      <ExpansionCapacityBoard tracker={data.trackers.expansion_capacity} />
      <IndustryMap map={data.trackers.industry_map} />
    </>
  );
}

function ReportsPage({
  latestReport,
  reports,
  selectedReport,
  activeTab,
  onTabChange,
  onSelectReport,
}: {
  latestReport?: Report;
  reports: Report[];
  selectedReport?: Report;
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
  onSelectReport: (slug: string) => void;
}) {
  return (
    <>
      <section className="section-heading section-heading-with-tabs" id="reports-top">
        <div className="section-title-block">
          <div className="section-title-row">
            <h2>深度报告跟踪</h2>
            <ReportTabs activeTab={activeTab} onChange={onTabChange} />
          </div>
          <p>每日行业观点、交易评价、风险提示与历史报告归档。</p>
        </div>
      </section>
      <section className="report-grid">
        <LatestReport report={selectedReport} isLatest={selectedReport?.slug === latestReport?.slug} activeTab={activeTab} />
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
      <b className={`price-change-badge ${snapshot.changePct > 0 ? "bullish" : snapshot.changePct < 0 ? "bearish" : "neutral"}`}>
        {sign}{snapshot.changePct.toFixed(2)}% / {sign}{formatPrice(snapshot.change)} {snapshot.unit}
      </b>
    </article>
  );
}

function Panel({ children, id }: { children: React.ReactNode; id?: string }) {
  return <section className="panel" id={id}>{children}</section>;
}

function HbmContractBoard({ tracker }: { tracker?: TrackerPayload["hbm_contracts"] }) {
  const companies = tracker?.companies ?? [];
  const stages = tracker?.stages ?? ["验证", "报价", "锁量", "签约", "交付"];
  const ranges = companies.map((company) => {
    const lockedUntil = getLockedUntilYear(company.locked_years, company.locked_until);
    const lockedRange = getLockedYearRange(company.locked_years, lockedUntil);
    const negotiationRange = getNegotiationRange(company, lockedUntil);
    return { lockedRange, negotiationRange };
  });
  const startYear = Math.min(...ranges.flatMap((item) => [item.lockedRange.start, item.negotiationRange.start]).filter(Boolean), 2025) || 2025;
  const maxYear = Math.max(...ranges.flatMap((item) => [item.lockedRange.end, item.negotiationRange.end]), startYear + 1);
  const years = Array.from({ length: maxYear - startYear + 1 }, (_, index) => startYear + index);

  if (!companies.length) {
    return null;
  }

  return (
    <section className="panel text-panel hbm-contract-board" id="hbm-contract-board">
      <div className="hbm-board-head">
        <div>
          <p className="eyebrow">HBM Contract Tracker</p>
          <h2>HBM 长协锁定状态</h2>
          <p>按公司拆成“已锁定”和“在谈中”两列，所有年份默认表示覆盖到对应年份年末。</p>
        </div>
        <small>更新：{tracker?.updated_at ?? "待更新"} · {tracker?.source ?? "manual tracker"}</small>
      </div>

      <div className="hbm-contract-grid">
        {companies.map((company) => {
          const lockedUntil = getLockedUntilYear(company.locked_years, company.locked_until);
          const lockedRange = getLockedYearRange(company.locked_years, lockedUntil);
          const negotiationRange = getNegotiationRange(company, lockedUntil);
          const capacityState = getCapacityLockState(company.locked_capacity);
          const capacitySegments = getCapacityLockSegments(company, lockedRange, capacityState);
          const stageIndexByName = stages.findIndex((stage) => stage === company.stage);
          const currentStageIndex = stageIndexByName >= 0 ? stageIndexByName : company.stage_index;
          const lockedPosition = rangePosition(lockedRange.start, lockedRange.end, startYear, maxYear);
          const negotiationPosition = rangePosition(negotiationRange.start, negotiationRange.end, startYear, maxYear);
          return (
            <article className="hbm-contract-card" id={`hbm-contract-${slugifyId(company.company)}`} key={company.company}>
              <div className="hbm-contract-head">
                <div>
                  <small>{company.ticker}</small>
                  <strong>{company.company}</strong>
                </div>
                <span className={`hbm-capacity-pill ${capacityState.tone}`}>{capacityState.label}</span>
              </div>

              <div className="hbm-contract-chart" style={{ ["--year-count" as string]: years.length }}>
                <div className="hbm-contract-axis">
                  <span />
                  {years.map((year) => <b key={`${company.company}-${year}`}>{year}</b>)}
                </div>

                <div className="hbm-contract-bar-row">
                  <span>签约覆盖</span>
                  <div className="hbm-contract-track">
                    <i className="locked" style={{ left: `${lockedPosition.left}%`, width: `${lockedPosition.width}%` }}>
                      {lockedRange.start}初-{lockedRange.end}末
                    </i>
                  </div>
                </div>

                <div className="hbm-contract-bar-row">
                  <span>正在谈</span>
                  <div className="hbm-contract-track">
                    <i className="negotiating" style={{ left: `${negotiationPosition.left}%`, width: `${negotiationPosition.width}%` }}>
                      {negotiationRange.start}初-{negotiationRange.end}末
                    </i>
                  </div>
                </div>

                <div className="hbm-contract-bar-row">
                  <span>产能锁定</span>
                  <div className="hbm-contract-track">
                    {capacitySegments.map((segment) => {
                      const position = rangePosition(segment.start, segment.end, startYear, maxYear);
                      return (
                        <i className={`capacity-lock ${segment.status}`} style={{ left: `${position.left}%`, width: `${position.width}%` }} title={segment.note ?? company.locked_capacity} key={`${company.company}-${segment.start}-${segment.end}-${segment.status}`}>
                          {segment.label}
                        </i>
                      );
                    })}
                  </div>
                </div>

              </div>

              <div className="hbm-contract-progress">
                <div className="hbm-progress-summary">
                  <span>谈判进度</span>
                  <strong>{company.stage}</strong>
                  <small title={company.stage_note}>{company.stage_note}</small>
                </div>
                <div className="hbm-progress-scale">
                  <div className="hbm-progress-steps">
                    {stages.map((stage, stageIndex) => (
                      <span className={stageIndex === currentStageIndex ? "current" : stageIndex < currentStageIndex ? "active" : ""} key={`${company.company}-${stage}`}>{stage}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="hbm-contract-foot">
                <span>{capacityState.summary}</span>
                <span title={company.negotiating}>{company.expected_term} · {negotiationRange.summary}</span>
              </div>
            </article>
          );
        })}
      </div>

    </section>
  );
}

function getLockedUntilYear(lockedYears: string, lockedUntil?: number | null) {
  if (Number.isFinite(lockedUntil)) return lockedUntil as number;
  const years = [...String(lockedYears).matchAll(/20\d{2}/g)].map((match) => Number(match[0]));
  return years.length ? Math.max(...years) : new Date().getFullYear();
}

function getLockedYearRange(lockedYears: string, fallbackEnd: number) {
  const years = [...String(lockedYears).matchAll(/20\d{2}/g)].map((match) => Number(match[0]));
  if (!years.length) return { start: fallbackEnd, end: fallbackEnd };
  return { start: Math.min(...years), end: Math.max(...years) };
}

function getNegotiationYears(company: NonNullable<NonNullable<TrackerPayload["hbm_contracts"]>["companies"]>[number]) {
  const text = company.negotiating;
  return [...new Set([...text.matchAll(/20\d{2}/g)].map((match) => Number(match[0])))].filter((year) => Number.isFinite(year));
}

function getNegotiationRange(company: NonNullable<NonNullable<TrackerPayload["hbm_contracts"]>["companies"]>[number], lockedUntil: number) {
  const years = getNegotiationYears(company).filter((year) => year >= new Date().getFullYear() - 1);
  const termYears = getExpectedTermYears(company.expected_term);
  const start = years.length ? Math.min(...years) : lockedUntil + 1;
  const explicitEnd = years.length ? Math.max(...years) : start;
  const end = years.length ? explicitEnd : Math.max(explicitEnd, start + Math.max(termYears - 1, 0));
  return {
    start,
    end,
    summary: `在谈 ${start}-${end}`,
  };
}

function getExpectedTermYears(value: string) {
  const numbers = [...String(value).matchAll(/\d+/g)].map((match) => Number(match[0]));
  return numbers.length ? Math.max(...numbers) : 2;
}

function rangePosition(start: number, end: number, minYear: number, maxYear: number) {
  const total = Math.max(maxYear - minYear + 1, 1);
  const left = ((Math.max(start, minYear) - minYear) / total) * 100;
  const width = ((Math.min(end, maxYear) - Math.max(start, minYear) + 1) / total) * 100;
  return { left, width: Math.max(width, 8) };
}

function getCapacityLockState(value: string) {
  const text = String(value || "");
  if (/售罄|sold\s*out|fully\s*sold/i.test(text)) {
    return { label: "产能已售罄", tone: "soldout", summary: "对应产能已售罄" };
  }
  if (/全[年部]|基本|高比例|100%|fully|承诺覆盖|高锁定/i.test(text)) {
    return { label: "产能高锁定", tone: "full", summary: "产能高比例锁定" };
  }
  if (/中|部分|争取|取决/i.test(text)) {
    return { label: "产能部分锁定", tone: "partial", summary: "产能仍有弹性" };
  }
  return { label: "产能待确认", tone: "watch", summary: "锁量待确认" };
}

function getCapacityLockSegments(
  company: NonNullable<NonNullable<TrackerPayload["hbm_contracts"]>["companies"]>[number],
  lockedRange: { start: number; end: number },
  fallbackState: { label: string; tone: string; summary: string },
) {
  const segments = company.capacity_lock_segments;
  if (segments?.length) {
    return segments.map((segment) => ({
      start: segment.start,
      end: segment.end,
      status: segment.status,
      label: segment.label ?? getCapacitySegmentLabel(segment.status),
      note: segment.note,
    }));
  }
  return [{
    start: lockedRange.start,
    end: lockedRange.end,
    status: fallbackState.tone,
    label: fallbackState.label,
    note: company.locked_capacity,
  }];
}

function getCapacitySegmentLabel(status: string) {
  if (status === "soldout") return "已售罄";
  if (status === "full") return "高锁定";
  if (status === "partial") return "部分锁定";
  return "待确认";
}

function ExpansionCapacityBoard({ tracker }: { tracker?: TrackerPayload["expansion_capacity"] }) {
  const companies = tracker?.companies ?? [];
  const categories: CapacityCategory[] = [
    { key: "dram", label: "DRAM", match: (product) => /dram|ddr|lpddr|hbm/i.test(product) },
  ];

  if (!companies.length) {
    return null;
  }

  const capacityModels = companies.map((company) => {
    const facilities = company.facilities ?? [];
    const baseFacilities = facilities.filter((item) => item.stage === "base");
    const expansionFacilities = facilities.filter((item) => item.stage === "expansion");
    const currentFacilities = baseFacilities.length ? baseFacilities : [{
      name: company.current_capacity.label,
      stage: "base" as const,
      products: company.products,
      value: company.current_capacity.value,
      unit: company.current_capacity.unit,
      display: company.current_capacity.display,
    }];
    const futureFacilities = facilities.length ? [...baseFacilities, ...expansionFacilities] : [{
      name: company.target_capacity.label,
      stage: "expansion" as const,
      products: company.products,
      value: company.target_capacity.value,
      unit: company.target_capacity.unit,
      display: company.target_capacity.display,
    }];
    const currentTotal = sumCapacity(currentFacilities);
    const futureTotal = sumCapacity(futureFacilities);
    return {
      company,
      categoryRows: categories.map((category) => getCapacityCategoryRow(category, baseFacilities, expansionFacilities)),
      hasStackData: currentTotal > 0 || futureTotal > 0,
    };
  });
  const globalMaxValue = Math.max(
    ...capacityModels
      .flatMap((model) => model.categoryRows.flatMap((row) => [row.currentTotal, row.futureTotal]))
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0),
    1,
  );

  return (
    <section className="panel text-panel expansion-capacity-board" id="expansion-capacity-board">
      <div className="hbm-board-head">
        <div>
          <p className="eyebrow">Capacity Expansion Tracker</p>
          <h2>三大厂扩产能力变化</h2>
          <p>按 DRAM 总产能对比三大厂现有与明确披露的新增产能，单位为万片/月；HBM 与 DDR4/DDR5 作为 DRAM 内部拆分口径保留在说明里。</p>
        </div>
        <small>更新：{tracker?.updated_at ?? "待更新"} · {tracker?.source ?? "manual tracker"}</small>
      </div>

      <div className="capacity-grid">
        {capacityModels.map(({ company, categoryRows, hasStackData }) => {
          return (
            <article className="capacity-card" id={`capacity-${slugifyId(company.company)}`} key={company.company}>
              <div className="hbm-company-top">
                <div>
                  <strong>{company.company}</strong>
                  <span>{company.ticker} · {company.region}</span>
                </div>
                <b>{company.status}</b>
              </div>

              <div className="capacity-bars">
                <div className="capacity-metric-line">口径：{company.capacity_metric}</div>
                {hasStackData ? (
                  <div className="capacity-category-chart">
                    {categoryRows.map((row) => (
                      <CapacityCategoryBlock key={`${company.company}-${row.key}`} maxValue={globalMaxValue} row={row} />
                    ))}
                  </div>
                ) : (
                  <div className="capacity-empty-bars">
                    <span>等待龙虾补充分工厂真实产能口径后自动生成堆积柱。</span>
                    <small>{company.current_capacity.display}</small>
                    <small>{company.target_capacity.display}</small>
                  </div>
                )}
              </div>

              <CapacityTimeline rows={categoryRows} timeline={company.timeline} confidence={company.confidence} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

type CapacityFacility = NonNullable<NonNullable<NonNullable<TrackerPayload["expansion_capacity"]>["companies"]>[number]["facilities"]>[number];
type CapacityCategory = {
  key: string;
  label: string;
  match: (product: string) => boolean;
};

type CapacityCategoryRow = {
  key: string;
  label: string;
  currentTotal: number;
  futureTotal: number;
  currentItems: CapacityFacility[];
  expansionItems: CapacityFacility[];
};

function CapacityCategoryBlock({ row, maxValue }: { row: CapacityCategoryRow; maxValue: number }) {
  const unit = getCapacityRowUnit(row);
  return (
    <div className="capacity-category-block">
      <div className="capacity-category-title">
        <strong>
          {row.label}
          {unit ? <em>{unit}</em> : null}
        </strong>
        <small>{row.expansionItems.length ? `扩产 ${row.expansionItems.length} 项` : "暂无明确扩产项"}</small>
      </div>
      <CapacityCategoryBar label="原有" tone="base" total={row.currentTotal} maxValue={maxValue} />
      <CapacityCategoryBar label="扩产后" tone="future" total={row.futureTotal} maxValue={maxValue} />
    </div>
  );
}

function CapacityCategoryBar({ label, tone, total, maxValue }: { label: string; tone: "base" | "future"; total: number; maxValue: number }) {
  const width = total ? Math.max(5, (total / maxValue) * 100) : 0;
  return (
    <div className={`capacity-category-row ${tone}`}>
      <span>{label}</span>
      <div className="capacity-category-track">
        {total ? <i style={{ width: `${width}%` }} /> : null}
      </div>
      <b>{total ? total.toLocaleString() : "待补充"}</b>
    </div>
  );
}

function getCapacityRowUnit(row: CapacityCategoryRow) {
  return [...row.currentItems, ...row.expansionItems].find((item) => item.unit)?.unit;
}

function CapacityTimeline({ rows, timeline, confidence }: { rows: CapacityCategoryRow[]; timeline: string; confidence: string }) {
  return (
    <div className="capacity-timeline">
      <div className="capacity-timeline-head">
        <span>扩产落地时间</span>
        <small>{timeline} · 置信度：{confidence}</small>
      </div>
      {rows.map((row) => (
        <div className="capacity-timeline-row" key={row.key}>
          <strong>{row.label}</strong>
          <div>
            {row.expansionItems.length ? row.expansionItems.map((item) => (
              <span title={item.display} key={`${row.key}-${item.name}`}>
                <b>{item.timeline ?? "时间待补充"}</b>
                <i>{item.name}</i>
                <em>{formatFacilityIncrement(item)}</em>
              </span>
            )) : <em className="capacity-empty-node">暂无明确扩产落地节点</em>}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatFacilityIncrement(item: CapacityFacility) {
  const value = Number(item.value ?? 0);
  if (!value) return item.note ?? "未披露";
  return `+${value.toLocaleString()} ${item.unit}`;
}

function getCapacityCategoryRow(category: CapacityCategory, baseFacilities: CapacityFacility[], expansionFacilities: CapacityFacility[]): CapacityCategoryRow {
  const currentItems = baseFacilities.filter((facility) => facility.products.some(category.match));
  const expansionItems = expansionFacilities.filter((facility) => facility.products.some(category.match));
  const currentTotal = sumCapacity(currentItems);
  return {
    key: category.key,
    label: category.label,
    currentTotal,
    futureTotal: currentTotal + sumCapacity(expansionItems),
    currentItems,
    expansionItems,
  };
}

function sumCapacity(facilities: CapacityFacility[]) {
  return facilities.reduce((sum, facility) => sum + (Number(facility.value ?? 0) || 0), 0);
}

function Timeline({ items }: { items: NonNullable<TrackerPayload["hbm4_negotiations"]> }) {
  return (
    <section className="panel text-panel">
      <h2>HBM4 长协谈判跟踪</h2>
      <div className="timeline">
        {items.map((item) => (
          <article id={`hbm-${slugifyId(`${item.date}-${item.title}`)}`} key={`${item.date}-${item.title}`}>
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
              <tr id={`expansion-${slugifyId(`${row.company}-${row.region}-${row.plan}`)}`} key={`${row.company}-${row.region}-${row.plan}`}>
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
    <section className="panel text-panel industry-map" id="industry-map">
      <div className="industry-map-head">
        <div>
          <h2>产业链图谱</h2>
          <p>存储产业链上游设备材料、中游存储原厂、下游 AI 服务器与终端需求公司。</p>
        </div>
        <small>{map?.updated_at ? `更新：${map.updated_at}` : "等待 clawbot 更新"}</small>
      </div>
      {layers.length ? (
        <div className="industry-map-grid">
          {layers.map((layer) => (
            <article className="industry-layer" key={layer.name}>
              <div className="industry-layer-head">
                <strong>{layer.name}</strong>
                {layer.description ? <p>{layer.description}</p> : null}
              </div>
              {(layer.groups?.length ? layer.groups : [{ name: "核心公司", nodes: layer.nodes ?? [] }]).map((group) => (
                <div className="industry-group" key={`${layer.name}-${group.name}`}>
                  <div className="industry-group-head">
                    <b>{group.name}</b>
                    {group.note ? <small>{group.note}</small> : null}
                  </div>
                  <div className="industry-node-list">
                    {sortIndustryNodes(group.nodes).map((node) => (
                      <IndustryCompanyCard node={node} groupName={group.name} layerName={layer.name} key={`${layer.name}-${group.name}-${node.name}`} />
                    ))}
                  </div>
                </div>
              ))}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-map">
          clawbot 后续可通过 PR 更新 content/trackers/industry_map.json，合并后这里会显示产业链图谱。
        </div>
      )}
      {map?.source ? <small>来源：{map.source}</small> : null}
    </section>
  );
}

function IndustryCompanyCard({ node, layerName, groupName }: { node: IndustryNode; layerName: string; groupName: string }) {
  const homepage = getValidCompanyHomepage(node);
  const logoUrl = getCompanyLogoUrl(node);
  const content = (
    <>
      <span className="industry-logo" aria-hidden="true">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            loading="lazy"
            onError={(event) => {
              const fallback = getCompanyLogoFallbackUrl(node);
              if (fallback && event.currentTarget.src !== fallback) {
                event.currentTarget.src = fallback;
                return;
              }
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <span>{node.name.slice(0, 1)}</span>
      </span>
      <span className="industry-company-body">
        <strong>{node.name}</strong>
        {node.role ? <em>{node.role}</em> : null}
        <small>{[node.region, node.ticker].filter(Boolean).join(" · ")}</small>
      </span>
    </>
  );

  if (!homepage) {
    return (
      <div className="industry-company static" title={node.name}>
        {content}
      </div>
    );
  }

  return (
    <a
      className="industry-company"
      href={homepage}
      target="_blank"
      rel="noreferrer"
      title={`${node.name} 官网`}
      aria-label={`${layerName} ${groupName} ${node.name}`}
    >
      {content}
    </a>
  );
}

function sortIndustryNodes(nodes: IndustryNode[]) {
  return [...nodes].sort((a, b) => industryNodePriority(a) - industryNodePriority(b) || a.name.localeCompare(b.name, "zh-CN"));
}

function industryNodePriority(node: IndustryNode) {
  const text = `${node.name} ${node.role ?? ""}`.toLowerCase();
  const priorityNames = [
    "samsung",
    "sk hynix",
    "micron",
    "asml",
    "applied materials",
    "lam research",
    "tokyo electron",
    "kla",
    "shin-etsu",
    "sumco",
    "sk siltron",
    "entegris",
    "merck",
    "tsmc",
    "ase",
    "amkor",
    "marvell",
    "phison",
    "silicon motion",
  ];
  const index = priorityNames.findIndex((name) => text.includes(name));
  if (index >= 0) return index;
  if (/china|中国|长鑫|长江|长电|通富|江波龙|佰维|雅克|鼎龙|广钢|盛美/.test(text)) return 80;
  return 50;
}

function getValidCompanyHomepage(node: { homepage?: string }) {
  if (!node.homepage) return undefined;
  const homepage = node.homepage.trim();
  if (!/^https?:\/\//i.test(homepage) || /security_verify/i.test(homepage)) return undefined;
  return homepage;
}

function getCompanyLogoUrl(node: { homepage?: string; logo_url?: string }) {
  return node.logo_url ?? getCompanyLogoFallbackUrl(node);
}

function getCompanyLogoFallbackUrl(node: { homepage?: string }) {
  const homepage = getValidCompanyHomepage(node);
  if (homepage) {
    return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(homepage)}&sz=64`;
  }
  return undefined;
}

function ReportTabs({ activeTab, onChange }: { activeTab: ReportTab; onChange: (tab: ReportTab) => void }) {
  return (
    <div className="report-tabs" role="tablist" aria-label="报告内容切换">
      <button className={activeTab === "body" ? "active" : ""} onClick={() => onChange("body")} type="button">报告正文</button>
      <button className={activeTab === "indicators" ? "active" : ""} onClick={() => onChange("indicators")} type="button">领先指标</button>
      <button className={activeTab === "views" ? "active" : ""} onClick={() => onChange("views")} type="button">新颖观点</button>
    </div>
  );
}

function LatestReport({ report, isLatest, activeTab }: { report?: Report; isLatest: boolean; activeTab: ReportTab }) {
  const [mindmapOpen, setMindmapOpen] = React.useState(false);

  React.useEffect(() => {
    setMindmapOpen(false);
  }, [report?.slug]);

  const rating = splitRatingNote(report?.rating ?? "");
  const showReportBody = activeTab === "body";
  const riskLevel = normalizeRiskLevel(report?.risk_level ?? "");

  return (
    <section className="panel text-panel report-main">
      {report ? (
        <>
          {showReportBody ? (
            <>
              <div className="report-head">
                <div>
                  <h2>{isLatest ? "最新深度报告" : "历史深度报告"}</h2>
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
                    <b className={`report-badge stance ${reportBadgeTone(rating.main)}`}>{rating.main}</b>
                    <b className={`report-badge risk ${riskBadgeTone(riskLevel)}`}>{riskLevel}风险</b>
                  </div>
                </div>
              </div>
              {rating.note ? <p className="report-rating-note">{rating.note}</p> : null}
              <p>{report.summary}</p>
              <MarkdownBody body={report.body} />
              {report.sources.length ? <small>来源：{report.sources.join("、")}</small> : null}
            </>
          ) : null}
          {activeTab === "indicators" ? <ReportIndicatorList items={report.insights?.leading_indicators ?? []} /> : null}
          {activeTab === "views" ? <ReportNovelViewList items={report.insights?.novel_views ?? []} /> : null}
          {report.mindmap && mindmapOpen ? (
            <MindmapModal mindmap={report.mindmap} onClose={() => setMindmapOpen(false)} />
          ) : null}
        </>
      ) : (
        <p>暂无报告。</p>
      )}
    </section>
  );
}

function splitRatingNote(value: string) {
  const text = String(value || "").trim();
  const match = text.match(/^(看多|看空|中性偏空|中性偏多|中性)(?:[（(](.+)[）)])?$/);
  if (match) return { main: normalizeReportRating(match[1]), note: match[2] ?? "" };
  return { main: normalizeReportRating(text), note: "" };
}

function normalizeReportRating(value: string) {
  const text = String(value || "").trim().replace(/[（(].*?[）)]/g, "");
  if (/看多|积极|乐观|偏多|中性偏多/.test(text)) return text.includes("中性偏多") ? "中性偏多" : "看多";
  if (/看空|谨慎|悲观|风险上升|偏空|中性偏空/.test(text)) return text.includes("中性偏空") ? "中性偏空" : "看空";
  return "中性";
}

function normalizeRiskLevel(value: string) {
  const text = String(value || "").trim();
  if (/高/.test(text) && /中/.test(text)) return "中高";
  if (/高/.test(text)) return "高";
  if (/低/.test(text)) return "低";
  return "中";
}

function reportBadgeTone(value: string) {
  if (value.includes("看多") || value.includes("偏多")) return "positive";
  if (value.includes("看空") || value.includes("偏空")) return "negative";
  return "neutral";
}

function riskBadgeTone(value: string) {
  if (value.includes("高")) return "negative";
  if (value.includes("低")) return "positive";
  return "neutral";
}

function ReportIndicatorList({ items }: { items: NonNullable<ReportInsights["leading_indicators"]> }) {
  if (!items.length) return <p className="empty-note">暂无领先指标。</p>;
  return (
    <div className="report-insight-list">
      {items.map((item, index) => (
        <article className="report-insight-card" key={`${item.indicator}-${index}`}>
          <header>
            <span>领先指标</span>
            <strong>{item.indicator}</strong>
          </header>
          <p>{item.usage}</p>
          <small>{item.transmission_path}</small>
          <footer>
            <b>{item.source}</b>
            {item.reference && item.reference !== "无" ? <em>{item.reference}</em> : null}
          </footer>
        </article>
      ))}
    </div>
  );
}

function ReportNovelViewList({ items }: { items: NonNullable<ReportInsights["novel_views"]> }) {
  if (!items.length) return <p className="empty-note">暂无新颖观点。</p>;
  return (
    <div className="report-insight-list">
      {items.map((item, index) => (
        <article className="report-insight-card" key={`${item.view}-${index}`}>
          <header>
            <span>{item.date || "观点"}</span>
            <strong>{item.view}</strong>
          </header>
          <p>{item.evidence}</p>
          <small>{item.validation}</small>
          <footer>
            <b>{item.source}</b>
          </footer>
        </article>
      ))}
    </div>
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
  const [expanded, setExpanded] = React.useState(depth < 4);
  if (depth === 0) {
    return (
      <div className="mindmap-root expanded" style={{ ["--depth" as string]: depth }}>
        <button className="mindmap-hub" aria-label={node.title} type="button" />
        {hasChildren ? (
          <div className="mindmap-children">
            {children.map((child, index) => (
              <MindmapTree node={child} depth={depth + 1} key={`${child.title}-${index}`} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }
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
      {reports.length ? (
        <div className="report-trend-chart" aria-label="报告观点与风险趋势">
          <Chart option={makeReportTrendOption(reports)} />
        </div>
      ) : null}
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
            <ArchiveReportMeta rating={report.rating} riskLevel={report.risk_level} />
          </button>
        )) : <p>暂无历史报告。</p>}
      </div>
    </section>
  );
}

function ArchiveReportMeta({ rating, riskLevel }: { rating: string; riskLevel: string }) {
  const parsed = splitRatingNote(rating);
  return (
    <span className="archive-meta">
      <b>{parsed.main} · {riskLevel}风险</b>
      {parsed.note ? <small>{parsed.note}</small> : null}
    </span>
  );
}

function MarkdownBody({ body }: { body: string }) {
  const blocks = parseMarkdownBlocks(body);
  return (
    <div className="markdown-body">
      {blocks.map((block, index) => renderMarkdownBlock(block, index))}
    </div>
  );
}

type MarkdownBlock =
  | { type: "h3" | "h4" | "p" | "blockquote"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; rows: string[][] };

function parseMarkdownBlocks(body: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];
  let table: string[][] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "p", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "ul", items: list });
      list = [];
    }
  };
  const flushTable = () => {
    if (table.length) {
      blocks.push({ type: "table", rows: table });
      table = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushTable();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushAll();
      continue;
    }
    if (/^---+$/.test(line)) {
      flushAll();
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushAll();
      continue;
    }
    if (line.startsWith("## ")) {
      flushAll();
      blocks.push({ type: "h3", text: line.replace(/^##\s+/, "") });
      continue;
    }
    if (line.startsWith("### ")) {
      flushAll();
      blocks.push({ type: "h4", text: line.replace(/^###\s+/, "") });
      continue;
    }
    if (line.startsWith("> ")) {
      flushAll();
      blocks.push({ type: "blockquote", text: line.replace(/^>\s+/, "") });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      flushTable();
      list.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }
    if (isMarkdownTableLine(line)) {
      flushParagraph();
      flushList();
      if (!isMarkdownTableDivider(line)) table.push(splitMarkdownTableRow(line));
      continue;
    }
    flushList();
    flushTable();
    paragraph.push(line);
  }
  flushAll();
  return blocks.filter((block) => block.type !== "p" || block.text);
}

function renderMarkdownBlock(block: MarkdownBlock, index: number) {
  if (block.type === "h3") return <h3 key={index}>{renderInlineMarkdown(block.text)}</h3>;
  if (block.type === "h4") return <h4 key={index}>{renderInlineMarkdown(block.text)}</h4>;
  if (block.type === "blockquote") return <blockquote key={index}>{renderInlineMarkdown(block.text)}</blockquote>;
  if (block.type === "ul") {
    return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineMarkdown(item)}</li>)}</ul>;
  }
  if (block.type === "table") {
    const [head = [], ...bodyRows] = block.rows;
    return (
      <div className="markdown-table-wrap" key={index}>
        <table>
          <thead><tr>{head.map((cell, cellIndex) => <th key={cellIndex}>{renderInlineMarkdown(cell)}</th>)}</tr></thead>
          <tbody>
            {bodyRows.map((row, rowIndex) => (
              <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{renderInlineMarkdown(cell)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <p key={index}>{renderInlineMarkdown(block.text)}</p>;
}

function renderInlineMarkdown(text: string) {
  const nodes: React.ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push(<strong key={`${match.index}-${match[1]}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : text;
}

function isMarkdownTableLine(line: string) {
  return line.startsWith("|") && line.endsWith("|") && line.split("|").length > 2;
}

function isMarkdownTableDivider(line: string) {
  return /^\|(?:\s*:?-+:?\s*\|)+$/.test(line);
}

function splitMarkdownTableRow(line: string) {
  return line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
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
            <span className={`pill ${normalizedImpact(record.impact)}`}>{impactLabel(record.impact)}</span>
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
  const [timeFilter, setTimeFilter] = React.useState<RadarTimeRange>("all");
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const filters: Array<{ key: ImpactFilter; label: string }> = [
    { key: "all", label: "全部" },
    { key: "bullish", label: "利多" },
    { key: "bearish", label: "利空" },
    { key: "neutral", label: "中性" },
  ];
  const timeFilters: Array<{ key: RadarTimeRange; label: string }> = [
    { key: "7d", label: "近7天" },
    { key: "30d", label: "近一个月" },
    { key: "all", label: "所有信息" },
  ];
  const anchor = new Date().toISOString();
  const timeScopedRecords = records
    .filter((record) => isWithinTimeRange(record.date, timeFilter, anchor))
    .sort(compareIntelRecordDateDesc);
  const filtered = timeScopedRecords.filter((record) => filter === "all" || normalizedImpact(record.impact) === filter);
  const total = timeScopedRecords.length || 1;
  React.useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [filter, timeFilter, filtered[0]?.id]);
  const distribution: Array<{ key: IntelRecord["impact"]; label: string }> = [
    { key: "bullish", label: "利多" },
    { key: "bearish", label: "利空" },
    { key: "neutral", label: "中性" },
  ];

  return (
    <div className="message-radar">
      <div className="radar-distribution" aria-label="利好利空分布">
        {distribution.map((item) => {
          const count = timeScopedRecords.filter((record) => normalizedImpact(record.impact) === item.key).length;
          const percent = timeScopedRecords.length ? Math.round((count / total) * 100) : 0;
          return (
            <div className={`distribution-row ${item.key}`} key={item.key}>
              <div className="distribution-fill" style={{ width: `${percent}%` }} />
              <span>{item.label}</span>
              <strong>{count} / {percent}%</strong>
            </div>
          );
        })}
      </div>
      <div className="radar-filter-row">
        <div className="segmented-control" aria-label="消息影响筛选">
          {filters.map((item) => (
            <button className={filter === item.key ? "active" : ""} key={item.key} onClick={() => setFilter(item.key)} type="button">
              {item.label}
            </button>
          ))}
        </div>
        <div className="segmented-control radar-time-filter" aria-label="消息时间范围筛选">
          {timeFilters.map((item) => (
            <button className={timeFilter === item.key ? "active" : ""} key={item.key} onClick={() => setTimeFilter(item.key)} type="button">
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {filtered.length ? (
        <div className="radar-list" key={`${filter}-${timeFilter}-${filtered[0]?.id ?? "empty"}`} ref={listRef}>
          {filtered.map((record) => (
            <article className={`radar-item ${record.url ? "clickable" : ""}`} key={record.id} role={record.url ? "link" : undefined} tabIndex={record.url ? 0 : undefined} onClick={() => openIntelUrl(record.url)} onKeyDown={(event) => handleIntelUrlKeyDown(event, record.url)}>
              <div>
                <span className={`pill ${normalizedImpact(record.impact)}`}>{impactLabel(record.impact)}</span>
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

function openIntelUrl(url?: string) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function handleIntelUrlKeyDown(event: React.KeyboardEvent<HTMLElement>, url?: string) {
  if (!url || (event.key !== "Enter" && event.key !== " ")) return;
  event.preventDefault();
  openIntelUrl(url);
}

function IntelPage({
  remoteRecords,
  localRecords,
  pinnedIntelId,
  onAdd,
  onEdit,
  onDelete,
  onExport,
}: {
  remoteRecords: IntelRecord[];
  localRecords: IntelRecord[];
  pinnedIntelId: string | null;
  onAdd: () => void;
  onEdit: (record: IntelRecord) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}) {
  return (
    <IntelTableContext.Provider value={{ onEdit, onDelete, pinnedIntelId }}>
      <section className="section-heading">
        <div>
          <h2>情报库管理</h2>
          <p>市场消息、公司事件、方向分类、定价状态与复核记录。</p>
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
            <p>结构化情报源文件，用于沉淀市场消息、事件分类、定价状态和复核记录。</p>
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
        <IntelTable records={remoteRecords} sourceLabel="Clawbot PR" onDelete={onDelete} />
      </section>

      <section className="panel text-panel">
        <div className="panel-header compact">
          <div>
            <p className="section-kicker">Local Intel</p>
            <h2>本地情报记录</h2>
          </div>
        </div>
        <IntelTable records={localRecords} sourceLabel="Browser Local" onEdit={onEdit} onDelete={onDelete} />
      </section>
    </IntelTableContext.Provider>
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

type IntelTableField = "date" | "type" | "impact" | "importance" | "reaction_type" | "pricing_status";
type IntelSortDirection = "asc" | "desc";
type IntelSortConfig = {
  field: IntelTableField;
  direction: IntelSortDirection;
};
type IntelFilterState = Partial<Record<IntelTableField, string>>;

const INTEL_FILTERABLE_COLUMNS: ReadonlyArray<{ field: IntelTableField; label: string; className: string }> = [
  { field: "date", label: "日期", className: "intel-col-date" },
  { field: "type", label: "类型", className: "intel-col-type" },
  { field: "impact", label: "方向", className: "intel-col-impact" },
  { field: "importance", label: "重要性", className: "intel-col-importance" },
  { field: "reaction_type", label: "反应类型", className: "intel-col-reaction" },
  { field: "pricing_status", label: "定价状态", className: "intel-col-pricing" },
];

function IntelTableHeaderCell({
  field,
  label,
  records,
  sortConfig,
  filterValue,
  onSort,
  onFilter,
}: {
  field: IntelTableField;
  label: string;
  records: IntelRecord[];
  sortConfig: IntelSortConfig;
  filterValue?: string;
  onSort: (field: IntelTableField) => void;
  onFilter: (field: IntelTableField, value: string) => void;
}) {
  const options = getIntelFilterOptions(records, field);
  const isSorted = sortConfig.field === field;
  const sortMark = isSorted ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕";
  return (
    <div className="intel-header-control">
      <button className={isSorted ? "active" : ""} type="button" onClick={() => onSort(field)} aria-label={`按${label}排序`}>
        <span>{label}</span>
        <small>{sortMark}</small>
      </button>
      <select value={filterValue ?? "all"} onChange={(event) => onFilter(field, event.target.value)} aria-label={`筛选${label}`}>
        <option value="all">全部</option>
        {options.map((option) => (
          <option value={option.value} key={option.value}>{option.label}</option>
        ))}
      </select>
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
  const tableContext = React.useContext(IntelTableContext);
  const effectiveOnEdit = onEdit ?? tableContext.onEdit;
  const effectiveOnDelete = onDelete ?? tableContext.onDelete;
  const pinnedIntelId = tableContext.pinnedIntelId;
  const [sortConfig, setSortConfig] = React.useState<IntelSortConfig>({ field: "date", direction: "desc" });
  const [columnFilters, setColumnFilters] = React.useState<IntelFilterState>({});
  const displayRecords = React.useMemo(() => {
    const filtered = records.filter((record) => {
      return INTEL_FILTERABLE_COLUMNS.every(({ field }) => {
        const filterValue = columnFilters[field];
        if (!filterValue || filterValue === "all") return true;
        if (field === "date") return isWithinTimeRange(record.date, filterValue as TimeRange, new Date().toISOString());
        return getIntelFieldValue(record, field) === filterValue;
      });
    });
    const sorted = [...filtered].sort((a, b) => compareIntelRecords(a, b, sortConfig));
    return pinnedIntelId
      ? sorted.sort((a, b) => (a.id === pinnedIntelId ? -1 : b.id === pinnedIntelId ? 1 : 0))
      : sorted;
  }, [columnFilters, pinnedIntelId, records, sortConfig]);
  const handleSort = (field: IntelTableField) => {
    setSortConfig((current) => ({
      field,
      direction: current.field === field ? (current.direction === "desc" ? "asc" : "desc") : field === "date" ? "desc" : "asc",
    }));
  };
  const handleFilter = (field: IntelTableField, value: string) => {
    setColumnFilters((current) => ({ ...current, [field]: value }));
  };
  const filterColumnByField = new Map(INTEL_FILTERABLE_COLUMNS.map((column) => [column.field, column]));

  if (!records.length) return <div className="empty-state">暂无{sourceLabel}情报。</div>;

  return (
    <div className="table-wrap intel-table-wrap">
      <table>
        <thead>
          <tr>
            {INTEL_FILTERABLE_COLUMNS.slice(0, 1).map((column) => (
              <th className={column.className} key={column.field}>
                <IntelTableHeaderCell
                  field={column.field}
                  label={column.label}
                  records={records}
                  sortConfig={sortConfig}
                  filterValue={columnFilters[column.field]}
                  onSort={handleSort}
                  onFilter={handleFilter}
                />
              </th>
            ))}
            <th>标题</th>
            {(["type", "impact", "importance", "reaction_type", "pricing_status"] as IntelTableField[]).map((field) => {
              const column = filterColumnByField.get(field)!;
              return (
                <th className={column.className} key={field}>
                  <IntelTableHeaderCell
                    field={field}
                    label={column.label}
                    records={records}
                    sortConfig={sortConfig}
                    filterValue={columnFilters[field]}
                    onSort={handleSort}
                    onFilter={handleFilter}
                  />
                </th>
              );
            })}
            <th>来源</th>
            <th>摘要</th>
            <th>跟踪</th>
            {effectiveOnEdit || effectiveOnDelete ? <th>操作</th> : null}
          </tr>
        </thead>
        <tbody>
          {displayRecords.length ? displayRecords.map((record) => (
            <tr id={`intel-${record.id}`} className={record.id === pinnedIntelId ? "pinned-intel-row" : ""} key={record.id}>
              <td>{record.date}</td>
              <td><strong>{record.title}</strong><br /><small>{record.product || "存储行业"}</small></td>
              <td>{record.type}</td>
              <td><span className={`pill ${normalizedImpact(record.impact)}`}>{impactLabel(record.impact)}</span></td>
              <td>{importanceLabel(record.importance)}</td>
              <td>{reactionTypeLabel(record.reaction_type)}</td>
              <td>{pricingStatusLabel(record.pricing_status)}</td>
              <td>{record.url ? <a href={record.url} target="_blank" rel="noreferrer">{record.source}</a> : record.source}</td>
              <td>{record.summary}</td>
              <td>
                <small>{horizonLabel(record.horizon)} · {confidenceLabel(record.confidence)}置信度 · {actionLabel(record.action)}</small>
                {record.review_date ? <><br /><small>复核：{record.review_date}</small></> : null}
              </td>
              {effectiveOnEdit || effectiveOnDelete ? (
                <td>
                  <div className="row-actions">
                    {effectiveOnEdit ? (
                      <button className="icon-button" type="button" aria-label={`编辑 ${record.title}`} onClick={() => effectiveOnEdit(record)}>
                        编辑
                      </button>
                    ) : null}
                    {effectiveOnDelete ? (
                      <button className="icon-button danger" type="button" aria-label={`删除 ${record.title}`} onClick={() => effectiveOnDelete(record.id)}>
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </div>
                </td>
              ) : null}
            </tr>
          )) : (
            <tr>
              <td colSpan={effectiveOnEdit || effectiveOnDelete ? 11 : 10}>
                <div className="empty-state compact">当前筛选条件下暂无{sourceLabel}情报。</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function LegacyIntelTable({
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
            <tr id={`intel-${record.id}`} key={record.id}>
              <td>{record.date}</td>
              <td><strong>{record.title}</strong><br /><small>{record.product || "存储行业"}</small></td>
              <td>{record.type}</td>
              <td><span className={`pill ${normalizedImpact(record.impact)}`}>{impactLabel(record.impact)}</span></td>
              <td>{importanceLabel(record.importance)}</td>
              <td>{reactionTypeLabel(record.reaction_type)}</td>
              <td>{pricingStatusLabel(record.pricing_status)}</td>
              <td>{record.url ? <a href={record.url} target="_blank" rel="noreferrer">{record.source}</a> : record.source}</td>
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
      url: String(form.get("url") || "").trim(),
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
          <label>类型<select name="type" defaultValue={record?.type ?? "消息"}><option>产品数据</option><option>行业分析</option><option>重大事件</option><option>消息</option><option>市场消息</option></select></label>
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
          <label>原文链接<input name="url" type="url" maxLength={300} placeholder="https://..." defaultValue={record?.url ?? ""} /></label>
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

function formatCapacityValue(metric: { value: number | null; unit: string }) {
  if (!Number.isFinite(metric.value)) return "待补充";
  return `${formatPrice(metric.value as number)} ${metric.unit}`;
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
  const companies = data.trackers.hbm_contracts?.companies ?? [];
  if (!companies.length) {
    return { value: "观察", hint: "等待 clawbot 更新 HBM 长协与锁量信息" };
  }

  const soldOutCount = companies.filter((company) =>
    (company.capacity_lock_segments ?? []).some((segment) => segment.status === "soldout"),
  ).length;
  const highLockCount = companies.filter((company) =>
    (company.capacity_lock_segments ?? []).some((segment) => segment.status === "full"),
  ).length;
  const signedCount = companies.filter((company) => company.stage_index >= 4).length;
  const lockUntilYears = companies
    .map((company) => company.locked_until)
    .filter((year): year is number => typeof year === "number" && Number.isFinite(year));
  const maxLockedUntil = lockUntilYears.length ? Math.max(...lockUntilYears) : null;
  const negotiationCount = companies.filter((company) => company.negotiating || company.expected_term).length;

  if (soldOutCount >= 2 || (soldOutCount >= 1 && highLockCount >= 1)) {
    return {
      value: "高",
      hint: `${soldOutCount} 家出现售罄，${highLockCount} 家高锁定；最长覆盖至 ${maxLockedUntil ?? "待更新"}`,
    };
  }

  if (signedCount >= 2 || highLockCount >= 2 || negotiationCount >= 2) {
    return {
      value: "中高",
      hint: `${signedCount} 家进入签约阶段，${negotiationCount} 家仍在谈后续长协`,
    };
  }

  return { value: "观察", hint: `${companies.length} 家已纳入长协跟踪，等待锁量确认` };
}

function mergeRemoteIntelRecords(remoteRecords: IntelRecord[], localRecords: IntelRecord[]) {
  const localById = new Map(localRecords.map((record) => [record.id, record]));
  return remoteRecords.map((record) => localById.get(record.id) ?? record);
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

function useDeletedRemoteIntelIds(): [string[], React.Dispatch<React.SetStateAction<string[]>>] {
  const [ids, setIds] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(INTEL_DELETED_REMOTE_KEY) || "[]") as string[];
    } catch {
      return [];
    }
  });
  React.useEffect(() => {
    localStorage.setItem(INTEL_DELETED_REMOTE_KEY, JSON.stringify(ids));
  }, [ids]);
  return [ids, setIds];
}

function searchDashboard(data: AppData, records: IntelRecord[], query: string, timeRange: TimeRange) {
  const needle = query.toLowerCase();
  const items: SearchItem[] = [];
  data.reports.forEach((report) => items.push({ type: "报告", title: report.title, date: report.date, detail: `${report.date} · ${report.summary}`, haystack: `${report.title} ${report.summary} ${report.body}`, target: { page: "reports", reportSlug: report.slug, anchorId: "reports-top" } }));
  data.stocks.latest.forEach((stock) => items.push({ type: "股票", title: stock.name, date: stock.date, detail: `${stock.ticker} ${stock.date} ${stock.close} ${stock.currency} ${stock.change_pct}%`, haystack: `${stock.name} ${stock.ticker} ${stock.exchange}`, target: { page: "markets", anchorId: `stock-${slugifyId(stock.ticker)}` } }));
  (data.trackers.institutional_charts?.items ?? []).forEach((item) => items.push({ type: "图表", title: `${item.chart_no} ${item.title}`, date: data.trackers.institutional_charts?.updated_at ?? data.metadata.generated_at, detail: `${item.topic} · ${item.status}`, haystack: `${item.chart_no} ${item.title} ${item.topic} ${item.note ?? ""}`, target: { page: "markets", anchorId: "markets-institutional-charts" } }));
  (data.trackers.hbm4_negotiations ?? []).forEach((item) => items.push({ type: "长协", title: item.title, date: item.date, detail: `${item.date} · ${item.detail}`, haystack: `${item.title} ${item.detail} ${item.status}`, target: { page: "industry", anchorId: `hbm-${slugifyId(`${item.date}-${item.title}`)}` } }));
  (data.trackers.expansion_plans ?? []).forEach((item) => items.push({ type: "扩产", title: item.company, date: dateFromText(item.timeline), detail: `${item.region} · ${item.plan} · ${item.timeline}`, haystack: `${item.company} ${item.region} ${item.plan} ${item.status}`, target: { page: "industry", anchorId: `expansion-${slugifyId(`${item.company}-${item.region}-${item.plan}`)}` } }));
  records.forEach((record) => items.push({ type: "情报", title: record.title, date: record.date, detail: `${record.date} · ${record.summary}`, haystack: `${record.title} ${record.product} ${record.source} ${record.url ?? ""} ${record.summary} ${importanceLabel(record.importance)} ${reactionTypeLabel(record.reaction_type)} ${pricingStatusLabel(record.pricing_status)} ${record.transmission_path ?? ""}`, target: record.url ? { page: "intel", url: record.url, recordId: record.id } : { page: "intel", anchorId: `intel-${record.id}`, recordId: record.id } } ));
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

function compareIntelRecordDateDesc(a: IntelRecord, b: IntelRecord) {
  return parseIntelRecordTime(b.date) - parseIntelRecordTime(a.date) || String(b.id).localeCompare(String(a.id));
}

function parseIntelRecordTime(value: string | undefined) {
  const text = String(value || "").trim();
  if (!text) return 0;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text.replace(/\//g, "-");
  const time = new Date(normalized).getTime();
  return Number.isFinite(time) ? time : 0;
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

function slugifyId(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
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
      url: record.url ?? "",
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
      url: "",
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
  const headers = ["date", "type", "title", "product", "impact", "importance", "reaction_type", "pricing_status", "horizon", "transmission_path", "confidence", "action", "review_date", "source", "url", "summary"];
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
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["bullish", "positive", "beneficial", "good", "利多", "利好", "看多", "正面"].includes(normalized)) return "bullish";
  if (["bearish", "negative", "adverse", "bad", "利空", "看空", "负面"].includes(normalized)) return "bearish";
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

function getIntelFilterOptions(records: IntelRecord[], field: IntelTableField) {
  if (field === "date") {
    return [
      { value: "7d", label: "近7天" },
      { value: "30d", label: "近30天" },
      { value: "90d", label: "近90天" },
    ];
  }
  if (field === "impact") {
    return [
      { value: "bullish", label: "利多" },
      { value: "bearish", label: "利空" },
      { value: "neutral", label: "中性" },
    ];
  }
  if (field === "importance") {
    return importanceOptions.map((option) => ({ value: option.value, label: option.label }));
  }
  if (field === "reaction_type") {
    return reactionTypeOptions.map((option) => ({ value: option.value, label: option.label }));
  }
  if (field === "pricing_status") {
    return pricingStatusOptions.map((option) => ({ value: option.value, label: option.label }));
  }
  return Array.from(new Set(records.map((record) => record.type || "未分类")))
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
    .map((value) => ({ value, label: value }));
}

function getIntelFieldValue(record: IntelRecord, field: IntelTableField) {
  if (field === "date") return record.date;
  if (field === "type") return record.type || "未分类";
  if (field === "impact") return normalizedImpact(record.impact);
  if (field === "importance") return record.importance ?? "";
  if (field === "reaction_type") return record.reaction_type ?? "";
  return record.pricing_status ?? "";
}

function compareIntelRecords(a: IntelRecord, b: IntelRecord, sortConfig: IntelSortConfig) {
  const direction = sortConfig.direction === "asc" ? 1 : -1;
  if (sortConfig.field === "date") {
    return direction * ((Date.parse(a.date) || 0) - (Date.parse(b.date) || 0));
  }
  const orderMaps: Partial<Record<IntelTableField, Record<string, number>>> = {
    impact: { bullish: 0, bearish: 1, neutral: 2 },
    importance: { S: 0, A: 1, B: 2, C: 3 },
    reaction_type: { instant: 0, undervalued: 1, sentiment: 2, archive: 3 },
    pricing_status: { unpriced: 0, partial: 1, priced: 2, overpriced: 3, failed: 4 },
  };
  const orderMap = orderMaps[sortConfig.field];
  if (orderMap) {
    const left = orderMap[getIntelFieldValue(a, sortConfig.field)] ?? 99;
    const right = orderMap[getIntelFieldValue(b, sortConfig.field)] ?? 99;
    if (left !== right) return direction * (left - right);
  }
  return direction * getIntelFieldValue(a, sortConfig.field).localeCompare(getIntelFieldValue(b, sortConfig.field), "zh-CN");
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
