import XLSX from "xlsx";

const quoteRows = {
  date: "日期",
  underlying: "实时行情",
  strike: "理论行权价",
  contract: "合约代码",
  moneyness: "实际虚值",
  expiry: "最后交易日期",
  days: "剩余交易天数",
  settlement: "结算价",
  periodCost: "当期对冲成本",
  annualCost: "年化对冲成本",
  delta: "delta",
};

function displayDate(cell) {
  const text = String(cell?.w ?? cell?.v ?? "").trim();
  const long = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (long) return `${long[1]}-${long[2].padStart(2, "0")}-${long[3].padStart(2, "0")}`;
  const short = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (short) {
    const year = short[3].length === 2 ? Number(short[3]) + 2000 : Number(short[3]);
    return `${year}-${short[1].padStart(2, "0")}-${short[2].padStart(2, "0")}`;
  }
  if (cell?.v instanceof Date && !Number.isNaN(cell.v.getTime())) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(cell.v);
    const date = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${date.year}-${date.month}-${date.day}`;
  }
  return "";
}

function numberCell(cell, { positive = false } = {}) {
  if (!cell || cell.t === "e" || cell.v === null || cell.v === undefined || String(cell.v).trim() === "") return null;
  const value = typeof cell.v === "number" ? cell.v : Number(String(cell.v ?? "").replace(/,/g, ""));
  return Number.isFinite(value) && (!positive || value > 0) ? value : null;
}

function percentCell(cell) {
  const value = numberCell(cell);
  return value === null ? null : Math.round(value * 10000) / 100;
}

function textCell(cell) {
  const value = String(cell?.v ?? "").trim();
  return value && !/^#(?:N\/A|VALUE!|REF!|DIV\/0!|NUM!)$/i.test(value) ? value : null;
}

function getOptionQuotes(sheet) {
  if (!sheet) return [];
  const labels = new Map();
  for (let row = 2; row <= 30; row += 1) {
    const label = textCell(sheet[`B${row}`]);
    if (label) labels.set(label, row);
  }
  const cell = (key, col) => sheet[`${col}${labels.get(quoteRows[key])}`];
  if (!labels.has(quoteRows.date) || !labels.has(quoteRows.contract)) return [];

  return ["C", "D", "E", "F"].map((col) => {
    const kind = col === "F" ? "future" : "put";
    const underlying = numberCell(cell("underlying", col), { positive: true });
    const contract = textCell(cell("contract", col));
    const expiry = displayDate(cell("expiry", col));
    const days = numberCell(cell("days", col), { positive: true });
    const settlement = numberCell(cell("settlement", col), { positive: true });
    const validQuote = Boolean(underlying && contract && expiry && days && settlement);
    return {
      label: textCell(sheet[`${col}2`]) ?? col,
      kind,
      date: displayDate(cell("date", col)),
      underlying,
      strike: kind === "put" ? numberCell(cell("strike", col), { positive: true }) : null,
      contract,
      moneynessPct: kind === "put" ? percentCell(cell("moneyness", col)) : null,
      expiry: expiry || null,
      daysToExpiry: validQuote ? days : null,
      settlement: validQuote ? settlement : null,
      periodCostPct: validQuote ? percentCell(cell("periodCost", col)) : null,
      annualCostPct: validQuote ? percentCell(cell("annualCost", col)) : null,
      delta: kind === "put" && validQuote ? numberCell(cell("delta", col)) : null,
      status: validQuote ? "available" : "unavailable",
    };
  });
}

function getBasisPoints(sheet) {
  if (!sheet?.["!ref"]) return [];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const points = [];
  for (let row = range.s.r + 1; row <= range.e.r + 1; row += 1) {
    const date = displayDate(sheet[`A${row}`]);
    const value = numberCell(sheet[`B${row}`]);
    if (date && value !== null) points.push({ date, value: Math.round(value * 10000) / 10000 });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export function loadAShareData(workbookPath) {
  const workbook = XLSX.readFile(workbookPath, { cellDates: true });
  const quotes = getOptionQuotes(workbook.Sheets["期权实时成本"]);
  const basis = getBasisPoints(workbook.Sheets["中证1000年化基差"]);
  if (!quotes.length || !basis.length) throw new Error("A股工作簿缺少期权报价或中证1000基差数据");
  return {
    source: "Wind 工作簿缓存",
    quoteDate: quotes[0].date,
    quotes,
    basis: { name: "中证1000股指期货年化基差", unit: "%", points: basis },
  };
}

export function loadCrowdingData(workbookPath) {
  const workbook = XLSX.readFile(workbookPath, { cellDates: true });
  const sheet = workbook.Sheets["a_stock_crowding_real_6y_202010"];
  if (!sheet?.["!ref"]) throw new Error("A股拥挤度工作簿缺少数据工作表");

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const points = [];
  for (let row = range.s.r + 2; row <= range.e.r + 1; row += 1) {
    const date = displayDate(sheet[`A${row}`]);
    const top5 = numberCell(sheet[`H${row}`]);
    const top10 = numberCell(sheet[`I${row}`]);
    const top5Rank = numberCell(sheet[`J${row}`]);
    const top10Rank = numberCell(sheet[`K${row}`]);
    if (!date || [top5, top10, top5Rank, top10Rank].some((value) => value === null)) continue;
    if (top5Rank < 0 || top5Rank > 1 || top10Rank < 0 || top10Rank > 1) continue;
    points.push({
      date,
      top5,
      top10,
      top5Rank: Math.round(top5Rank * 10000) / 100,
      top10Rank: Math.round(top10Rank * 10000) / 100,
    });
  }
  if (!points.length) throw new Error("A股拥挤度工作簿缺少有效的近三年分位数据");
  return { source: "A股拥挤度工作簿", points: points.sort((a, b) => a.date.localeCompare(b.date)) };
}
