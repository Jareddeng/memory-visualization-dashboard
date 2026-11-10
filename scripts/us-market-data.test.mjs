import assert from "node:assert/strict";
import test from "node:test";
import { loadUsMarketData, pairedRows } from "./us-market-data.mjs";

test("pairs valid dates only, mapping columns by indicator ID", () => {
  const rows = [
    ["指标ID", "RIGHT", "LEFT"],
    ["2026-11-06", 20, 90],
    ["2026-11-05", 21, 0],
    ["2026-11-04", null, 91],
    ["2026-11-03", "1,234.50", 92],
    ["2026-11-06", 0, 99],
  ];
  assert.deepEqual(pairedRows(rows, "LEFT", "RIGHT"), [
    { date: "2026-11-03", left: 92, right: 1234.5 },
    { date: "2026-11-06", left: 90, right: 20 },
  ]);
});

test("uses workbook calendar dates and positive paired observations", () => {
  const data = loadUsMarketData("edb_data/美股-总表.xlsx");
  for (const points of Object.values(data)) {
    assert.ok(points.length > 100);
    assert.ok(points.every((point, i) => point.left > 0 && point.right > 0 && (!i || point.date > points[i - 1].date)));
  }
});

test("keeps published pairs when absent from the new workbook", () => {
  const file = "edb_data/美股-总表.xlsx";
  const latest = loadUsMarketData(file).volatility.at(-1);
  const cached = { date: "1900-01-01", left: 52.131, right: 16.85 };
  const result = loadUsMarketData(file, {
    volatility: [cached, { ...latest, left: latest.left + 1 }],
  }).volatility;
  assert.deepEqual(result[0], cached);
  assert.deepEqual(result.at(-1), latest);
});
