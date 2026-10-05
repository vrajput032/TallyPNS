import { prisma } from "../../lib/prisma.js";
import { activeOnly } from "../../lib/activeRecords.js";
import { istDateKey } from "../../lib/paymentReminder.js";
import { pipeSizeMatches, SIZE_70MM_WITHOUT_CHUDI } from "../../lib/pipeSizes.js";

/**
 * Indus POs: previous 70,000 (4 Sep–4 Oct 2026) plus current IAPL-004031.
 * Leftover from the previous PO is added to the current remaining.
 * Current supplied starts the day after the previous PO ends.
 */
export const INDUS_PO = {
  customerNameIncludes: "INDUS APPLIANCES",
  customerGstin: "06AAGCI1206D1Z8",
  poNo: "IAPL-004031",
  poDate: "2026-10-03",
  previous: {
    quantity: 70000,
    from: "2026-09-04",
    to: "2026-10-04",
  },
  lines: [
    { sizeMm: 70, quantity: 35000, description: "MS Pipe 70mm" },
    { sizeMm: 45, quantity: 4500, description: "MS Pipe 45mm (square tank)" },
    { sizeMm: 82, quantity: 25000, description: "MS Pipe 82mm" },
  ],
} as const;

export type IndusPoLineProgress = {
  sizeMm: number;
  description: string;
  ordered: number;
  supplied: number;
};

export type IndusPoSummary = {
  poNo: string;
  poDate: string;
  customerName: string | null;
  customerId: string | null;
  previousPoQuantity: number;
  previousPoFrom: string;
  previousPoTo: string;
  previousSupplied: number;
  lastMonthLeft: number;
  poQuantity: number;
  target: number;
  supplied: number;
  remaining: number;
  invoiceCount: number;
  lines: IndusPoLineProgress[];
  otherSupplied: number;
};

type CatalogLine = {
  productId: string | null;
  sizeMm: unknown;
  quantity: unknown;
};

type InvoiceForPo = {
  customerId: string;
  customerName: string;
  invoiceDate: Date;
  items: CatalogLine[];
};

export function poQuantity(po = INDUS_PO): number {
  return po.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function currentSuppliedFrom(po = INDUS_PO): string {
  const end = new Date(`${po.previous.to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString().slice(0, 10);
}

function inInclusiveRange(date: Date, from: string, to: string): boolean {
  const key = istDateKey(date);
  return key >= from && key <= to;
}

/** Map a billed size onto a PO line (70mm without chudi counts as 70mm). */
export function poLineSizeFor(sizeMm: number, po = INDUS_PO): number | null {
  for (const line of po.lines) {
    if (pipeSizeMatches(sizeMm, line.sizeMm)) return line.sizeMm;
    if (line.sizeMm === 70 && pipeSizeMatches(sizeMm, SIZE_70MM_WITHOUT_CHUDI)) return 70;
  }
  return null;
}

function catalogPieces(item: CatalogLine): number {
  if (!item.productId?.trim()) return 0;
  const qty = Number(item.quantity);
  return Number.isFinite(qty) ? qty : 0;
}

function invoiceCatalogPieces(invoice: InvoiceForPo): number {
  return invoice.items.reduce((sum, item) => sum + catalogPieces(item), 0);
}

export function summarizeIndusPo(invoices: InvoiceForPo[], po = INDUS_PO): IndusPoSummary {
  const ordered = poQuantity(po);
  const suppliedFrom = currentSuppliedFrom(po);
  const suppliedBySize = new Map<number, number>();
  let previousSupplied = 0;
  let supplied = 0;
  let otherSupplied = 0;
  let invoiceCount = 0;
  let customerId: string | null = null;
  let customerName: string | null = null;

  for (const invoice of invoices) {
    customerId = invoice.customerId;
    customerName = invoice.customerName;
    const day = istDateKey(invoice.invoiceDate);
    const qty = invoiceCatalogPieces(invoice);
    if (qty === 0) continue;

    if (inInclusiveRange(invoice.invoiceDate, po.previous.from, po.previous.to)) {
      previousSupplied += qty;
      continue;
    }
    if (day < suppliedFrom) continue;

    supplied += qty;
    invoiceCount += 1;
    for (const item of invoice.items) {
      const itemQty = catalogPieces(item);
      if (itemQty === 0) continue;
      const sizeMm = item.sizeMm == null ? NaN : Number(item.sizeMm);
      const poSize = Number.isFinite(sizeMm) ? poLineSizeFor(sizeMm, po) : null;
      if (poSize == null) {
        otherSupplied += itemQty;
        continue;
      }
      suppliedBySize.set(poSize, (suppliedBySize.get(poSize) ?? 0) + itemQty);
    }
  }

  const lastMonthLeft = Math.max(0, Math.round(po.previous.quantity - previousSupplied));
  const target = ordered + lastMonthLeft;
  const remaining = Math.max(0, Math.round(target - supplied));

  return {
    poNo: po.poNo,
    poDate: po.poDate,
    customerName,
    customerId,
    previousPoQuantity: po.previous.quantity,
    previousPoFrom: po.previous.from,
    previousPoTo: po.previous.to,
    previousSupplied: Math.round(previousSupplied),
    lastMonthLeft,
    poQuantity: ordered,
    target,
    supplied: Math.round(supplied),
    remaining,
    invoiceCount,
    lines: po.lines.map((line) => ({
      sizeMm: line.sizeMm,
      description: line.description,
      ordered: line.quantity,
      supplied: Math.round(suppliedBySize.get(line.sizeMm) ?? 0),
    })),
    otherSupplied: Math.round(otherSupplied),
  };
}

export function indusPoPushPayload(summary: IndusPoSummary) {
  const left = summary.remaining.toLocaleString("en-IN");
  const supplied = summary.supplied.toLocaleString("en-IN");
  const target = summary.target.toLocaleString("en-IN");
  const poQty = summary.poQuantity.toLocaleString("en-IN");
  const leftover = summary.lastMonthLeft.toLocaleString("en-IN");
  return {
    title: summary.remaining <= 0 ? `Indus PO ${summary.poNo} is complete` : `Indus PO: ${left} pieces left`,
    body: `Supplied ${supplied} of ${target} (this PO ${poQty} + last PO left ${leftover})`,
    url: "/",
    tag: "indus-po-remaining",
    playSound: true as const,
  };
}

export async function getIndusPoProgress(): Promise<IndusPoSummary> {
  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { gstin: { equals: INDUS_PO.customerGstin, mode: "insensitive" } },
        { name: { contains: INDUS_PO.customerNameIncludes, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });

  if (!customer) {
    return summarizeIndusPo([]);
  }

  const invoices = await prisma.salesInvoice.findMany({
    where: {
      ...activeOnly,
      isTrading: false,
      customerId: customer.id,
    },
    select: {
      customerId: true,
      invoiceDate: true,
      customer: { select: { name: true } },
      items: { select: { productId: true, sizeMm: true, quantity: true } },
    },
  });

  const summary = summarizeIndusPo(
    invoices.map((invoice) => ({
      customerId: invoice.customerId,
      customerName: invoice.customer.name,
      invoiceDate: invoice.invoiceDate,
      items: invoice.items,
    }))
  );

  return {
    ...summary,
    customerId: customer.id,
    customerName: customer.name,
  };
}
