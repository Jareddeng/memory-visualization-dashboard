import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import https from "node:https";
import XLSX from "xlsx";

const root = process.cwd();
const validateOnly = process.argv.includes("--validate-only");
const rawPriceDir = path.join(root, "data", "raw", "prices");
const processedDir = path.join(root, "data", "processed");
const publicProcessedDir = path.join(root, "public", "data", "processed");
const reportsDir = path.join(root, "content", "reports");
const trackersDir = path.join(root, "content", "trackers");
const intelDir = path.join(root, "content", "intel");

const allowedCategories = new Set(["DRAM", "NAND"]);
const allowedMarkets = new Set(["spot", "contract_avg"]);
const priceStartDate = process.env.PRICE_START_DATE || "2023-01-01";
const stockSymbols = [
  { ticker: "000660.KS", name: "SK海力士", exchange: "KRX", currency: "KRW" },
  { ticker: "005930.KS", name: "三星电子", exchange: "KRX", currency: "KRW" },
  { ticker: "MU", name: "美光科技", exchange: "NASDAQ", currency: "USD" },
  { ticker: "DRAM", name: "Roundhill Memory ETF", exchange: "NYSE Arca", currency: "USD" },
];

await fs.mkdir(processedDir, { recursive: true });
await fs.mkdir(publicProcessedDir, { recursive: true });

const prices = await loadPrices();
const reports = await loadReports();
const trackers = await loadTrackers();
const intel = await loadIntel();
const stocks = await loadStocks();
const metadata = {
  generated_at: new Date().toISOString(),
  price_points: prices.length,
  stock_points: stocks.history.length,
  latest_report_date: reports[0]?.date ?? null,
  notes: [
    "价格数据由 data/raw/prices CSV 或可识别的本地 XLSX 文件生成。",
    "若公开行情接口不可用，股票数据会回退到已有 data/processed/stocks.json。",
  ],
};

if (!validateOnly) {
  await writeJson("prices.json", groupPrices(prices));
  await writeJson("stocks.json", stocks);
  await writeJson("reports.json", { reports });
  await writeJson("trackers.json", trackers);
  await writeJson("intel.json", { records: intel });
  await writeJson("metadata.json", metadata);
}

console.log(JSON.stringify(metadata, null, 2));

async function loadPrices() {
  const records = [];
  records.push(...(await loadRemotePriceSources()));
  records.push(...(await loadCsvPrices()));
  records.push(...(await loadWorkbookPrices()));

  const byKey = new Map();
  for (const row of records) {
    const normalized = normalizePriceRow(row);
    const key = [normalized.date, normalized.category, normalized.market_type, normalized.spec].join("|");
    if (byKey.has(key)) {
      const existing = byKey.get(key);
      const existingIsSeed = isSeedSource(existing.source);
      const nextIsSeed = isSeedSource(normalized.source);
      if (existingIsSeed && !nextIsSeed) {
        byKey.set(key, normalized);
      } else if (!existingIsSeed && nextIsSeed) {
        continue;
      } else if ((normalized.source_rank ?? 0) > (existing.source_rank ?? 0)) {
        byKey.set(key, normalized);
      } else if ((normalized.source_rank ?? 0) < (existing.source_rank ?? 0)) {
        continue;
      } else {
        throw new Error(`价格数据重复: ${key}`);
      }
    } else {
      byKey.set(key, normalized);
    }
  }

  const normalizedRows = [...byKey.values()];
  const hasNonSeedRows = normalizedRows.some((row) => !isSeedSource(row.source));
  const rows = normalizedRows
    .filter((row) => (hasNonSeedRows ? !isSeedSource(row.source) : true))
    .filter((row) => row.date >= priceStartDate)
    .sort((a, b) =>
    `${a.category}|${a.market_type}|${a.spec}|${a.date}`.localeCompare(
      `${b.category}|${b.market_type}|${b.spec}|${b.date}`,
    ),
  );
  if (!rows.length) throw new Error("没有可用价格数据，请补充 data/raw/prices/*.csv。");
  return rows;
}

function isSeedSource(source) {
  return String(source || "").toLowerCase().includes("seed template");
}

