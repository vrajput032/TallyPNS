/**
 * Factory P&L rates.
 * Run: npx tsx backend/src/lib/manufacturingPnl.test.ts
 */
import assert from "node:assert/strict";
import {
  SCRAP_PERCENT_OF_RM,
  SCRAP_RATE_PER_KG,
  buildMonthPnl,
  emptyMonthAggregates,
  monthLabel,
  scrapKgFromRmKg,
} from "./manufacturingPnl.js";

assert.equal(SCRAP_PERCENT_OF_RM, 12);
assert.equal(SCRAP_RATE_PER_KG, 30);
assert.equal(scrapKgFromRmKg(1000), 120);
assert.equal(scrapKgFromRmKg(500), 60);
assert.equal(scrapKgFromRmKg(0), 0);

const pnl = buildMonthPnl({
  ...emptyMonthAggregates(2026, 8),
  monthLabel: monthLabel(2026, 8),
  rmKg: 1000,
});
assert.equal(pnl.scrapRatePerKg, 30);
assert.equal(pnl.scrapKg, 120);
assert.equal(pnl.income.find((line) => line.id === "scrap")?.amount, 3600);
assert.match(pnl.income.find((line) => line.id === "scrap")?.label ?? "", /₹30\/kg/);

assert.equal(SCRAP_PERCENT_OF_RM, 12);
assert.equal(SCRAP_RATE_PER_KG, 30);
assert.equal(scrapKgFromRmKg(1000), 120);
assert.equal(scrapKgFromRmKg(500), 60);
assert.equal(scrapKgFromRmKg(0), 0);

console.log("manufacturingPnl tests ok");
