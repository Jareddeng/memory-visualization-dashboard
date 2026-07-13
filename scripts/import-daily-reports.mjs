import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import XLSX from "xlsx";

const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error("Usage: node scripts/import-daily-reports.mjs <source-dir>");
  process.exit(1);
}

const root = process.cwd();
const reportsDir = path.join(root, "content", "reports");
const insightsPath = path.join(root, "content", "report_insights.json");

const LABEL_RATING = "\u8bc4\u7ea7";
const LABEL_RISK = "\u98ce\u9669\u7b49\u7ea7";
const CORE_HEADING = "\u6838\u5fc3\u7ed3\u8bba";
const REPORT_TITLE = "\u5b58\u50a8\u884c\u4e1a\u65e5\u62a5";
const LEADING_FILE = "\u9886\u5148\u6307\u6807.xlsx";
const NOVEL_FILE = "\u65b0\u9896\u89c2\u70b9.xlsx";

function stripMarkdown(value) {
  return String(value || "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\[[^\]]+\]\([^\)]+\)/g, (match) => match.match(/^\[([^\]]+)/)?.[1] || match)
    .replace(/\s+/g, " ")
    .trim();
}

function yamlString(value) {
  return JSON.stringify(String(value || ""));
}

function extractLine(raw, label, fallback) {
  const re = new RegExp(`\\*\\*${label}[:\uff1a]([^*]+)\\*\\*`);
  return stripMarkdown(raw.match(re)?.[1] || fallback);
}

function normalizeReportRating(value) {
  const raw = String(value || "").trim();
  const note = raw.match(/[（(].*?[）)]/)?.[0] || "";
  const text = raw.replace(/[（(].*?[）)]/g, "");
  let rating = "中性";
  if (/中性偏多/.test(text)) rating = "中性偏多";
  else if (/中性偏空|中性偏谨慎|偏谨慎/.test(text)) rating = "中性偏空";
  else if (/看多|积极|乐观|偏多/.test(text)) rating = "看多";
  else if (/看空|谨慎|悲观|风险上升|偏空/.test(text)) rating = "看空";
  return `${rating}${note}`;
}

function normalizeRiskLevel(value) {
  const text = String(value || "").trim();
  if (/高/.test(text) && /中/.test(text)) return "中高";
  if (/高/.test(text)) return "高";
  if (/低/.test(text) && /中/.test(text)) return "中低";
  if (/低/.test(text)) return "低";
  return "中";
}

function extractSummary(raw) {
  const parts = raw.split(new RegExp(`##\\s*${CORE_HEADING}`));
  const text = parts[1] || raw;
  const lines = text
    .split(/\r?\n/)
    .map((line) => stripMarkdown(line))
    .filter((line) => line && !line.startsWith("---") && !line.startsWith("#"));
  return (lines.find((line) => line.length > 40) || lines[0] || "").slice(0, 220);
}

function normalizeReport(raw, date) {
  const rating = normalizeReportRating(extractLine(raw, LABEL_RATING, "\u4e2d\u6027"));
  const risk = normalizeRiskLevel(extractLine(raw, LABEL_RISK, "\u4e2d"));
  const summary = extractSummary(raw);
  const title = `${REPORT_TITLE} ${date}`;
  const body = raw
    .replace(new RegExp(`^#\\s*${REPORT_TITLE}(?:[_\\s-]*20\\d{6})?\\s*`, "u"), `# ${title}\n`)
    .trim()
    .replace(/[ \t]+$/gm, "");
  return [
    "---",
    `title: ${yamlString(title)}`,
    `date: ${date}`,
    `rating: ${yamlString(rating || "\u4e2d\u6027")}`,
    `risk_level: ${yamlString(risk || "\u4e2d")}`,
    `summary: ${yamlString(summary)}`,
    'sources: ["daily-depth-report-import"]',
    "---",
    "",
    body,
    "",
  ].join("\n");
}

function readSheet(file, mapper) {
  const workbook = XLSX.readFile(path.join(sourceDir, file));
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return rows.map(mapper).filter((item) => Object.values(item).some(Boolean));
}

const reportFiles = fs
  .readdirSync(sourceDir)
  .filter((name) => /20\d{6}/.test(name) && name.toLowerCase().endsWith(".md"))
  .sort();

for (const file of reportFiles) {
  const match = file.match(/(20\d{2})(\d{2})(\d{2})/);
  if (!match) continue;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const raw = fs.readFileSync(path.join(sourceDir, file), "utf8");
  fs.writeFileSync(path.join(reportsDir, `${date}.md`), normalizeReport(raw, date), "utf8");
}

const insights = {
  leading_indicators: readSheet(LEADING_FILE, (row) => ({
    indicator: String(row["\u6307\u6807"] || "").trim(),
    usage: String(row["\u5982\u4f55\u4f7f\u7528"] || "").trim(),
    transmission_path: String(row["\u4f20\u5bfc\u94fe\u6761"] || "").trim(),
    source: String(row["\u6765\u6e90"] || "").trim(),
    reference: String(row["\u51fa\u5904"] || "").trim(),
  })),
  novel_views: readSheet(NOVEL_FILE, (row) => ({
    view: String(row["\u89c2\u70b9"] || "").trim(),
    evidence: String(row["\u4f9d\u636e"] || "").trim(),
    date: String(row["\u53d1\u5e03\u65f6\u95f4"] || "").trim(),
    source: String(row["\u6765\u6e90"] || "").trim(),
    validation: String(row["\u540e\u7eed\u9a8c\u8bc1"] || "").trim(),
  })),
};

fs.writeFileSync(insightsPath, `${JSON.stringify(insights, null, 2)}\n`, "utf8");

console.log(`Imported ${reportFiles.length} reports`);
console.log(`Leading indicators: ${insights.leading_indicators.length}`);
console.log(`Novel views: ${insights.novel_views.length}`);
