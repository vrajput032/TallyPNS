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

async function main() {
  const outDir = join(process.cwd(), "..", "backups", `sheets-${stamp()}`);
  mkdirSync(outDir, { recursive: true });

  const [customers, vendors, products, sales, salesItems, purchases, purchaseItems, movements] =
    await Promise.all([
      prisma.customer.findMany({ orderBy: { name: "asc" } }),
      prisma.vendor.findMany({ orderBy: { name: "asc" } }),
      prisma.product.findMany({ orderBy: { name: "asc" } }),
      prisma.salesInvoice.findMany({
        include: { customer: { select: { name: true } } },
        orderBy: { invoiceDate: "desc" },
      }),
      prisma.salesInvoiceItem.findMany({
        include: {
          salesInvoice: { select: { invoiceNo: true } },
          product: { select: { name: true, hsn: true } },
        },
      }),
      prisma.purchaseBill.findMany({
        include: { vendor: { select: { name: true } } },
        orderBy: { billDate: "desc" },
      }),
      prisma.purchaseBillItem.findMany({
        include: {
          purchaseBill: { select: { billNo: true } },
          product: { select: { name: true, hsn: true } },
        },
      }),
      prisma.stockMovement.findMany({
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const files: Record<string, Row[]> = {
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      gstin: c.gstin,
      address: c.address,
      openingBalance: Number(c.openingBalance),
      createdAt: c.createdAt.toISOString(),
    })),
    vendors: vendors.map((v) => ({
      id: v.id,
      name: v.name,
      phone: v.phone,
      email: v.email,
      gstin: v.gstin,
      address: v.address,
      openingBalance: Number(v.openingBalance),
      createdAt: v.createdAt.toISOString(),
    })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      hsn: p.hsn,
      gstRate: Number(p.gstRate),
      unit: p.unit,
      price: Number(p.price),
      openingStock: Number(p.openingStock),
      currentStock: Number(p.currentStock),
    })),
    sales_invoices: sales.map((s) => ({
      id: s.id,
      invoiceNo: s.invoiceNo,
      customer: s.customer.name,
      invoiceDate: s.invoiceDate.toISOString().slice(0, 10),
      totalAmount: Number(s.totalAmount),
    })),
    sales_items: salesItems.map((i) => ({
      invoiceNo: i.salesInvoice.invoiceNo,
      product: i.product.name,
      hsn: i.product.hsn,
      quantity: Number(i.quantity),
      rate: Number(i.rate),
      gstRate: Number(i.gstRate),
      amount: Number(i.amount),
    })),
    purchase_bills: purchases.map((b) => ({
      id: b.id,
      billNo: b.billNo,
      vendor: b.vendor.name,
      billDate: b.billDate.toISOString().slice(0, 10),
      totalAmount: Number(b.totalAmount),
    })),
    purchase_items: purchaseItems.map((i) => ({
      billNo: i.purchaseBill.billNo,
      product: i.product.name,
      hsn: i.product.hsn,
      quantity: Number(i.quantity),
      rate: Number(i.rate),
      gstRate: Number(i.gstRate),
      amount: Number(i.amount),
    })),
    stock_movements: movements.map((m) => ({
      date: m.createdAt.toISOString(),
      product: m.product.name,
      type: m.type,
      quantity: Number(m.quantity),
      reason: m.reason,
    })),
  };

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
