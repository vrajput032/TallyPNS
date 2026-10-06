/**
 * Customer / supplier ledger running-balance builder.
 * Run: npx tsx backend/src/lib/partyLedger.test.ts
 */
import assert from "node:assert/strict";
import { buildPartyLedger, supplierKey } from "./partyLedger.js";

const book = buildPartyLedger({
  party: "CUSTOMER",
  openingBalance: 1000,
  documents: [
    {
      id: "inv-2",
      docNo: "PNS/26-27/2",
      date: new Date("2026-08-10T00:00:00.000Z"),
      amount: 500,
    },
    {
      id: "inv-1",
      docNo: "PNS/26-27/1",
      date: new Date("2026-08-01T00:00:00.000Z"),
      amount: 2500.5,
    },
  ],
  payments: [
    {
      id: "rcp-1",
      voucherNo: "RCP-10001",
      date: new Date("2026-08-01T00:00:00.000Z"),
      amount: 500,
      mode: "CASH",
      reference: null,
      narration: null,
      documentId: "inv-1",
      documentNo: "PNS/26-27/1",
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
assert.equal(book.entries[2]?.documentId, "inv-1");
assert.equal(book.entries[3]?.voucherNo, "PNS/26-27/2");
assert.equal(book.closingBalance, 3500.5);
assert.equal(book.totalDebit, 4000.5);
assert.equal(book.totalCredit, 500);

// ₹1.5L received once, entered as three receipts against three bills → one credit line.
const split = buildPartyLedger({
  party: "CUSTOMER",
  openingBalance: 0,
  documents: [],
  payments: [
    { id: "r11", voucherNo: "RCP-10011", amount: 104253, documentId: "b8", documentNo: "PNS/26-27/08" },
    { id: "r10", voucherNo: "RCP-10010", amount: 40845, documentId: "b7", documentNo: "PNS/26-27/07" },
    { id: "r12", voucherNo: "RCP-10012", amount: 4902, documentId: "b9", documentNo: "PNS/26-27/09" },
  ].map((row) => ({
    ...row,
    date: new Date("2026-10-06T00:00:00.000Z"),
    mode: "BANK" as const,
    reference: null,
    narration: null,
  })),
});
assert.equal(split.entries.length, 1);
assert.equal(split.entries[0]?.credit, 150000);
assert.equal(split.entries[0]?.voucherNo, "RCP-10010 – RCP-10012");
assert.equal(split.entries[0]?.documentId, null);
assert.equal(split.entries[0]?.allocations.length, 3);
assert.equal(split.entries[0]?.allocations[0]?.documentNo, "PNS/26-27/07");
assert.match(split.entries[0]?.particulars ?? "", /^Bank receipt against PNS\/26-27\/07, PNS\/26-27\/08, PNS\/26-27\/09$/);

// A late top-up receipt on the same day joins the line without implying the vouchers in between.
const topUp = buildPartyLedger({
  party: "CUSTOMER",
  openingBalance: 0,
  documents: [],
  payments: ["RCP-10006", "RCP-10013", "RCP-10007", "RCP-10008"].map((voucherNo) => ({
    id: voucherNo,
    voucherNo,
    amount: 1,
    documentId: "b",
    documentNo: "PNS/26-27/05",
    date: new Date("2026-09-21T00:00:00.000Z"),
    mode: "BANK" as const,
    reference: null,
    narration: voucherNo === "RCP-10013" ? "Balance of bank receipt" : null,
  })),
});
assert.equal(topUp.entries[0]?.voucherNo, "RCP-10006 – RCP-10008, RCP-10013");
assert.equal(topUp.entries[0]?.particulars, "Bank receipt against PNS/26-27/05");

// Different mode or reference on the same day stays separate.
const separate = buildPartyLedger({
  party: "CUSTOMER",
  openingBalance: 0,
  documents: [],
  payments: [
    { id: "a", voucherNo: "RCP-1", mode: "BANK" as const, reference: "UTR1" },
    { id: "b", voucherNo: "RCP-2", mode: "BANK" as const, reference: "UTR2" },
    { id: "c", voucherNo: "RCP-3", mode: "CASH" as const, reference: null },
  ].map((row) => ({
    ...row,
    date: new Date("2026-10-06T00:00:00.000Z"),
    amount: 100,
    narration: null,
    documentId: "inv",
    documentNo: "PNS/1",
  })),
});
assert.equal(separate.entries.length, 3);

// Supplier: bills are credit (we owe), payments are debit.
const supplier = buildPartyLedger({
  party: "SUPPLIER",
  openingBalance: 0,
  documents: [{ id: "rm1", docNo: "NVAI/880", date: new Date("2026-10-01T00:00:00.000Z"), amount: 500000 }],
  payments: [
    {
      id: "p1",
      voucherNo: "RMP-10017",
      date: new Date("2026-10-04T00:00:00.000Z"),
      amount: 200000,
      mode: "BANK",
      reference: null,
      narration: null,
      documentId: "rm1",
      documentNo: "NVAI/880",
    },
  ],
});
assert.equal(supplier.entries[0]?.kind, "BILL");
assert.equal(supplier.entries[0]?.credit, 500000);
assert.equal(supplier.entries[1]?.kind, "PAYMENT");
assert.equal(supplier.entries[1]?.debit, 200000);
assert.equal(supplier.closingBalance, -300000);

assert.equal(supplierKey("N.V.Auto industries"), supplierKey("NV auto industries"));
assert.equal(supplierKey("WORLD CLASS AUTOTECH"), supplierKey("World class auto tech"));

const empty = buildPartyLedger({ party: "CUSTOMER", openingBalance: 0, documents: [], payments: [] });
assert.equal(empty.entries.length, 0);
assert.equal(empty.closingBalance, 0);

console.log("partyLedger tests ok");
