import { fileURLToPath } from "node:url";
import { prisma } from "../../lib/prisma.js";
import { activeOnly } from "../../lib/activeRecords.js";
import { istDateKey } from "../../lib/paymentReminder.js";
import { pipeSizeMatches, SIZE_70MM_WITHOUT_CHUDI } from "../../lib/pipeSizes.js";

/**
 * Indus POs: previous IAPL-003469 (4 Sep 2026) and current IAPL-004031.
 * Pieces billed from the previous PO date onward fill each size on the previous PO
 * first; only what is left over counts toward the current PO.
 */
export const INDUS_PO = {
  customerNameIncludes: "INDUS APPLIANCES",
  customerGstin: "06AAGCI1206D1Z8",
  previous: {
    poNo: "IAPL-003469",
    poDate: "2026-09-04",
    lines: [
      { sizeMm: 45, quantity: 10000 },
      { sizeMm: 70, quantity: 40000 },
      { sizeMm: 82, quantity: 20000 },
    ],
  },
  poNo: "IAPL-004031",
  poDate: "2026-10-03",
  lines: [
    { sizeMm: 70, quantity: 35000, description: "MS Pipe 70mm" },
    { sizeMm: 45, quantity: 4500, description: "MS Pipe 45mm (square tank)" },
    { sizeMm: 82, quantity: 25000, description: "MS Pipe 82mm" },
  ],
} as const;

type IndusPoConfig = typeof INDUS_PO;

/** Same depth from src/ and dist/, so this resolves to backend/assets/indus-po in both. */
const PO_PDF_DIR = fileURLToPath(new URL("../../../assets/indus-po/", import.meta.url));

/** Absolute path of a stored Indus PO PDF, or null for any other PO number. */
export function indusPoPdfPath(poNo: string, po: IndusPoConfig = INDUS_PO): string | null {
  if (poNo !== po.poNo && poNo !== po.previous.poNo) return null;
  return `${PO_PDF_DIR}${poNo}.pdf`;
}

export type IndusPoLineProgress = {
  sizeMm: number;
  description: string;
  /** Previous PO quantity for this size. */
  previousOrdered: number;
  /** Pieces of this size that went toward the previous PO. */
  previousSupplied: number;
  /** Current PO quantity for this size. */
  ordered: number;
  /** Pieces of this size counted toward the current PO, after the previous PO filled. */
  supplied: number;
};

