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

const allowedCategories = new Set(["DRAM", "NAND"]);
const allowedMarkets = new Set(["spot", "contract_avg"]);
const stockSymbols = [
  { ticker: "000660.KS", name: "SK海力士", exchange: "KRX", currency: "KRW" },
  { ticker: "005930.KS", name: "三星电子", exchange: "KRX", currency: "KRW" },
  { ticker: "MU", name: "美光科技", exchange: "NASDAQ", currency: "USD" },
];

await fs.mkdir(processedDir, { recursive: true });
await fs.mkdir(publicProcessedDir, { recursive: true });

const prices = await loadPrices();
const reports = await loadReports();
const trackers = await loadTrackers();
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
  await writeJson("metadata.json", metadata);
}

console.log(JSON.stringify(metadata, null, 2));

async function loadPrices() {
  const records = [];
  records.push(...(await loadCsvPrices()));
  records.push(...(await loadWorkbookPrices()));

  const byKey = new Map();
  for (const row of records) {
    const normalized = normalizePriceRow(row);
    const key = [
      normalized.date,
      normalized.category,
      normalized.market_type,
      normalized.spec,
      normalized.source,
    ].join("|");
    if (byKey.has(key)) {
      throw new Error(`价格数据重复: ${key}`);
    }
    byKey.set(key, normalized);
  }

  const rows = [...byKey.values()].sort((a, b) =>
    `${a.category}|${a.market_type}|${a.spec}|${a.date}`.localeCompare(
      `${b.category}|${b.market_type}|${b.spec}|${b.date}`,
    ),
  );
  if (!rows.length) throw new Error("没有可用价格数据，请补充 data/raw/prices/*.csv。");
  return rows;
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
  const files = (await fs.readdir(root)).filter((file) => file.toLowerCase().endsWith(".xlsx"));
  for (const file of files) {
    const workbook = XLSX.readFile(path.join(root, file), { cellDates: true });
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
      const inferred = inferWorkbookRows(file, sheetName, matrix);
      rows.push(...inferred);
    }
  }
  return rows;
}

function inferWorkbookRows(file, sheetName, matrix) {
  if (!matrix.length || matrix.length < 2) return [];
  const headerIndex = matrix.findIndex((row) =>
    row.some((cell) => /date|日期|时间|指标/.test(String(cell).trim())),
  );
  if (headerIndex < 0) return [];

  const headers = matrix[headerIndex].map((cell) => String(cell).trim());
  const dateIndex = headers.findIndex((h) => /date|日期|时间/.test(h));
  if (dateIndex < 0) return [];

  const category = /nand/i.test(`${file} ${sheetName}`) ? "NAND" : "DRAM";
  const market_type = /合约/.test(`${file} ${sheetName}`) ? "contract_avg" : "spot";
  const source = `本地Excel:${file}`;
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
      output.push({
        date,
        category,
        market_type,
        spec: header || sheetName,
        price: value,
        unit,
        source,
        note: "由本地Excel自动识别生成，请按实际单位校正 unit 字段。",
      });
    });
  }
  return output;
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
  for (const category of ["DRAM", "NAND"]) {
    groups[category] = {};
    for (const market of ["spot", "contract_avg"]) {
      const filtered = rows.filter((row) => row.category === category && row.market_type === market);
      groups[category][market] = {
        series: [...new Set(filtered.map((row) => row.spec))].map((spec) => ({
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
    return { latest, history, source: "Yahoo Finance chart API", generated_at: new Date().toISOString() };
  } catch (error) {
    if (fallback) return { ...fallback, warning: `股票在线更新失败，使用既有数据: ${error.message}` };
    return { latest: [], history: [], source: "unavailable", warning: `股票在线更新失败: ${error.message}` };
  }
}

async function fetchStockHistory(stock) {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - 180 * 24 * 60 * 60;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stock.ticker)}?period1=${period1}&period2=${period2}&interval=1d`;
  const json = await getJson(url);
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`无股票数据: ${stock.ticker}`);
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const closes = quote.close ?? [];
  const rows = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const close = closes[index];
    if (!Number.isFinite(close)) continue;
    const previous = rows[rows.length - 1]?.close ?? close;
    const change = close - previous;
    rows.push({
      date: new Date(timestamps[index] * 1000).toISOString().slice(0, 10),
      ticker: stock.ticker,
      name: stock.name,
      exchange: stock.exchange,
      currency: stock.currency,
      close: round(close, 2),
      change: round(change, 2),
      change_pct: previous ? round((change / previous) * 100, 2) : 0,
    });
  }
  return rows;
}

async function loadReports() {
  let files = [];
  try {
    files = await fs.readdir(reportsDir);
  } catch {
    return [];
  }
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
    });
  }
  return reports.sort((a, b) => b.date.localeCompare(a.date));
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
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
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
