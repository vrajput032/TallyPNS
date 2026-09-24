import { prisma } from "../../lib/prisma.js";
import { activeOnly } from "../../lib/activeRecords.js";
import { businessMonthsThrough, monthKey, round2 } from "../../lib/manufacturingPnl.js";
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

type TaxableLine = { quantity: unknown; rate: unknown };

function taxableTotal(items: TaxableLine[]): number {
  return items.reduce((sum, item) => {
    const qty = Number(item.quantity);
    const rate = Number(item.rate);
    return sum + (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(rate) ? rate : 0);
  }, 0);
}

function shortMonthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export type TradingPnlMonth = {
  key: string;
  label: string;
  sales: number;
  purchases: number;
  profit: number;
};

/** Trading = goods bought and resold as-is. Amounts are before GST (qty × rate). */
async function getTradingPnl() {
  const [invoices, bills] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { ...activeOnly, isTrading: true },
      select: { invoiceDate: true, items: { select: { quantity: true, rate: true } } },
    }),
    prisma.purchaseBill.findMany({
      where: { ...activeOnly, kind: "TRADING" },
      select: { billDate: true, items: { select: { quantity: true, rate: true } } },
    }),
  ]);

  const months = new Map<string, TradingPnlMonth>();
  for (const { year, month } of businessMonthsThrough()) {
    const key = monthKey(year, month);
    months.set(key, { key, label: shortMonthLabel(year, month), sales: 0, purchases: 0, profit: 0 });
  }

  function bucket(date: Date): TradingPnlMonth {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const key = monthKey(year, month);
    const existing = months.get(key);
    if (existing) return existing;
    const created = { key, label: shortMonthLabel(year, month), sales: 0, purchases: 0, profit: 0 };
    months.set(key, created);
    return created;
  }

  let sales = 0;
  let purchases = 0;
  for (const invoice of invoices) {
    const amount = taxableTotal(invoice.items);
    sales += amount;
    bucket(invoice.invoiceDate).sales += amount;
  }
  for (const bill of bills) {
    const amount = taxableTotal(bill.items);
    purchases += amount;
    bucket(bill.billDate).purchases += amount;
  }

  const monthRows = [...months.values()]
    .map((row) => ({
      ...row,
      sales: round2(row.sales),
      purchases: round2(row.purchases),
      profit: round2(row.sales - row.purchases),
    }))
    .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));

  return {
    sales: round2(sales),
    purchases: round2(purchases),
    profit: round2(sales - purchases),
    invoiceCount: invoices.length,
    billCount: bills.length,
    months: monthRows,
  };
}

export async function getDashboardSummary() {
  const [customerCount, productCount, products, salesAgg, tradingAgg, receiptsAgg, sizeStocks, trading] = await Promise.all([
    prisma.customer.count(),
    prisma.product.count(),
    prisma.product.findMany({ select: { price: true, currentStock: true } }),
    prisma.salesInvoice.aggregate({
      where: { deletedAt: null },
      _sum: { totalAmount: true },
    }),
    prisma.salesInvoice.aggregate({
      where: { deletedAt: null, isTrading: true },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.paymentReceipt.aggregate({
      _sum: { amount: true },
    }),
    prisma.productSizeStock.findMany({
      select: { sizeMm: true, quantity: true },
    }),
    getTradingPnl(),
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

  const totalSales = Number(salesAgg._sum.totalAmount ?? 0);
  const tradingSales = Number(tradingAgg._sum.totalAmount ?? 0);

  return {
    customerCount,
    productCount,
    stockValue,
    stockBySize,
    lowStockCount,
    totalSales,
    pnsSales: totalSales - tradingSales,
    tradingSales,
    tradingInvoiceCount: tradingAgg._count,
    trading,
    totalReceived: Number(receiptsAgg._sum.amount ?? 0),
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
