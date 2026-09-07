import { prisma } from "../../lib/prisma.js";
import { activeOnly } from "../../lib/activeRecords.js";
import { PIPE_SIZES_MM } from "../../lib/pipeSizes.js";
import { resolveTaxPeriod } from "../gst/gst.service.js";
import { loadPartnerExpensesSnapshot } from "../../lib/kirayaDelivery.js";
import {
  buildMonthPnl,
  businessMonthsThrough,
  emptyMonthAggregates,
  monthKey,
  monthLabel,
  type MonthPnl,
  type MonthPnlInput,
} from "../../lib/manufacturingPnl.js";

type InvoiceRow = {
  invoiceDate: Date;
  items: {
    productId: string | null;
    sizeMm: unknown;
    quantity: unknown;
    rate: unknown;
  }[];
};

type BillRow = {
  billDate: Date;
  taxableAmount: unknown;
  totalKg: unknown;
};

function utcYearMonth(date: Date): { year: number; month: number } {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function emptySizeRows(): { sizeMm: number; quantity: number }[] {
  return PIPE_SIZES_MM.map((sizeMm) => ({ sizeMm, quantity: 0 }));
}

function addInvoiceToAgg(agg: MonthPnlInput, invoice: InvoiceRow) {
  for (const item of invoice.items) {
    const qty = Number(item.quantity);
    const rate = Number(item.rate);
    const taxable = (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(rate) ? rate : 0);
    if (item.productId) {
      agg.pipeSalesTaxable += taxable;
      agg.piecesSold += Number.isFinite(qty) ? qty : 0;
      const sizeMm = item.sizeMm != null ? Number(item.sizeMm) : NaN;
      if (Number.isFinite(sizeMm) && sizeMm > 0) {
        const row = agg.piecesSoldBySize.find((r) => r.sizeMm === sizeMm);
        if (row) {
          row.quantity += qty;
        } else {
          agg.piecesSoldBySize.push({ sizeMm, quantity: qty });
        }
      } else {
        agg.unsizedPieces += Number.isFinite(qty) ? qty : 0;
      }
    } else {
      agg.otherSalesTaxable += taxable;
    }
  }
}

function addBillToAgg(agg: MonthPnlInput, bill: BillRow) {
  agg.rmTaxable += Number(bill.taxableAmount) || 0;
  agg.rmKg += Number(bill.totalKg) || 0;
}

function ensureSizeRows(agg: MonthPnlInput) {
  const bySize = new Map(agg.piecesSoldBySize.map((row) => [row.sizeMm, row.quantity]));
  agg.piecesSoldBySize = PIPE_SIZES_MM.map((sizeMm) => ({
    sizeMm,
    quantity: bySize.get(sizeMm) ?? 0,
  }));
}

async function loadVouchers(from: Date, toExclusive: Date): Promise<{
  invoices: InvoiceRow[];
  bills: BillRow[];
}> {
  const [invoices, bills] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { ...activeOnly, invoiceDate: { gte: from, lt: toExclusive } },
      select: {
        invoiceDate: true,
        items: { select: { productId: true, sizeMm: true, quantity: true, rate: true } },
      },
    }),
    prisma.rawMaterialBill.findMany({
      where: { ...activeOnly, billDate: { gte: from, lt: toExclusive } },
      select: { billDate: true, taxableAmount: true, totalKg: true },
    }),
  ]);
  return { invoices, bills };
}

function newAgg(year: number, month: number): MonthPnlInput {
  return {
    ...emptyMonthAggregates(year, month),
    monthLabel: monthLabel(year, month),
    piecesSoldBySize: emptySizeRows(),
  };
}

