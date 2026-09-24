/**
 * Supplier (trading) tax-invoice PDF text parser.
 * Run: npx tsx backend/src/modules/purchase/parseSupplierInvoice.test.ts
 */
import assert from "node:assert/strict";
import { parseSupplierInvoiceText } from "./parseSupplierInvoice.js";

const arbTubes = [
  "Tax Invoice",
  "ARB TUBES CORPORATION",
  "Khasra No.122-124, Shed No 1, Dabua Pali",
  "GSTIN/UIN: 06CHOPK0670F1ZD",
  "Consignee (Ship to)",
  "Pns Enterprises",
  "Plot No-2 Killa No-25 Kewat No-12/2/1",
  "GSTIN/UIN \t: 06ABJFP8733H1ZW",
  "Invoice No. \te-Way Bill No.",
  "12",
  "Dispatch Doc No.",
  "12",
  "Dated",
  "24-Sep-26",
  "Motor Vehicle No.",
  "HP12N8187",
  "Sl \tDescription of Goods \tAmount\tper\tRate\tQuantity\tHSN/SAC",
  "No.",
  "1 \tMS PIPE- 85 MMx25 MM, Chudi Height \t1,66,500.00\tPCS\t15.00\t11,100 PCS\t73069090",
  "CGST OUTPUT LOCAL 9% \t14,985.00",
  "SGST OUTPUT LOCAL 9% \t14,985.00",
  "Total \t₹ 1,96,470.00\t11,100 PCS",
  "73069090 \t29,970.00\t14,985.00\t9%\t14,985.00\t9%\t1,66,500.00",
  "Customer's Seal and Signature \tfor ARB TUBES CORPORATION",
].join("\n");

const arb = parseSupplierInvoiceText(arbTubes);
assert.equal(arb.supplierName, "ARB TUBES CORPORATION");
assert.equal(arb.supplierGstin, "06CHOPK0670F1ZD");
assert.equal(arb.supplierInvoiceNo, "12");
assert.equal(arb.billDate, "2026-09-24");
assert.equal(arb.vehicleNo, "HP12N8187");
assert.equal(arb.items.length, 1);
assert.deepEqual(arb.items[0], {
  description: "MS PIPE- 85 MMx25 MM, Chudi Height",
  hsn: "73069090",
  unit: "PCS",
  quantity: 11100,
  rate: 15,
  gstRate: 18,
  amount: 166500,
});
assert.equal(arb.taxableAmount, 166500);
assert.equal(arb.taxAmount, 29970);
assert.equal(arb.totalAmount, 196470);
assert.deepEqual(arb.warnings, []);

const igstBill = [
  "Tax Invoice",
  "SHREE STEEL TRADERS",
  "GSTIN/UIN: 07AAACS1234B1Z5",
  "Invoice No. SST/101",
  "Dated 03-Oct-2026",
  "1 GI PIPE 50MM 500 NOS 120.00 60,000.00 73063090",
  "2 MS PIPE 25MM 200 NOS 80.50 16,100.00 73063090",
  "IGST OUTPUT 18% 13,698.00",
  "Total ₹ 89,798.00 700 NOS",
].join("\n");

const igst = parseSupplierInvoiceText(igstBill);
assert.equal(igst.supplierName, "SHREE STEEL TRADERS");
assert.equal(igst.supplierInvoiceNo, "SST/101");
assert.equal(igst.billDate, "2026-10-03");
assert.equal(igst.items.length, 2);
assert.equal(igst.items[0].quantity, 500);
assert.equal(igst.items[0].rate, 120);
assert.equal(igst.items[0].unit, "NOS");
assert.equal(igst.items[1].amount, 16100);
assert.equal(igst.items[1].gstRate, 18);
assert.equal(igst.totalAmount, 89798);
assert.deepEqual(igst.warnings, []);

const empty = parseSupplierInvoiceText("Scanned image with no text");
assert.equal(empty.items.length, 0);
assert.ok(empty.warnings.length >= 3);

console.log("parseSupplierInvoice tests passed");
