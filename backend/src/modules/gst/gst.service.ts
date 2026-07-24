import { prisma } from "../../lib/prisma.js";

interface GstRateBreakdown {
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalTax: number;
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

export async function getGstSummary(from?: Date, to?: Date) {
  const dateFilter = from || to ? { gte: from, lte: to } : undefined;

  const [salesItems, purchaseItems] = await Promise.all([
    prisma.salesInvoiceItem.findMany({
      where: dateFilter ? { salesInvoice: { invoiceDate: dateFilter } } : undefined,
      select: { gstRate: true, quantity: true, rate: true },
    }),
    prisma.purchaseBillItem.findMany({
      where: dateFilter ? { purchaseBill: { billDate: dateFilter } } : undefined,
      select: { gstRate: true, quantity: true, rate: true },
    }),
  ]);

  const outputGst = summarizeByRate(salesItems);
  const inputGst = summarizeByRate(purchaseItems);

  const totalOutputTax = outputGst.reduce((sum, g) => sum + g.totalTax, 0);
  const totalInputTax = inputGst.reduce((sum, g) => sum + g.totalTax, 0);

  return {
    outputGst,
    inputGst,
    totalOutputTax,
    totalInputTax,
    netPayable: totalOutputTax - totalInputTax,
  };
}
