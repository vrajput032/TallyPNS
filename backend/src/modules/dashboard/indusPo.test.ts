/**
 * Indus PO remaining: previous IAPL-003469 fills first, then IAPL-004031.
 * Run: npx tsx backend/src/modules/dashboard/indusPo.test.ts
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { SIZE_70MM_WITHOUT_CHUDI } from "../../lib/pipeSizes.js";
import {
  INDUS_PO,
  indusPoPdfPath,
  indusPoPushPayload,
  poLineSizeFor,
  poQuantity,
  previousPoQuantity,
  summarizeIndusPo,
} from "./indusPo.js";

assert.equal(poQuantity(), 64500);
assert.equal(previousPoQuantity(), 70000);
assert.equal(poLineSizeFor(70), 70);
assert.equal(poLineSizeFor(SIZE_70MM_WITHOUT_CHUDI), 70);
assert.equal(poLineSizeFor(45), 45);
assert.equal(poLineSizeFor(95), null);

for (const poNo of [INDUS_PO.previous.poNo, INDUS_PO.poNo]) {
  const pdf = indusPoPdfPath(poNo);
  assert.ok(pdf && existsSync(pdf), `missing PDF for ${poNo}`);
}
assert.equal(indusPoPdfPath("IAPL-000001"), null);
assert.equal(indusPoPdfPath("../../.env"), null);

function invoice(
  dateIso: string,
  items: { productId: string | null; sizeMm: number | null; quantity: number }[]
) {
  return {
    customerId: "indus-1",
    customerName: "INDUS APPLIANCES PRIVATE LIMITED",
    invoiceDate: new Date(dateIso),
    items,
  };
}

const lastPoInvoices = [
  invoice("2026-09-12T07:36:56Z", [{ productId: "pipe", sizeMm: 70, quantity: 10800 }]),
  invoice("2026-09-19T03:24:05Z", [
    { productId: "pipe", sizeMm: 70, quantity: 8800 },
    { productId: "pipe", sizeMm: 82, quantity: 2400 },
  ]),
  invoice("2026-09-24T03:36:49Z", [{ productId: "pipe", sizeMm: 82, quantity: 7500 }]),
  invoice("2026-09-28T05:18:52Z", [{ productId: "pipe", sizeMm: 70, quantity: 8400 }]),
  invoice("2026-10-01T04:00:00Z", [
    { productId: "pipe", sizeMm: 45, quantity: 5000 },
    { productId: "pipe", sizeMm: 70, quantity: 4400 },
  ]),
];

const lineSummary = (summary: ReturnType<typeof summarizeIndusPo>) =>
  summary.lines.map((line) => ({
    sizeMm: line.sizeMm,
    previousSupplied: line.previousSupplied,
    supplied: line.supplied,
  }));

const empty = summarizeIndusPo([]);
assert.equal(empty.previousPoNo, "IAPL-003469");
assert.equal(empty.previousPoQuantity, 70000);
assert.equal(empty.previousSupplied, 0);
assert.equal(empty.previousLeft, 70000);
assert.equal(empty.previousComplete, false);
assert.equal(empty.currentLeft, 64500);
assert.equal(empty.remaining, 134500);

// 70mm 32,400 of 40,000 · 82mm 9,900 of 20,000 · 45mm 5,000 of 10,000
const lastPoOnly = summarizeIndusPo(lastPoInvoices);
assert.equal(lastPoOnly.previousSupplied, 47300);
assert.equal(lastPoOnly.previousLeft, 22700);
assert.equal(lastPoOnly.supplied, 0);
assert.equal(lastPoOnly.remaining, 87200);
assert.equal(lastPoOnly.invoiceCount, 5);

// Bills after 4 Oct still go to the previous PO while it has pieces left.
const fillsPreviousFirst = summarizeIndusPo([
  ...lastPoInvoices,
  invoice("2026-10-05T06:00:00Z", [
    { productId: "pipe", sizeMm: 70, quantity: 2000 },
    { productId: "pipe", sizeMm: 82, quantity: 500 },
  ]),
]);
assert.equal(fillsPreviousFirst.previousSupplied, 49800);
assert.equal(fillsPreviousFirst.previousLeft, 20200);
assert.equal(fillsPreviousFirst.supplied, 0);
assert.equal(fillsPreviousFirst.remaining, 84700);

// 70mm overflows: 42,400 billed → 40,000 to the previous PO, 2,400 to the current one.
const overflow = summarizeIndusPo([
  ...lastPoInvoices,
  invoice("2026-10-06T06:00:00Z", [{ productId: "pipe", sizeMm: SIZE_70MM_WITHOUT_CHUDI, quantity: 10000 }]),
]);
assert.deepEqual(lineSummary(overflow), [
  { sizeMm: 70, previousSupplied: 40000, supplied: 2400 },
  { sizeMm: 45, previousSupplied: 5000, supplied: 0 },
  { sizeMm: 82, previousSupplied: 9900, supplied: 0 },
]);
assert.equal(overflow.previousLeft, 15100);
assert.equal(overflow.supplied, 2400);
assert.equal(overflow.currentLeft, 62100);
assert.equal(overflow.remaining, 77200);
assert.equal(overflow.previousComplete, false);

// Bills before the previous PO date, manual lines, and other sizes do not count.
const ignored = summarizeIndusPo([
  invoice("2026-09-01T06:00:00Z", [{ productId: "pipe", sizeMm: 70, quantity: 5000 }]),
  ...lastPoInvoices,
  invoice("2026-10-05T06:00:00Z", [
    { productId: null, sizeMm: null, quantity: 999 },
    { productId: "pipe", sizeMm: 95, quantity: 100 },
  ]),
]);
assert.equal(ignored.previousSupplied, 47300);
assert.equal(ignored.otherSupplied, 100);
assert.equal(ignored.remaining, 87200);

const done = summarizeIndusPo([
  ...lastPoInvoices,
  invoice("2026-10-08T06:00:00Z", [
    { productId: "pipe", sizeMm: 70, quantity: 50000 },
    { productId: "pipe", sizeMm: 45, quantity: 20000 },
    { productId: "pipe", sizeMm: 82, quantity: 50000 },
  ]),
]);
assert.equal(done.previousComplete, true);
assert.equal(done.remaining, 0);
assert.equal(indusPoPushPayload(done).title, `Indus PO ${INDUS_PO.poNo} is complete`);

const payload = indusPoPushPayload(lastPoOnly);
assert.equal(payload.title, "Indus PO: 87,200 pieces left");
assert.equal(payload.body, "Finish IAPL-003469 first: 22,700 left · then IAPL-004031: 64,500");
assert.equal(payload.url, "/");
assert.equal(payload.tag, "indus-po-remaining");

const previousDone = summarizeIndusPo([
  invoice("2026-09-10T06:00:00Z", [
    { productId: "pipe", sizeMm: 45, quantity: 10000 },
    { productId: "pipe", sizeMm: 70, quantity: 45000 },
    { productId: "pipe", sizeMm: 82, quantity: 20000 },
  ]),
]);
assert.equal(previousDone.previousComplete, true);
assert.equal(previousDone.supplied, 5000);
assert.equal(indusPoPushPayload(previousDone).body, "IAPL-004031: supplied 5,000 of 64,500");

console.log("indusPo tests passed");
