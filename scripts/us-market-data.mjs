import XLSX from "xlsx";

const charts = [
  { id: "volatility", sheet: "美股-股债波动率", left: "C7536898", right: "G0003892" },
  { id: "performance", sheet: "美股-股债表现", left: "G0000891", right: "G0001672" },
];

function dateKey(value, date1904) {
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value, { date1904 });
    if (date) return [date.y, date.m, date.d].map((part, index) => String(part).padStart(index ? 2 : 4, "0")).join("-");
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
  return null;
}

function positive(value) {
  const amount = typeof value === "string" ? Number(value.replace(/,/g, "").trim()) : value;
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function pairedRows(rows, leftId, rightId, date1904 = false) {
  const header = rows.findIndex((row) => row[0] === "指标ID");
  const left = rows[header]?.indexOf(leftId) ?? -1;
  const right = rows[header]?.indexOf(rightId) ?? -1;
  if (left < 1 || right < 1) throw new Error(`Missing indicator IDs: ${leftId}, ${rightId}`);
  const points = new Map();
  for (const row of rows.slice(header + 1)) {
    const date = dateKey(row[0], date1904);
    const a = positive(row[left]);
    const b = positive(row[right]);
    if (date && a !== null && b !== null) points.set(date, { date, left: a, right: b });
  }
  return [...points.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function loadUsMarketData(file) {
  const workbook = XLSX.readFile(file);
  return Object.fromEntries(charts.map(({ id, sheet, left, right }) => {
    const source = workbook.Sheets[sheet];
    if (!source) throw new Error(`Missing worksheet: ${sheet}`);
    const points = pairedRows(XLSX.utils.sheet_to_json(source, { header: 1, defval: null }), left, right, workbook.Workbook?.WBProps?.date1904);
    if (!points.length) throw new Error(`No paired observations: ${sheet}`);
    return [id, points];
  }));
}