async function loadRemotePriceSources() {
  const urls = parseRemotePriceUrls();
  const rows = [];
  for (const url of urls) {
    const text = await getText(url);
    const contentType = inferRemoteContentType(url, text);
    if (contentType === "json") {
      const parsed = JSON.parse(text);
      const records = Array.isArray(parsed) ? parsed : parsed.records || parsed.prices || [];
      if (!Array.isArray(records)) throw new Error(`Remote price JSON must be an array or contain records/prices: ${url}`);
      rows.push(...records.map((row) => ({ ...row, source: row.source || sourceNameFromUrl(url) })));
    } else {
      rows.push(...parseCsv(text).map((row) => ({ ...row, source: row.source || sourceNameFromUrl(url) })));
    }
  }
  return rows;
}

function parseRemotePriceUrls() {
  return String(process.env.PRICE_SOURCE_URLS || "")
    .split(/[\n,]+/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function inferRemoteContentType(url, text) {
  if (/\.json($|\?)/i.test(url)) return "json";
  if (/^\s*[\[{]/.test(text)) return "json";
  return "csv";
}

function sourceNameFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function loadCsvPrices() {
  const rows = [];
  let files = [];
  try {
    files = await fs.readdir(rawPriceDir);
  } catch {
    return rows;
  }

  for (const file of files.filter((name) => name.toLowerCase().endsWith(".csv"))) {
    const text = await fs.readFile(path.join(rawPriceDir, file), "utf8");
    rows.push(...parseCsv(text).map((row) => ({ ...row, file })));
  }
  return rows;
}

async function loadWorkbookPrices() {
  const rows = [];
  const workbookFiles = await findWorkbookFiles();
  for (const workbookFile of workbookFiles) {
    const workbook = XLSX.readFile(workbookFile.path, { cellDates: true });
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
      const inferred = inferWorkbookRows(workbookFile, sheetName, matrix);
      rows.push(...inferred);
    }
  }
  return rows;
}

async function findWorkbookFiles() {
  const locations = [
    { dir: root, rank: 1 },
    { dir: path.join(root, "edb_data"), rank: 2 },
  ];
  const files = [];
  for (const location of locations) {
    let names = [];
    try {
      names = await fs.readdir(location.dir);
    } catch {
      continue;
    }
    for (const name of names.filter((file) => file.toLowerCase().endsWith(".xlsx") && !file.startsWith("~$"))) {
      files.push({
        name,
        path: path.join(location.dir, name),
        rank: location.rank,
      });
    }
  }
  return files;
}

function inferWorkbookRows(workbookFile, sheetName, matrix) {
  if (!matrix.length || matrix.length < 2) return [];
  const headerIndex = matrix.findIndex((row) =>
    row.some((cell) => /date|日期|时间|指标/.test(String(cell).trim())),
  );
  if (headerIndex < 0) return [];

  const headers = matrix[headerIndex].map((cell) => String(cell).trim());
  const dateIndex = headers.findIndex((h) => /date|日期|时间|指标名称/i.test(h));
  if (dateIndex < 0) return [];

  const category = /nand/i.test(`${workbookFile.name} ${sheetName}`) ? "NAND" : "DRAM";
  const market_type = /合约/.test(`${workbookFile.name} ${sheetName}`) ? "contract_avg" : "spot";
  const source = "WIND";
  const unit = "USD";
  const output = [];

  for (let rowIndex = headerIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex];
    const date = normalizeDate(row[dateIndex]);
    if (!date) continue;
    headers.forEach((header, columnIndex) => {
      if (columnIndex === dateIndex) return;
      const value = parseNumber(row[columnIndex]);
      if (!Number.isFinite(value)) return;
      const spec = normalizeWorkbookSpec(header, category, market_type);
      if (!spec) return;
      output.push({
        date,
        category,
        market_type,
        spec,
        price: value,
        unit,
        source,
        source_rank: workbookFile.rank,
        note: "Imported from local workbook. Confirm unit/source before production use.",
      });
    });
  }
  return output;
}

function normalizeWorkbookSpec(header, category, marketType) {
  const text = String(header || "").trim();
  if (!text) return "";
  if (category === "DRAM") {
    const family = /DDR5/i.test(text) ? "DDR5" : /DDR4/i.test(text) ? "DDR4" : "";
    const density = text.match(/(8|16)Gb/i)?.[1];
    if (!family || !density) return "";
    if (/2Gx8|2G\*8/i.test(text)) return `${family} 8Gb x2 (2Gx8)`;
    if (/1Gx16/i.test(text)) return `${family} 16Gb (1Gx16)`;
    if (/1Gx8/i.test(text)) return `${family} 8Gb (1Gx8)`;
    if (/512Mx16/i.test(text)) return `${family} 8Gb (512Mx16)`;
    if (/SO-DIMM/i.test(text)) return `${family} ${density}Gb`;
    return `${family} ${density}Gb`;
  }
  if (category === "NAND") {
    if (/32Gb|4Gx8/i.test(text)) return "32GB (4GB x8)";
    if (/64Gb|8Gx8/i.test(text)) return "64GB (8GB x8)";
    if (marketType === "spot" && /128Gb|16Gx8/i.test(text)) return "128GB (16GB x8)";
    return "";
  }
  return text;
}

function normalizePriceRow(row) {
  const normalized = {
    date: normalizeDate(row.date),
    category: String(row.category ?? "").trim().toUpperCase(),
    market_type: String(row.market_type ?? "").trim(),
    spec: String(row.spec ?? "").trim(),
    price: parseNumber(row.price),
    unit: String(row.unit ?? "").trim(),
    source: String(row.source ?? "").trim(),
    source_rank: Number(row.source_rank ?? 0),
    note: String(row.note ?? "").trim(),
  };
  if (!normalized.date) throw new Error(`价格日期无效: ${JSON.stringify(row)}`);
  if (!allowedCategories.has(normalized.category)) throw new Error(`价格 category 无效: ${JSON.stringify(row)}`);
  if (!allowedMarkets.has(normalized.market_type)) throw new Error(`价格 market_type 无效: ${JSON.stringify(row)}`);
  if (!normalized.spec) throw new Error(`价格 spec 不能为空: ${JSON.stringify(row)}`);
  if (!Number.isFinite(normalized.price) || normalized.price < 0) throw new Error(`价格 price 无效: ${JSON.stringify(row)}`);
  if (!normalized.unit) throw new Error(`价格 unit 不能为空: ${JSON.stringify(row)}`);
  if (!normalized.source) throw new Error(`价格 source 不能为空: ${JSON.stringify(row)}`);
  return normalized;
}

function groupPrices(rows) {
  const groups = {};
  const specSorter = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
  for (const category of ["DRAM", "NAND"]) {
    groups[category] = {};
    for (const market of ["spot", "contract_avg"]) {
      const filtered = rows.filter((row) => row.category === category && row.market_type === market);
      const specs = [...new Set(filtered.map((row) => row.spec))].sort(specSorter.compare);
      groups[category][market] = {
        series: specs.map((spec) => ({
          spec,
          unit: filtered.find((row) => row.spec === spec)?.unit ?? "",
          points: filtered
            .filter((row) => row.spec === spec)
            .map(({ date, price, source, note }) => ({ date, price, source, note })),
        })),
      };
    }
  }
  return groups;
}

async function loadStocks() {
  const fallback = await readExistingJson("stocks.json");
  try {
    const histories = await Promise.all(stockSymbols.map(fetchStockHistory));
    const history = histories.flat().sort((a, b) => `${a.ticker}|${a.date}`.localeCompare(`${b.ticker}|${b.date}`));
    const latest = stockSymbols.map((stock) => {
      const rows = history.filter((row) => row.ticker === stock.ticker);
      return rows[rows.length - 1];
    }).filter(Boolean);
    return { latest, history, source: "Yahoo Finance chart API (daily close)", generated_at: new Date().toISOString() };
  } catch (error) {
    if (fallback) return { ...fallback, warning: `股票在线更新失败，使用既有数据: ${error.message}` };
    return { latest: [], history: [], source: "unavailable", warning: `股票在线更新失败: ${error.message}` };
  }
}

async function fetchStockHistory(stock) {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - 400 * 24 * 60 * 60;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stock.ticker)}?period1=${period1}&period2=${period2}&interval=1d`;
  const json = await getJson(url);
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`无股票数据: ${stock.ticker}`);
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const closes = quote.close ?? [];
  const timezone = result.meta?.exchangeTimezoneName || "UTC";
  const regularClose = result.meta?.currentTradingPeriod?.regular?.end;
  const now = new Date();
  const rows = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const close = closes[index];
    if (!Number.isFinite(close)) continue;
    const date = formatInTimeZone(new Date(timestamps[index] * 1000), timezone);
    if (isIncompleteTradingDay(date, timezone, regularClose, now)) continue;
    const previousRow = rows[rows.length - 1];
    const previous = previousRow?.close ?? close;
    const change = close - previous;
    rows.push({
      date,
      previous_date: previousRow?.date ?? null,
      ticker: stock.ticker,
      name: stock.name,
      exchange: stock.exchange,
      currency: stock.currency,
      price_basis: "completed_daily_close",
      close: round(close, 2),
      change: round(change, 2),
      change_pct: previous ? round((change / previous) * 100, 2) : 0,
    });
  }
  return rows;
}

function isIncompleteTradingDay(rowDate, timezone, regularClose, now) {
  if (!regularClose) return false;
  const today = formatInTimeZone(now, timezone);
  return rowDate === today && Math.floor(now.getTime() / 1000) < regularClose;
}

function formatInTimeZone(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function loadReports() {
  let files = [];
  try {
    files = await fs.readdir(reportsDir);
  } catch {
    return [];
  }
  const mindmaps = await loadReportMindmaps();
  const reports = [];
  for (const file of files.filter((name) => name.endsWith(".md"))) {
    const raw = await fs.readFile(path.join(reportsDir, file), "utf8");
    const parsed = parseMarkdownReport(raw);
    const date = parsed.frontmatter.date || file.replace(/\.md$/, "");
    reports.push({
      slug: file.replace(/\.md$/, ""),
      title: parsed.frontmatter.title || "未命名报告",
      date,
      rating: parsed.frontmatter.rating || "中性",
      risk_level: parsed.frontmatter.risk_level || "中",
      summary: parsed.frontmatter.summary || "",
      sources: parseListValue(parsed.frontmatter.sources),
      body: parsed.body.trim(),
      mindmap: mindmaps.get(date) ?? null,
    });
  }
  return reports.sort((a, b) => b.date.localeCompare(a.date));
}

async function loadReportMindmaps() {
  const mindmaps = new Map();
  let files = [];
  try {
    files = await fs.readdir(path.join(root, "reports"));
  } catch {
    return mindmaps;
  }
  for (const file of files.filter((name) => name.toLowerCase().endsWith(".txt"))) {
    const date = dateFromTextFileName(file);
    if (!date) continue;
    const raw = await fs.readFile(path.join(root, "reports", file), "utf8");
    const tree = parseMindmapMarkdown(raw, date);
    if (tree.children.length) {
      mindmaps.set(date, {
        title: tree.title,
        source_file: file,
        format: "markdown-outline",
        tree,
      });
    }
  }
  return mindmaps;
}

function dateFromTextFileName(file) {
  const match = file.match(/(20\d{2})(\d{2})(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function parseMindmapMarkdown(raw, date) {
  const rootNode = { title: `${date} 思维导图`, children: [] };
  const stack = [{ level: 0, node: rootNode }];
  for (const line of raw.replace(/\u00a0/g, " ").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parsed = parseMindmapLine(line);
    if (!parsed) continue;
    while (stack.length > 1 && stack[stack.length - 1].level >= parsed.level) stack.pop();
    const node = { title: parsed.title, children: [] };
    stack[stack.length - 1].node.children.push(node);
    stack.push({ level: parsed.level, node });
  }
  if (rootNode.children.length === 1 && rootNode.children[0].children.length) {
    rootNode.title = rootNode.children[0].title;
    rootNode.children = rootNode.children[0].children;
  }
  return rootNode;
}

function parseMindmapLine(line) {
  const heading = line.match(/^(#{1,6})\s+(.+)$/);
  if (heading) return { level: heading[1].length, title: cleanMindmapTitle(heading[2]) };

  const bullet = line.match(/^(\s*)[-*+]\s+(.+)$/);
  if (bullet) return { level: 6 + Math.floor(bullet[1].replace(/\t/g, "  ").length / 2), title: cleanMindmapTitle(bullet[2]) };

  const numbered = line.match(/^(\s*)\d+[.)、]\s+(.+)$/);
  if (numbered) return { level: 7 + Math.floor(numbered[1].replace(/\t/g, "  ").length / 2), title: cleanMindmapTitle(numbered[2]) };

  return null;
}

function cleanMindmapTitle(value) {
  return String(value).replace(/\*\*/g, "").trim();
}

async function loadTrackers() {
  const result = {};
  let files = [];
  try {
    files = await fs.readdir(trackersDir);
  } catch {
    return result;
  }
  for (const file of files.filter((name) => name.endsWith(".json"))) {
    result[file.replace(/\.json$/, "")] = JSON.parse(await fs.readFile(path.join(trackersDir, file), "utf8"));
  }
  return result;
}

async function loadIntel() {
  let files = [];
  try {
    files = await fs.readdir(intelDir);
  } catch {
    return [];
  }
  const rows = [];
  for (const file of files.filter((name) => name.endsWith(".json"))) {
    const raw = JSON.parse(await fs.readFile(path.join(intelDir, file), "utf8"));
    const records = Array.isArray(raw) ? raw : raw.records || [];
    if (!Array.isArray(records)) throw new Error(`情报 JSON 必须是数组或包含 records 数组: ${file}`);
    records.forEach((record, index) => rows.push(normalizeIntelRecord(record, file, index)));
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

function normalizeIntelRecord(record, file, index) {
  const date = normalizeDate(record.date);
  if (!date) throw new Error(`情报缺少有效日期: ${file} #${index + 1}`);
  const title = String(record.title || "").trim();
  const summary = String(record.summary || "").trim();
  if (!title || !summary) throw new Error(`情报缺少标题或摘要: ${file} #${index + 1}`);
  const impact = normalizeIntelImpact(record.impact);
  const importance = optionalAllowed(record.importance, ["S", "A", "B", "C"], `情报 importance 只能是 S/A/B/C: ${file} #${index + 1}`);
  const reactionType = optionalAllowed(record.reaction_type, ["instant", "undervalued", "sentiment", "archive"], `情报 reaction_type 无效: ${file} #${index + 1}`);
  const pricingStatus = optionalAllowed(record.pricing_status, ["unpriced", "partial", "priced", "overpriced", "failed"], `情报 pricing_status 无效: ${file} #${index + 1}`);
  const horizon = optionalAllowed(record.horizon, ["intraday", "1d", "1w", "1m", "1q", "longer"], `情报 horizon 无效: ${file} #${index + 1}`);
  const confidence = optionalAllowed(record.confidence, ["high", "medium", "low"], `情报 confidence 无效: ${file} #${index + 1}`);
  const action = optionalAllowed(record.action, ["alert", "watch", "deep_tracking", "archive"], `情报 action 无效: ${file} #${index + 1}`);
  return {
    id: String(record.id || `${file.replace(/\.json$/, "")}-${date}-${index + 1}`),
    type: String(record.type || "行业分析").trim(),
    impact,
    date,
    title,
    product: String(record.product || "").trim(),
    source: String(record.source || "clawbot").trim(),
    summary,
    importance,
    reaction_type: reactionType,
    pricing_status: pricingStatus,
    horizon,
    transmission_path: String(record.transmission_path || "").trim(),
    confidence,
    action,
    review_date: normalizeDate(record.review_date) || "",
  };
}

