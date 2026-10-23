import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const monthlyCharts = [
  {
    id: "credit-growth",
    title: "社融及 M2 同比增速",
    file: "宏观-社融及M2同比增速.xlsx",
    sheet: "中国_社会融资规模存量_同比",
    totalSheet: "宏观-社融及M2同比增速",
    unit: "%",
    kind: "line",
    columns: [
      { header: "中国:社会融资规模存量:同比", name: "社融存量同比" },
      { header: "中国:M2:同比", name: "M2 同比" },
    ],
  },
  {
    id: "us-inflation",
    title: "美国通胀数据",
    file: "宏观-美国通胀数据.xlsx",
    sheet: "美国_PCE_同比",
    totalSheet: "宏观-美国通胀数据",
    unit: "%",
    kind: "line",
    columns: [
      { header: "美国:PCE:同比", name: "PCE 同比", zeroMissing: true },
      { header: "美国:核心PCE:同比", name: "核心 PCE 同比", zeroMissing: true },
      { header: "美国:CPI:季调:同比", name: "CPI 同比", zeroMissing: true },
      { header: "美国:核心CPI:季调:同比", name: "核心 CPI 同比", zeroMissing: true },
      { header: "美国:核心CPI:季调:环比", name: "核心 CPI 环比", parent: "核心 CPI 同比" },
      { header: "美国:CPI:季调:环比", name: "CPI 环比", parent: "CPI 同比" },
      { header: "美国:PCE:当月环比", name: "PCE 环比", parent: "PCE 同比" },
      { header: "美国:核心PCE:当月环比", name: "核心 PCE 环比", parent: "核心 PCE 同比" },
    ],
  },
  {
    id: "us-payroll",
    title: "新增非农就业人数及修正差值",
    file: "宏观-修正后非农12月移动平均减非农初值12月移动平均.xlsx",
    sheet: "美国_新增非农就业人数_季调",
    totalSheet: "宏观-修正后非农12月移动平均减非农初值12月移动平均",
    unit: "千人",
    kind: "line",
    columns: [
      { header: "美国:新增非农就业人数:季调", name: "新增非农就业" },
      { header: "美国新增非农就业人数修正差值", name: "修正差值" },
    ],
  },
  {
    id: "us-payroll-sectors",
    title: "非农就业细分项",
    file: "宏观-非农就业数据-细项.xlsx",
    sheet: "服务业",
    totalSheet: "宏观-非农就业数据-细项",
    unit: "千人",
    kind: "stacked-bar",
    columns: ["服务业", "采矿业", "建筑业", "制造业", "联邦政府", "州政府"].map((name) => ({ header: name, name })),
  },
];

const totalFile = "宏观-总表.xlsx";

function sourceFile(directory, legacyFile) {
  return fs.existsSync(path.join(directory, totalFile)) ? totalFile : legacyFile;
}

function workbookSheet(directory, file, sheetName, totalSheetName = sheetName) {
  const source = sourceFile(directory, file);
  const targetSheet = source === totalFile ? totalSheetName : sheetName;
  const workbook = XLSX.readFile(path.join(directory, source), { cellDates: true });
  const sheet = workbook.Sheets[targetSheet];
  if (!sheet?.["!ref"]) throw new Error(`${source} 缺少工作表 ${targetSheet}`);
  return sheet;
}

function text(cell) {
  return String(cell?.v ?? "").trim();
}

function number(cell) {
  if (!cell || cell.t === "e" || cell.v === null || cell.v === undefined || String(cell.v).trim() === "") return null;
  const value = Number(cell.v);
  return Number.isFinite(value) ? value : null;
}

function month(cell) {
  const match = String(cell?.w ?? cell?.v ?? "").match(/^(\d{4})[-/](\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}` : null;
}

function readMonthlyChart(directory, config) {
  const sheet = workbookSheet(directory, config.file, config.sheet, config.totalSheet);
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const columns = config.columns.map((column) => {
    for (let col = 1; col <= range.e.c; col += 1) {
      const letter = XLSX.utils.encode_col(col);
      if (text(sheet[`${letter}2`]) === column.header) return { ...column, letter };
    }
    throw new Error(`${config.file} 缺少指标列 ${column.header}`);
  });
  const rows = [];
  for (let row = 3; row <= range.e.r + 1; row += 1) {
    const date = month(sheet[`A${row}`]);
    if (!date) continue;
    const values = Object.fromEntries(columns.map((column) => {
      const value = number(sheet[`${column.letter}${row}`]);
      return [column.name, column.zeroMissing && value === 0 ? null : value];
    }));
    for (const column of columns) {
      if (column.parent && values[column.parent] === null) values[column.name] = null;
    }
    rows.push({ date, values });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  if (!rows.length || rows.every((row) => Object.values(row.values).every((value) => value === null))) {
    throw new Error(`${config.file} 缺少有效的月度数据`);
  }
  return {
    id: config.id, title: config.title, kind: config.kind, unit: config.unit,
    sourceFile: sourceFile(directory, config.file),
    series: columns.map((column) => ({
      name: column.name,
      points: rows.map((row) => ({ date: row.date, value: row.values[column.name] })),
    })),
    latestDate: rows.filter((row) => Object.values(row.values).some((value) => value !== null)).at(-1).date,
  };
}

function readSocialFinancing(directory) {
  const file = "宏观-新增人民币贷款和社融-当月值.xlsx";
  const sheet = workbookSheet(directory, file, "季节图_中国_社会融资规模_当月值", "宏观-新增社融_季节图_中国_社会融资规模_当月值");
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const series = [];
  for (let col = 1; col <= range.e.c; col += 1) {
    const letter = XLSX.utils.encode_col(col);
    const year = number(sheet[`${letter}3`]);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) continue;
    const points = [];
    for (let row = 5; row <= range.e.r + 1; row += 1) {
      const match = text(sheet[`A${row}`]).match(/^(\d{1,2})月$/);
      if (!match) continue;
      const value = number(sheet[`${letter}${row}`]);
      points.push({ date: match[1].padStart(2, "0"), value: value === 0 ? null : value });
    }
    series.push({ name: String(year), points });
  }
  if (!series.length || series.every((item) => item.points.every((point) => point.value === null))) {
    throw new Error(`${file} 缺少有效的社融当月值`);
  }
  const latest = series.at(-1);
  const lastMonth = latest.points.filter((point) => point.value !== null).at(-1)?.date;
  return {
    id: "social-financing", title: "中国社会融资规模：当月值", kind: "seasonal-line", unit: "亿元",
    sourceFile: sourceFile(directory, file), latestDate: lastMonth ? `${latest.name}-${lastMonth}` : null, series,
  };
}

export function loadMacroData(directory) {
  return {
    charts: [
      readSocialFinancing(directory),
      ...monthlyCharts.map((config) => readMonthlyChart(directory, config)),
    ],
  };
}
