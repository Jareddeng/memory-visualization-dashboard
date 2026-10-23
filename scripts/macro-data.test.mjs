import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { loadMacroData } from "./macro-data.mjs";

const { charts } = loadMacroData(path.join(process.cwd(), "edb_data"));

test("macro charts follow the dashboard review order", () => {
  assert.deepEqual(charts.map((chart) => chart.id), [
    "us-payroll", "us-unemployment", "us-payroll-sectors", "us-inflation-yoy",
    "us-inflation-mom", "us-bond-yields", "credit-growth", "new-loans", "social-financing",
  ]);
});

test("unpublished seasonal months and inflation placeholders remain missing", () => {
  const loans = charts.find((chart) => chart.id === "new-loans");
  const currentYear = loans.series.at(-1);
  assert(currentYear.points.some((point) => point.value !== null));
  assert(currentYear.points.every((point) => point.value !== 0));

  const inflation = charts.find((chart) => chart.id === "us-inflation-yoy");
  assert(inflation.series.find((series) => series.name === "PCE 同比")
    .points.every((point) => point.value !== 0));
});

test("policy-rate zero placeholders carry the preceding announced rate", () => {
  const bonds = charts.find((chart) => chart.id === "us-bond-yields");
  const policy = bonds.series.find((series) => series.name === "联邦基金目标利率上限");
  assert(policy.points.every((point) => point.value === null || point.value > 0));
  assert(policy.points.at(-1).value > 0);
  assert(policy.points.some((point, index) => index > 0 && point.value === policy.points[index - 1].value));
});
