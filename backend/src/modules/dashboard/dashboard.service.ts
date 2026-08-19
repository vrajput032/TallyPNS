import { prisma } from "../../lib/prisma.js";
import { PIPE_SIZES_MM } from "../../lib/pipeSizes.js";

const LOW_STOCK_THRESHOLD = 10;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Business started July 2026 — clamp range so we never show months before then. */
const BUSINESS_START = new Date(2026, 6, 1); // July 2026

/** Returns month-start dates from BUSINESS_START up to the current month. */
function businessMonthStarts(): Date[] {
  const now = monthStart(new Date());
  const start = monthStart(BUSINESS_START);
  const result: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= now) {
    result.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
}

export async function getDashboardSummary() {
  const [customerCount, productCount, products, salesAgg, sizeStocks] = await Promise.all([
    prisma.customer.count(),
    prisma.product.count(),
    prisma.product.findMany({ select: { price: true, currentStock: true } }),
    prisma.salesInvoice.aggregate({
      where: { deletedAt: null },
      _sum: { totalAmount: true },
    }),
    prisma.productSizeStock.findMany({
      select: { sizeMm: true, quantity: true },
    }),
  ]);

  const stockValue = products.reduce(
    (sum, product) => sum + Number(product.price) * Number(product.currentStock),
    0
  );

  const qtyBySize = new Map<number, number>();
  for (const row of sizeStocks) {
    const sizeMm = Number(row.sizeMm);
    qtyBySize.set(sizeMm, (qtyBySize.get(sizeMm) ?? 0) + Number(row.quantity));
  }

  const stockBySize = PIPE_SIZES_MM.map((sizeMm) => ({
    sizeMm,
    quantity: qtyBySize.get(sizeMm) ?? 0,
  }));

  const lowStockCount = products.filter(
    (product) => Number(product.currentStock) <= LOW_STOCK_THRESHOLD
  ).length;

  const rawMaterialBills = await prisma.rawMaterialBill.findMany({
    where: { deletedAt: null },
    select: {
      totalAmount: true,
      payments: { select: { amount: true } },
    },
  });

  let rawMaterialTotal = 0;
  let rawMaterialPaid = 0;
  for (const bill of rawMaterialBills) {
    rawMaterialTotal += Number(bill.totalAmount);
    for (const p of bill.payments) {
      rawMaterialPaid += Number(p.amount);
    }
  }

  return {
    customerCount,
    productCount,
    stockValue,
    stockBySize,
    lowStockCount,
    totalSales: Number(salesAgg._sum.totalAmount ?? 0),
    rawMaterial: {
      totalBilled: Math.round(rawMaterialTotal),
      totalPaid: Math.round(rawMaterialPaid),
      balance: Math.round(rawMaterialTotal - rawMaterialPaid),
      billCount: rawMaterialBills.length,
    },
  };
}

/** Aggregate sales totalAmount grouped by month from business start (Jul 2026). */
export async function getMonthlySales() {
  const monthStarts = businessMonthStarts();
  if (monthStarts.length === 0) return [];

  const endOfRange = monthStarts[monthStarts.length - 1];
  const nextMonth = new Date(endOfRange);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  // Pull all invoices whose date falls within the range
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      deletedAt: null,
      invoiceDate: {
        gte: startOfDay(monthStarts[0]),
        lt: startOfDay(nextMonth),
      },
    },
    select: {
      invoiceDate: true,
      totalAmount: true,
    },
  });

  // Bucket by YYYY-MM
  const totals = new Map<string, number>();
  for (const inv of invoices) {
    const d = new Date(inv.invoiceDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    totals.set(key, (totals.get(key) ?? 0) + Number(inv.totalAmount));
  }

  return monthStarts.map((ms) => {
    const key = `${ms.getFullYear()}-${String(ms.getMonth() + 1).padStart(2, "0")}`;
    const total = totals.get(key) ?? 0;
    return {
      month: ms.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      total: Math.round(total),
    };
  });
}

/** Top customers by total sales from business start (Jul 2026) onwards. */
export async function getCustomerWiseSales() {
  const invoices = await prisma.salesInvoice.findMany({
    where: { deletedAt: null },
    select: {
      customer: { select: { name: true } },
      totalAmount: true,
    },
  });

  const byCustomer = new Map<string, number>();
  for (const inv of invoices) {
    const name = inv.customer.name;
    byCustomer.set(name, (byCustomer.get(name) ?? 0) + Number(inv.totalAmount));
  }

  return Array.from(byCustomer.entries())
    .map(([customer, total]) => ({ customer, total: Math.round(total) }))
    .sort((a, b) => b.total - a.total);
}
