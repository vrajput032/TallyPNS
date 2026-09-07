/**
 * Customer ledger running-balance builder.
 * Run: npx tsx backend/src/lib/customerLedger.test.ts
 */
import assert from "node:assert/strict";
import { buildCustomerLedger } from "./customerLedger.js";

const book = buildCustomerLedger({
  openingBalance: 1000,
  invoices: [
    {
      id: "inv-2",
      invoiceNo: "PNS/26-27/2",
      invoiceDate: new Date("2026-08-10T00:00:00.000Z"),
      totalAmount: 500,
    },
    {
      id: "inv-1",
      invoiceNo: "PNS/26-27/1",
      invoiceDate: new Date("2026-08-01T00:00:00.000Z"),
      totalAmount: 2500.5,
    },
  ],
  receipts: [
    {
      id: "rcp-1",
      receiptNo: "RCP-10001",
      receiptDate: new Date("2026-08-01T00:00:00.000Z"),
      amount: 500,
      mode: "CASH",
      salesInvoiceId: "inv-1",
      invoiceNo: "PNS/26-27/1",
      narration: null,
    },
  ],
});

assert.equal(book.openingBalance, 1000);
assert.equal(book.entries.length, 4);
assert.equal(book.entries[0]?.kind, "OPENING");
assert.equal(book.entries[0]?.debit, 1000);
assert.equal(book.entries[0]?.balance, 1000);
assert.equal(book.entries[1]?.kind, "INVOICE");
assert.equal(book.entries[1]?.voucherNo, "PNS/26-27/1");
assert.equal(book.entries[1]?.debit, 2500.5);
assert.equal(book.entries[2]?.kind, "RECEIPT");
assert.equal(book.entries[2]?.credit, 500);
assert.equal(book.entries[2]?.balance, 3000.5);
assert.equal(book.entries[3]?.voucherNo, "PNS/26-27/2");
assert.equal(book.closingBalance, 3500.5);
assert.equal(book.totalDebit, 4000.5);
assert.equal(book.totalCredit, 500);

const empty = buildCustomerLedger({ openingBalance: 0, invoices: [], receipts: [] });
assert.equal(empty.entries.length, 0);
assert.equal(empty.closingBalance, 0);

console.log("customerLedger tests ok");
