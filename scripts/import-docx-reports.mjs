import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import JSZip from "jszip";

const root = process.cwd();
const inputDir = path.join(root, "reports");
const outputDir = path.join(root, "content", "reports");

await fs.mkdir(outputDir, { recursive: true });

const files = (await safeReadDir(inputDir))
  .filter((file) => file.toLowerCase().endsWith(".docx") && !file.startsWith("~$"))
  .sort();

for (const file of files) {
  const inputPath = path.join(inputDir, file);
  const date = dateFromFileName(file);
  if (!date) {
    console.warn(`Skip ${file}: cannot infer YYYYMMDD date from filename.`);
    continue;
  }

  const lines = await extractDocxLines(inputPath);
  const markdown = lines.join("\n\n");
  const title = inferTitle(lines, date);
  const sources = inferSources(lines);
  const summary = inferSummary(lines);
  const rating = normalizeReportRating(inferRating(markdown));
  const riskLevel = normalizeRiskLevel(inferRiskLevel(markdown));
  const body = buildBody(lines, title);
  const outputPath = path.join(outputDir, `${date}.md`);

  await fs.writeFile(
    outputPath,
    [
      "---",
      `title: "${escapeYaml(title)}"`,
      `date: "${date}"`,
      `rating: "${rating}"`,
      `risk_level: "${riskLevel}"`,
      `summary: "${escapeYaml(summary)}"`,
      `sources: [${sources.map((source) => `"${escapeYaml(source)}"`).join(", ")}]`,
      "---",
      "",
      body,
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`Imported ${file} -> content/reports/${date}.md`);
}

async function safeReadDir(dir) {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

function dateFromFileName(file) {
  const match = file.match(/(20\d{2})(\d{2})(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function normalizeMarkdown(markdown) {
  return markdown
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractDocxLines(inputPath) {
  const zip = await JSZip.loadAsync(await fs.readFile(inputPath));
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error(`Missing word/document.xml in ${inputPath}`);

  const paragraphs = [];
  for (const match of documentXml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)) {
    const text = extractParagraphText(match[0])
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    paragraphs.push(...text);
  }
  return paragraphs;
}

function extractParagraphText(xml) {
  const parts = [];
  const tokenPattern = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br(?:\s[^>]*)?\/>/g;
  for (const token of xml.matchAll(tokenPattern)) {
    if (token[0].startsWith("<w:t")) parts.push(decodeXml(token[1]));
    if (token[0].startsWith("<w:tab")) parts.push(" ");
    if (token[0].startsWith("<w:br")) parts.push("\n");
  }
  return parts.join("").replace(/[ \t]+/g, " ").trim();
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function inferTitle(lines, date) {
  const candidates = lines
    .map((line) => stripMarkdown(line))
    .filter((line) => line && !line.startsWith("好的，") && !/^报告日期[:：]/.test(line) && !/^数据来源[:：]/.test(line));
  return candidates[0] || `${date} 存储行业报告`;
}

function inferSources(lines) {
  const sourceLine = lines.map(stripMarkdown).find((line) => /^数据来源[:：]/.test(line));
  if (!sourceLine) return ["Word report import"];
  const text = sourceLine.replace(/^数据来源[:：]\s*/, "").replace(/等机构.*$/, "");
  const sources = text
    .split(/[、,，]/)
    .map((item) => item.trim().replace(/。$/, ""))
    .filter(Boolean);
  return sources.length ? sources : ["Word report import"];
}

function inferSummary(lines) {
  const cleaned = lines.map(stripMarkdown).filter(Boolean);
  const start = cleaned.findIndex((line) => /核心结论/.test(line));
  const candidates = cleaned.slice(start >= 0 ? start + 1 : 0).filter((line) => {
    if (/^\d+[.、]/.test(line)) return false;
    if (/^报告日期[:：]|^数据来源[:：]/.test(line)) return false;
    if (line.length < 24) return false;
    return true;
  });
  return truncate(candidates[0] || cleaned.find((line) => line.length >= 24) || "报告已导入，等待人工复核摘要。", 180);
}

function inferRating(markdown) {
  if (/积极|高景气|强景气|涨价|供需紧张|高仓位/.test(markdown)) return "积极";
  if (/风险上升|谨慎|警惕|承压|下行/.test(markdown)) return "谨慎";
  return "中性";
}

function inferRiskLevel(markdown) {
  if (/风险上升|高风险|大幅回落|需求不及预期|贸易摩擦/.test(markdown)) return "高";
  if (/波动|扰动|回调|不及预期|需警惕|风险/.test(markdown)) return "中";
  return "低";
}

function normalizeReportRating(value) {
  const text = String(value || "").trim().replace(/[（(].*?[）)]/g, "");
  if (/中性偏多/.test(text)) return "中性偏多";
  if (/中性偏空/.test(text)) return "中性偏空";
  if (/看多|积极|乐观|偏多/.test(text)) return "看多";
  if (/看空|谨慎|悲观|风险上升|偏空/.test(text)) return "看空";
  return "中性";
}

function normalizeRiskLevel(value) {
  const text = String(value || "").trim();
  if (/高/.test(text) && /中/.test(text)) return "中高";
  if (/高/.test(text)) return "高";
  if (/低/.test(text) && /中/.test(text)) return "中低";
  if (/低/.test(text)) return "低";
  return "中";
}

function buildBody(lines, title) {
  const bodyLines = [];
  for (const raw of lines) {
    const text = stripMarkdown(raw);
    if (!text || text === title || text.startsWith("好的，")) continue;
    if (/^报告日期[:：]/.test(text) || /^数据来源[:：]/.test(text)) {
      bodyLines.push(`> ${text}`);
      continue;
    }
    const heading = text.match(/^(\d+)[.、]\s*(.+)$/);
    if (heading) {
      bodyLines.push(`\n## ${heading[1]}. ${heading[2]}`);
      continue;
    }
    if (/^(子策略|子观点|观点|策略建议|支撑依据|具体标的|风险提示|交易评价)/.test(text)) {
      bodyLines.push(`\n### ${text}`);
      continue;
    }
    bodyLines.push(text);
  }
  return bodyLines.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function stripMarkdown(line) {
  return line.replace(/^#{1,6}\s*/, "").replace(/\*\*/g, "").trim();
}

function truncate(text, maxLength) {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

function escapeYaml(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
