import { prisma } from "../../lib/prisma.js";
import { activeOnly } from "../../lib/activeRecords.js";
import { businessMonthsThrough, monthKey, round2 } from "../../lib/manufacturingPnl.js";
import { PIPE_SIZES_MM, quantityForCatalogSize } from "../../lib/pipeSizes.js";
import { getIndusPoProgress } from "./indusPo.js";

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

/** Bill totals with GST; the before-GST parts are kept so profit excludes GST owed to the government. */
type TradingTotals = {
  sales: number;
  purchases: number;
  salesBeforeGst: number;
  purchasesBeforeGst: number;
};

export type TradingPnlMonth = {
  key: string;
  label: string;
  sales: number;
  purchases: number;
  /** Output GST on trading sales minus input GST on trading purchases (negative = credit). */
  gst: number;
  profit: number;
};

function emptyTotals(): TradingTotals {
  return { sales: 0, purchases: 0, salesBeforeGst: 0, purchasesBeforeGst: 0 };
}

function summarizeTotals(totals: TradingTotals) {
  const outputGst = totals.sales - totals.salesBeforeGst;
  const inputGst = totals.purchases - totals.purchasesBeforeGst;
  return {
    sales: round2(totals.sales),
    purchases: round2(totals.purchases),
    gst: round2(outputGst - inputGst),
    profit: round2(totals.salesBeforeGst - totals.purchasesBeforeGst),
  };
}

/** Trading = goods bought and resold as-is. Sold − bought − GST payable = profit. */
async function getTradingPnl() {
  const [invoices, bills] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { ...activeOnly, isTrading: true },
      select: {
        invoiceDate: true,
        totalAmount: true,
        items: { select: { quantity: true, rate: true } },
      },
    }),
    prisma.purchaseBill.findMany({
      where: { ...activeOnly, kind: "TRADING" },
      select: {
        billDate: true,
        totalAmount: true,
        items: { select: { quantity: true, rate: true } },
      },
    }),
  ]);

  const months = new Map<string, { key: string; label: string; totals: TradingTotals }>();
  for (const { year, month } of businessMonthsThrough()) {
    const key = monthKey(year, month);
    months.set(key, { key, label: shortMonthLabel(year, month), totals: emptyTotals() });
  }

  function bucket(date: Date): TradingTotals {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const key = monthKey(year, month);
    const existing = months.get(key);
    if (existing) return existing.totals;
    const created = { key, label: shortMonthLabel(year, month), totals: emptyTotals() };
    months.set(key, created);
    return created.totals;
  }

  const overall = emptyTotals();
  for (const invoice of invoices) {
    const total = Number(invoice.totalAmount) || 0;
    const beforeGst = taxableTotal(invoice.items);
    const month = bucket(invoice.invoiceDate);
    overall.sales += total;
    overall.salesBeforeGst += beforeGst;
    month.sales += total;
    month.salesBeforeGst += beforeGst;
  }
  for (const bill of bills) {
    const total = Number(bill.totalAmount) || 0;
    const beforeGst = taxableTotal(bill.items);
    const month = bucket(bill.billDate);
    overall.purchases += total;
    overall.purchasesBeforeGst += beforeGst;
    month.purchases += total;
    month.purchasesBeforeGst += beforeGst;
  }

  const monthRows: TradingPnlMonth[] = [...months.values()]
    .map(({ key, label, totals }) => ({ key, label, ...summarizeTotals(totals) }))
    .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));

  return {
    ...summarizeTotals(overall),
    invoiceCount: invoices.length,
    billCount: bills.length,
    months: monthRows,
  };
}

export async function getDashboardSummary() {
  const [customerCount, productCount, products, salesAgg, tradingAgg, receiptsAgg, sizeStocks, trading, indusPo] = await Promise.all([
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
    getIndusPoProgress(),
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
    quantity: quantityForCatalogSize(qtyBySize, sizeMm),
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
    indusPo,
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