export type IndusPoSummary = {
  poNo: string;
  poDate: string;
  customerName: string | null;
  customerId: string | null;
  previousPoNo: string;
  previousPoDate: string;
  previousPoQuantity: number;
  previousSupplied: number;
  /** Pieces still owed on the previous PO. */
  previousLeft: number;
  previousComplete: boolean;
  poQuantity: number;
  supplied: number;
  /** Pieces still owed on the current PO. */
  currentLeft: number;
  /** previousLeft + currentLeft. */
  remaining: number;
  invoiceCount: number;
  lines: IndusPoLineProgress[];
  /** Pieces billed in sizes that are on neither PO. */
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

function sumLines(lines: readonly { quantity: number }[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function poQuantity(po: IndusPoConfig = INDUS_PO): number {
  return sumLines(po.lines);
}

export function previousPoQuantity(po: IndusPoConfig = INDUS_PO): number {
  return sumLines(po.previous.lines);
}

/** Map a billed size onto a PO line size (70mm without chudi counts as 70mm). */
export function poLineSizeFor(sizeMm: number, po: IndusPoConfig = INDUS_PO): number | null {
  const sizes = new Set<number>([
    ...po.previous.lines.map((line) => line.sizeMm),
    ...po.lines.map((line) => line.sizeMm),
  ]);
  for (const size of sizes) {
    if (pipeSizeMatches(sizeMm, size)) return size;
    if (size === 70 && pipeSizeMatches(sizeMm, SIZE_70MM_WITHOUT_CHUDI)) return 70;
  }
  return null;
}

function catalogPieces(item: CatalogLine): number {
  if (!item.productId?.trim()) return 0;
  const qty = Number(item.quantity);
  return Number.isFinite(qty) ? qty : 0;
}

export function summarizeIndusPo(invoices: InvoiceForPo[], po: IndusPoConfig = INDUS_PO): IndusPoSummary {
  const billedBySize = new Map<number, number>();
  let otherSupplied = 0;
  let invoiceCount = 0;
  let customerId: string | null = null;
  let customerName: string | null = null;

  for (const invoice of invoices) {
    customerId = invoice.customerId;
    customerName = invoice.customerName;
    if (istDateKey(invoice.invoiceDate) < po.previous.poDate) continue;

    let counted = false;
    for (const item of invoice.items) {
      const qty = catalogPieces(item);
      if (qty === 0) continue;
      counted = true;
      const sizeMm = item.sizeMm == null ? NaN : Number(item.sizeMm);
      const poSize = Number.isFinite(sizeMm) ? poLineSizeFor(sizeMm, po) : null;
      if (poSize == null) {
        otherSupplied += qty;
        continue;
      }
      billedBySize.set(poSize, (billedBySize.get(poSize) ?? 0) + qty);
    }
    if (counted) invoiceCount += 1;
  }

  const previousOrderedBySize = new Map<number, number>(
    po.previous.lines.map((line) => [line.sizeMm, line.quantity])
  );
  const previousSuppliedBySize = new Map<number, number>();
  const currentSuppliedBySize = new Map<number, number>();
  for (const [size, billed] of billedBySize) {
    const toPrevious = Math.min(billed, previousOrderedBySize.get(size) ?? 0);
    previousSuppliedBySize.set(size, toPrevious);
    currentSuppliedBySize.set(size, billed - toPrevious);
  }

  const previousQty = previousPoQuantity(po);
  const previousSupplied = Math.round(
    [...previousSuppliedBySize.values()].reduce((sum, qty) => sum + qty, 0)
  );
  const previousLeft = Math.max(0, previousQty - previousSupplied);

  const lines: IndusPoLineProgress[] = po.lines.map((line) => ({
    sizeMm: line.sizeMm,
    description: line.description,
    previousOrdered: previousOrderedBySize.get(line.sizeMm) ?? 0,
    previousSupplied: Math.round(previousSuppliedBySize.get(line.sizeMm) ?? 0),
    ordered: line.quantity,
    supplied: Math.round(currentSuppliedBySize.get(line.sizeMm) ?? 0),
  }));
  const supplied = lines.reduce((sum, line) => sum + line.supplied, 0);
  const currentLeft = lines.reduce((sum, line) => sum + Math.max(0, line.ordered - line.supplied), 0);

  return {
    poNo: po.poNo,
    poDate: po.poDate,
    customerName,
    customerId,
    previousPoNo: po.previous.poNo,
    previousPoDate: po.previous.poDate,
    previousPoQuantity: previousQty,
    previousSupplied,
    previousLeft,
    previousComplete: previousLeft === 0,
    poQuantity: poQuantity(po),
    supplied,
    currentLeft,
    remaining: previousLeft + currentLeft,
    invoiceCount,
    lines,
    otherSupplied: Math.round(otherSupplied),
  };
}

export function indusPoPushPayload(summary: IndusPoSummary) {
  const fmt = (value: number) => value.toLocaleString("en-IN");
  const title =
    summary.remaining <= 0
      ? `Indus PO ${summary.poNo} is complete`
      : `Indus PO: ${fmt(summary.remaining)} pieces left`;
  const body = summary.previousComplete
    ? `${summary.poNo}: supplied ${fmt(summary.supplied)} of ${fmt(summary.poQuantity)}`
    : `Finish ${summary.previousPoNo} first: ${fmt(summary.previousLeft)} left · then ${summary.poNo}: ${fmt(summary.currentLeft)}`;
  return {
    title,
    body,
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
