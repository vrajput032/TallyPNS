/**
 * Factory P&L rates.
 * Run: npx tsx backend/src/lib/manufacturingPnl.test.ts
 */
import assert from "node:assert/strict";
import { SCRAP_PERCENT_OF_RM, scrapKgFromRmKg, scrapRateForGrade } from "./manufacturingPnl.js";

assert.equal(SCRAP_PERCENT_OF_RM, 12);
assert.equal(scrapKgFromRmKg(1000), 120);
assert.equal(scrapKgFromRmKg(500), 60);
assert.equal(scrapKgFromRmKg(0), 0);
assert.equal(scrapRateForGrade("iron87"), 30);
assert.equal(scrapRateForGrade("iron95"), 39);

console.log("manufacturingPnl tests ok");
