/**
 * Indus PO remaining (IAPL-004031 + leftover from 4 Sep–4 Oct PO).
 * Run: npx tsx backend/src/modules/dashboard/indusPo.test.ts
 */
import assert from "node:assert/strict";
import { SIZE_70MM_WITHOUT_CHUDI } from "../../lib/pipeSizes.js";
import {
  currentSuppliedFrom,
  INDUS_PO,
  indusPoPushPayload,
  poLineSizeFor,
  poQuantity,
  summarizeIndusPo,
} from "./indusPo.js";

assert.equal(poQuantity(), 64500);
assert.equal(currentSuppliedFrom(), "2026-10-05");
assert.equal(poLineSizeFor(70), 70);
assert.equal(poLineSizeFor(SIZE_70MM_WITHOUT_CHUDI), 70);
assert.equal(poLineSizeFor(45), 45);
assert.equal(poLineSizeFor(95), null);

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

const empty = summarizeIndusPo([]);
assert.equal(empty.previousPoQuantity, 70000);
assert.equal(empty.previousSupplied, 0);
assert.equal(empty.lastMonthLeft, 70000);
assert.equal(empty.target, 134500);
assert.equal(empty.supplied, 0);
assert.equal(empty.remaining, 134500);

const lastPoOnly = summarizeIndusPo(lastPoInvoices);
assert.equal(lastPoOnly.previousSupplied, 47300);
assert.equal(lastPoOnly.lastMonthLeft, 22700);
assert.equal(lastPoOnly.supplied, 0);
assert.equal(lastPoOnly.remaining, 87200);
assert.equal(lastPoOnly.invoiceCount, 0);
assert.deepEqual(
  lastPoOnly.lines.map((line) => line.supplied),
  [0, 0, 0]
);

const afterWindow = summarizeIndusPo([
  ...lastPoInvoices,
  invoice("2026-10-05T06:00:00Z", [
    { productId: "pipe", sizeMm: 70, quantity: 2000 },
    { productId: "pipe", sizeMm: 82, quantity: 500 },
  ]),
]);
assert.equal(afterWindow.previousSupplied, 47300);
assert.equal(afterWindow.lastMonthLeft, 22700);
assert.equal(afterWindow.supplied, 2500);
assert.equal(afterWindow.remaining, 84700);
assert.equal(afterWindow.invoiceCount, 1);
assert.deepEqual(
  afterWindow.lines.map((line) => ({ sizeMm: line.sizeMm, supplied: line.supplied })),
  [
    { sizeMm: 70, supplied: 2000 },
    { sizeMm: 45, supplied: 0 },
    { sizeMm: 82, supplied: 500 },
  ]
);

const ignoresManualAndOther = summarizeIndusPo([
  ...lastPoInvoices,
  invoice("2026-10-05T06:00:00Z", [
    { productId: null, sizeMm: null, quantity: 999 },
    { productId: "pipe", sizeMm: 95, quantity: 100 },
  ]),
]);
assert.equal(ignoresManualAndOther.supplied, 100);
assert.equal(ignoresManualAndOther.otherSupplied, 100);
assert.equal(ignoresManualAndOther.remaining, 87100);

const done = summarizeIndusPo([
  ...lastPoInvoices,
  invoice("2026-10-05T06:00:00Z", [{ productId: "pipe", sizeMm: 70, quantity: 90000 }]),
]);
assert.equal(done.remaining, 0);
assert.equal(indusPoPushPayload(done).title, `Indus PO ${INDUS_PO.poNo} is complete`);

const payload = indusPoPushPayload(lastPoOnly);
assert.equal(payload.title, "Indus PO: 87,200 pieces left");
assert.equal(payload.body, "Supplied 0 of 87,200 (this PO 64,500 + last PO left 22,700)");
assert.equal(payload.url, "/");
assert.equal(payload.tag, "indus-po-remaining");

console.log("indusPo tests passed");