export async function getMonthProfitLoss(month: number, year: number): Promise<MonthPnl> {
  const period = resolveTaxPeriod(month, year);
  const [{ invoices, bills }, expenses] = await Promise.all([
    loadVouchers(period.periodGte, period.periodLt),
    loadPartnerExpensesSnapshot(),
  ]);
  const agg = newAgg(year, month);
  agg.monthLabel = period.monthLabel;
  const monthExpenses = expenses.byMonth[monthKey(year, month)];
  agg.delivery = monthExpenses?.delivery ?? 0;
  agg.otherExpenses = monthExpenses?.other ?? 0;
  agg.electricityFromExpenses = monthExpenses?.electricity ?? 0;
  agg.expenseEntries = monthExpenses?.entries ?? [];
  agg.partnerExpenses = expenses.expensesByMonth[monthKey(year, month)] ?? [];
  agg.expensesFetchedAt = expenses.fetchedAt || null;
  for (const invoice of invoices) addInvoiceToAgg(agg, invoice);
  for (const bill of bills) addBillToAgg(agg, bill);
  ensureSizeRows(agg);
  return buildMonthPnl(agg);
}

export async function getProfitLossSummary(): Promise<{
  months: MonthPnl[];
  totalIncome: number;
  totalCosts: number;
  net: number;
}> {
  const months = businessMonthsThrough();
  if (months.length === 0) {
    return { months: [], totalIncome: 0, totalCosts: 0, net: 0 };
  }

  const first = resolveTaxPeriod(months[0].month, months[0].year);
  const last = months[months.length - 1];
  const afterLast = last.month === 12 ? { year: last.year + 1, month: 1 } : { year: last.year, month: last.month + 1 };
  const endExclusive = resolveTaxPeriod(afterLast.month, afterLast.year).periodGte;

  const [{ invoices, bills }, expenses] = await Promise.all([
    loadVouchers(first.periodGte, endExclusive),
    loadPartnerExpensesSnapshot(),
  ]);
  const buckets = new Map<string, MonthPnlInput>();
  for (const { year, month } of months) {
    const agg = newAgg(year, month);
    const key = monthKey(year, month);
    const monthExpenses = expenses.byMonth[key];
    agg.delivery = monthExpenses?.delivery ?? 0;
    agg.otherExpenses = monthExpenses?.other ?? 0;
    agg.electricityFromExpenses = monthExpenses?.electricity ?? 0;
    agg.expenseEntries = monthExpenses?.entries ?? [];
    agg.partnerExpenses = expenses.expensesByMonth[key] ?? [];
    agg.expensesFetchedAt = expenses.fetchedAt || null;
    buckets.set(key, agg);
  }

  for (const invoice of invoices) {
    const { year, month } = utcYearMonth(invoice.invoiceDate);
    const agg = buckets.get(monthKey(year, month));
    if (!agg) continue;
    addInvoiceToAgg(agg, invoice);
  }
  for (const bill of bills) {
    const { year, month } = utcYearMonth(bill.billDate);
    const agg = buckets.get(monthKey(year, month));
    if (!agg) continue;
    addBillToAgg(agg, bill);
  }

  const monthReports = months.map(({ year, month }) => {
    const agg = buckets.get(monthKey(year, month)) ?? newAgg(year, month);
    const monthExpenses = expenses.byMonth[monthKey(year, month)];
    agg.delivery = agg.delivery ?? monthExpenses?.delivery ?? 0;
    agg.otherExpenses = agg.otherExpenses ?? monthExpenses?.other ?? 0;
    agg.electricityFromExpenses = agg.electricityFromExpenses ?? monthExpenses?.electricity ?? 0;
    agg.expenseEntries = agg.expenseEntries ?? monthExpenses?.entries ?? [];
    agg.partnerExpenses = agg.partnerExpenses ?? expenses.expensesByMonth[monthKey(year, month)] ?? [];
    agg.expensesFetchedAt = agg.expensesFetchedAt ?? expenses.fetchedAt ?? null;
    ensureSizeRows(agg);
    return buildMonthPnl(agg);
  });

  const totalIncome = monthReports.reduce((sum, row) => sum + row.totalIncome, 0);
  const totalCosts = monthReports.reduce((sum, row) => sum + row.totalCosts, 0);

  return {
    months: monthReports,
    totalIncome: Math.round((totalIncome + Number.EPSILON) * 100) / 100,
    totalCosts: Math.round((totalCosts + Number.EPSILON) * 100) / 100,
    net: Math.round((totalIncome - totalCosts + Number.EPSILON) * 100) / 100,
  };
}
