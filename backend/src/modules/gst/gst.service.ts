import { prisma } from "../../lib/prisma.js";
import { activeOnly } from "../../lib/activeRecords.js";

interface GstRateBreakdown {
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalTax: number;
}

export interface GstVoucherRow {
  id: string;
  date: string;
  particulars: string;
  vchType: "Sales" | "Purchase";
  vchNo: string;
  taxableAmount: number;
  taxAmount: number;
  invoiceAmount: number;
}

function summarizeByRate(
  items: { gstRate: unknown; quantity: unknown; rate: unknown }[]
): GstRateBreakdown[] {
  const groups = new Map<number, { taxable: number; tax: number }>();

  for (const item of items) {
    const rate = Number(item.gstRate);
    const taxable = Number(item.quantity) * Number(item.rate);
    const tax = (taxable * rate) / 100;
    const existing = groups.get(rate) ?? { taxable: 0, tax: 0 };
    groups.set(rate, { taxable: existing.taxable + taxable, tax: existing.tax + tax });
  }

  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([gstRate, { taxable, tax }]) => ({
      gstRate,
      taxableAmount: taxable,
      cgst: tax / 2,
      sgst: tax / 2,
      totalTax: tax,
    }));
}

function lineTotals(items: { gstRate: unknown; quantity: unknown; rate: unknown }[]) {
  return items.reduce(
    (acc, item) => {
      const taxable = Number(item.quantity) * Number(item.rate);
      const tax = (taxable * Number(item.gstRate)) / 100;
      return { taxable: acc.taxable + taxable, tax: acc.tax + tax };
    },
    { taxable: 0, tax: 0 }
  );
}

/** Tax period = calendar month (1st → last day). GSTR-1 due = 11th of next month. */
export function resolveTaxPeriod(month?: number, year?: number) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;

  if (m < 1 || m > 12) {
    throw new Error("month must be 1–12");
  }

  const periodFrom = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const periodTo = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  const periodStartExclusive = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));

  const filingYear = m === 12 ? y + 1 : y;
  const filingMonth = m === 12 ? 1 : m + 1;
  const filingWindowFrom = new Date(Date.UTC(filingYear, filingMonth - 1, 1));
  const filingDueDate = new Date(Date.UTC(filingYear, filingMonth - 1, 11));

  const monthLabel = periodFrom.toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return {
    year: y,
    month: m,
    monthLabel,
    periodFrom,
    periodTo,
    /** Use [gte, lt) for Prisma to avoid timezone edge cases */
    periodGte: periodFrom,
    periodLt: periodStartExclusive,
    filingWindowFrom,
    filingDueDate,
    filingNote:
      "GSTR-1 covers this month's sales invoices (1st–last day). Upload/file by the 11th of the next month (window 1st–11th).",
  };
}

export async function getGstSummary(month?: number, year?: number) {
  const period = resolveTaxPeriod(month, year);
  const dateFilter = { gte: period.periodGte, lt: period.periodLt };

  const [salesInvoices, purchaseBills] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { ...activeOnly, invoiceDate: dateFilter },
      include: {
        customer: { select: { name: true } },
        items: { select: { gstRate: true, quantity: true, rate: true } },
      },
      orderBy: [{ invoiceDate: "asc" }, { invoiceNo: "asc" }],
    }),
    prisma.purchaseBill.findMany({
      where: { ...activeOnly, billDate: dateFilter },
      include: {
        vendor: { select: { name: true } },
        items: { select: { gstRate: true, quantity: true, rate: true } },
      },
      orderBy: [{ billDate: "asc" }, { billNo: "asc" }],
    }),
  ]);

  const salesItems = salesInvoices.flatMap((inv) => inv.items);
  const purchaseItems = purchaseBills.flatMap((bill) => bill.items);

  const outputGst = summarizeByRate(salesItems);
  const inputGst = summarizeByRate(purchaseItems);
  const totalOutputTax = outputGst.reduce((sum, g) => sum + g.totalTax, 0);
  const totalInputTax = inputGst.reduce((sum, g) => sum + g.totalTax, 0);
  const totalTaxableSales = outputGst.reduce((sum, g) => sum + g.taxableAmount, 0);

  const gstr1Vouchers: GstVoucherRow[] = salesInvoices.map((inv) => {
    const { taxable, tax } = lineTotals(inv.items);
    return {
      id: inv.id,
      date: inv.invoiceDate.toISOString().slice(0, 10),
      particulars: inv.customer.name,
      vchType: "Sales",
      vchNo: inv.invoiceNo,
      taxableAmount: taxable,
      taxAmount: tax,
      invoiceAmount: Number(inv.totalAmount),
    };
  });

  const purchaseVouchers: GstVoucherRow[] = purchaseBills.map((bill) => {
    const { taxable, tax } = lineTotals(bill.items);
    return {
      id: bill.id,
      date: bill.billDate.toISOString().slice(0, 10),
      particulars: bill.vendor.name,
      vchType: "Purchase",
      vchNo: bill.billNo,
      taxableAmount: taxable,
      taxAmount: tax,
      invoiceAmount: Number(bill.totalAmount),
    };
  });

  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const dueUtc = Date.UTC(
    period.filingDueDate.getUTCFullYear(),
    period.filingDueDate.getUTCMonth(),
    period.filingDueDate.getUTCDate()
  );
  const windowFromUtc = Date.UTC(
    period.filingWindowFrom.getUTCFullYear(),
    period.filingWindowFrom.getUTCMonth(),
    period.filingWindowFrom.getUTCDate()
  );

  let filingStatus: "upcoming" | "open" | "overdue" = "upcoming";
  if (todayUtc > dueUtc) filingStatus = "overdue";
  else if (todayUtc >= windowFromUtc) filingStatus = "open";

  return {
    period: {
      year: period.year,
      month: period.month,
      monthLabel: period.monthLabel,
      from: period.periodFrom.toISOString().slice(0, 10),
      to: period.periodTo.toISOString().slice(0, 10),
      filingWindowFrom: period.filingWindowFrom.toISOString().slice(0, 10),
      filingDueDate: period.filingDueDate.toISOString().slice(0, 10),
      filingNote: period.filingNote,
      filingStatus,
    },
    outputGst,
    inputGst,
    totalOutputTax,
    totalInputTax,
    totalTaxableSales,
    netPayable: totalOutputTax - totalInputTax,
    salesVoucherCount: gstr1Vouchers.length,
    purchaseVoucherCount: purchaseVouchers.length,
    /** Outward supplies for the tax month — same idea as Tally GSTR-1 pending list */
    gstr1Vouchers,
    purchaseVouchers,
  };
}
