import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma.js";

type Row = Record<string, string | number | boolean | null>;

function csvEscape(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h] ?? null)).join(",")),
  ];
  return lines.join("\n") + "\n";
}

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const outDir = join(process.cwd(), "..", "backups", `sheets-${stamp()}`);
  mkdirSync(outDir, { recursive: true });

  const [
    customers,
    vendors,
    products,
    sales,
    salesItems,
    salesReceipts,
    purchases,
    purchaseItems,
    vendorPayments,
    rawBills,
    rawItems,
    rawPayments,
    movements,
  ] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.salesInvoice.findMany({
      where: { deletedAt: null },
      include: { customer: { select: { name: true, gstin: true } } },
      orderBy: { invoiceDate: "desc" },
    }),
    prisma.salesInvoiceItem.findMany({
      where: { salesInvoice: { deletedAt: null } },
      include: {
        salesInvoice: { select: { invoiceNo: true } },
        product: { select: { name: true, hsn: true, unit: true } },
      },
    }),
    prisma.paymentReceipt.findMany({
      where: { salesInvoice: { deletedAt: null } },
      include: {
        salesInvoice: { select: { invoiceNo: true } },
        customer: { select: { name: true } },
      },
      orderBy: { receiptDate: "desc" },
    }),
    prisma.purchaseBill.findMany({
      where: { deletedAt: null },
      include: { vendor: { select: { name: true, gstin: true } } },
      orderBy: { billDate: "desc" },
    }),
    prisma.purchaseBillItem.findMany({
      where: { purchaseBill: { deletedAt: null } },
      include: {
        purchaseBill: { select: { billNo: true } },
        product: { select: { name: true, hsn: true } },
      },
    }),
    prisma.vendorPayment.findMany({
      where: { purchaseBill: { deletedAt: null } },
      include: {
        purchaseBill: { select: { billNo: true } },
        vendor: { select: { name: true } },
      },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.rawMaterialBill.findMany({
      where: { deletedAt: null },
      orderBy: { billDate: "desc" },
    }),
    prisma.rawMaterialBillItem.findMany({
      where: { bill: { deletedAt: null } },
      include: { bill: { select: { billNo: true } } },
    }),
    prisma.rawMaterialPayment.findMany({
      where: { bill: { deletedAt: null } },
      include: { bill: { select: { billNo: true } } },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.stockMovement.findMany({
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Section tabs for Google Sheets: Sales / Purchase / Raw materials (+ masters)
  const files: Record<string, Row[]> = {
    // --- Sales ---
    sales_invoices: sales.map((s) => ({
      invoiceNo: s.invoiceNo,
      invoiceDate: dateOnly(s.invoiceDate),
      customer: s.customer.name,
      customerGstin: s.customer.gstin,
      transport: s.transport,
      vehicleNo: s.vehicleNo,
      totalAmount: Number(s.totalAmount),
    })),
    sales_items: salesItems.map((i) => ({
      invoiceNo: i.salesInvoice.invoiceNo,
      lineType: i.productId ? "catalog" : "manual",
      productOrDescription: i.product?.name ?? i.description ?? "",
      hsn: i.product?.hsn ?? i.hsn ?? "",
      unit: i.product?.unit ?? i.unit ?? "",
      sizeMm: i.sizeMm != null ? Number(i.sizeMm) : "",
      quantity: Number(i.quantity),
      rate: Number(i.rate),
      gstRate: Number(i.gstRate),
      amount: Number(i.amount),
    })),
    sales_receipts: salesReceipts.map((r) => ({
      receiptNo: r.receiptNo,
      receiptDate: dateOnly(r.receiptDate),
      invoiceNo: r.salesInvoice.invoiceNo,
      customer: r.customer.name,
      amount: Number(r.amount),
      mode: r.mode,
      reference: r.reference,
      narration: r.narration,
    })),

    // --- Purchase ---
    purchase_bills: purchases.map((b) => ({
      billNo: b.billNo,
      billDate: dateOnly(b.billDate),
      kind: b.kind,
      vendor: b.vendor?.name ?? "",
      vendorGstin: b.vendor?.gstin ?? b.supplierGstin ?? "",
      supplierInvoiceNo: b.supplierInvoiceNo,
      title: b.title,
      transport: b.transport,
      vehicleNo: b.vehicleNo,
      notes: b.notes,
      totalAmount: Number(b.totalAmount),
    })),
    purchase_items: purchaseItems.map((i) => ({
      billNo: i.purchaseBill.billNo,
      lineType: i.productId ? "catalog" : "equipment",
      productOrDescription: i.product?.name ?? i.description ?? "",
      hsn: i.product?.hsn ?? "",
      quantity: Number(i.quantity),
      pricePerKg: i.pricePerKg != null ? Number(i.pricePerKg) : "",
      rate: Number(i.rate),
      gstRate: Number(i.gstRate),
      amount: Number(i.amount),
    })),
    purchase_payments: vendorPayments.map((p) => ({
      paymentNo: p.paymentNo,
      paymentDate: dateOnly(p.paymentDate),
      billNo: p.purchaseBill.billNo,
      vendor: p.vendor?.name ?? "",
      amount: Number(p.amount),
      mode: p.mode,
      reference: p.reference,
      narration: p.narration,
    })),

    // --- Raw materials ---
    raw_material_bills: rawBills.map((b) => ({
      billNo: b.billNo,
      billDate: dateOnly(b.billDate),
      supplierName: b.supplierName,
      supplierGstin: b.supplierGstin,
      vehicleNo: b.vehicleNo,
      destination: b.destination,
      taxableAmount: Number(b.taxableAmount),
      cgstAmount: Number(b.cgstAmount),
      sgstAmount: Number(b.sgstAmount),
      igstAmount: Number(b.igstAmount),
      roundOff: Number(b.roundOff),
      totalKg: Number(b.totalKg),
      totalAmount: Number(b.totalAmount),
      notes: b.notes,
    })),
    raw_material_items: rawItems.map((i) => ({
      billNo: i.bill.billNo,
      description: i.description,
      hsn: i.hsn,
      quantityKg: Number(i.quantityKg),
      ratePerKg: Number(i.ratePerKg),
      amount: Number(i.amount),
    })),
    raw_material_payments: rawPayments.map((p) => ({
      paymentNo: p.paymentNo,
      paymentDate: dateOnly(p.paymentDate),
      billNo: p.bill.billNo,
      amount: Number(p.amount),
      mode: p.mode,
      reference: p.reference,
      narration: p.narration,
    })),

    // --- Masters / stock (supporting) ---
    customers: customers.map((c) => ({
      name: c.name,
      phone: c.phone,
      email: c.email,
      gstin: c.gstin,
      address: c.address,
      openingBalance: Number(c.openingBalance),
    })),
    vendors: vendors.map((v) => ({
      name: v.name,
      phone: v.phone,
      email: v.email,
      gstin: v.gstin,
      address: v.address,
      openingBalance: Number(v.openingBalance),
    })),
    products: products.map((p) => ({
      name: p.name,
      hsn: p.hsn,
      gstRate: Number(p.gstRate),
      unit: p.unit,
      price: Number(p.price),
      openingStock: Number(p.openingStock),
      currentStock: Number(p.currentStock),
    })),
    stock_movements: movements.map((m) => ({
      date: m.createdAt.toISOString(),
      product: m.product.name,
      type: m.type,
      quantity: Number(m.quantity),
      sizeMm: m.sizeMm != null ? Number(m.sizeMm) : "",
      reason: m.reason,
    })),
  };

  const readme = [
    "PNS ERP — Google Sheets / Excel backup (readable offline copy)",
    "NOT a full database restore — use npm run db:backup / db:restore for that.",
    "",
    "Suggested Google Sheet tabs (File → Import → Upload each CSV as a new sheet):",
    "",
    "  Sales",
    "    - sales_invoices.csv",
    "    - sales_items.csv",
    "    - sales_receipts.csv",
    "",
    "  Purchase",
    "    - purchase_bills.csv",
    "    - purchase_items.csv",
    "    - purchase_payments.csv",
    "",
    "  Raw materials",
    "    - raw_material_bills.csv",
    "    - raw_material_items.csv",
    "    - raw_material_payments.csv",
    "",
    "  Masters",
    "    - customers.csv, vendors.csv, products.csv, stock_movements.csv",
    "",
    `Exported: ${new Date().toISOString()}`,
    "",
  ].join("\n");

  writeFileSync(join(outDir, "README.txt"), readme, "utf8");

  for (const [name, rows] of Object.entries(files)) {
    const path = join(outDir, `${name}.csv`);
    writeFileSync(path, toCsv(rows), "utf8");
    console.log(`Wrote ${rows.length} rows → ${path}`);
  }

  console.log("\nOpen any CSV in Excel, or in Google Sheets: File → Import → Upload.");
  console.log(`Folder: ${outDir}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