function normalizeIntelImpact(value) {
  const impact = String(value || "neutral").trim();
  if (impact === "mixed") return "neutral";
  assertAllowed(impact, ["bullish", "bearish", "neutral"], "情报 impact 只能是 bullish/bearish/neutral");
  return impact;
}

function assertAllowed(value, allowed, message) {
  if (!allowed.includes(value)) throw new Error(message);
}

function optionalAllowed(value, allowed, message) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  assertAllowed(normalized, allowed, message);
  return normalized;
}

function parseMarkdownReport(raw) {
  if (!raw.startsWith("---")) return { frontmatter: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return { frontmatter: {}, body: raw };
  const yaml = raw.slice(3, end).trim();
  const body = raw.slice(end + 4);
  const frontmatter = {};
  for (const line of yaml.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!match) continue;
    frontmatter[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
  }
  return { frontmatter, body };
}

function parseListValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let quoted = false;
  const pushCell = () => {
    row.push(current);
    current = "";
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      pushCell();
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      pushCell();
      pushRow();
    } else {
      current += char;
    }
  }
  if (current || row.length) {
    pushCell();
    pushRow();
  }
  const [headers, ...body] = rows.filter((item) => item.some((cell) => cell.trim() !== ""));
  if (!headers) return [];
  return body.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), cells[index]?.trim() ?? ""])),
  );
}

function normalizeDate(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  const numeric = String(value ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return numeric ? Number(numeric[0]) : Number.NaN;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function getJson(url) {
  const text = await getText(url);
  return JSON.parse(text);
}

async function getText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "storage-dashboard/0.1" } }, (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }
          resolve(data);
        });
      })
      .on("error", reject);
  });
}

async function readExistingJson(file) {
  try {
    return JSON.parse(await fs.readFile(path.join(processedDir, file), "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(file, data) {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(path.join(processedDir, file), text, "utf8");
  await fs.writeFile(path.join(publicProcessedDir, file), text, "utf8");
}
